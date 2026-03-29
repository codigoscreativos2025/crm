import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const condoId = parseInt(params.id);
        if (isNaN(condoId)) {
            return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
        }

        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const numMonths = parseInt(searchParams.get('months') || '6') || 6;

        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - numMonths);

        // Get all transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                condominiumId: condoId,
                date: { gte: monthsAgo },
                status: 'RECONCILED'
            },
            select: {
                type: true,
                amount: true,
                date: true,
                category: true
            }
        });

        // Get resident status
        const residents = await prisma.resident.findMany({
            where: { condominiumId: condoId },
            select: { status: true }
        });

        const solventCount = residents.filter(r => r.status === 'SOLVENTE' || r.status === 'ACTIVO').length;
        const insolventCount = residents.filter(r => r.status === 'INSOLVENTE').length;

        // Calculate totals
        let totalIncome = 0;
        let totalExpense = 0;
        const incomeByMonth: Record<string, number> = {};
        const expenseByMonth: Record<string, number> = {};
        const incomeByCategory: Record<string, number> = {};
        const expenseByCategory: Record<string, number> = {};

        const monthsStr = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        // Initialize months
        for (let i = numMonths - 1; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${monthsStr[d.getMonth()]} ${d.getFullYear()}`;
            incomeByMonth[key] = 0;
            expenseByMonth[key] = 0;
        }

        // Process transactions from web
        transactions.forEach(t => {
            const d = new Date(t.date);
            const monthKey = `${monthsStr[d.getMonth()]} ${d.getFullYear()}`;
            
            if (t.type === 'INCOME') {
                totalIncome += t.amount;
                if (incomeByMonth[monthKey] !== undefined) {
                    incomeByMonth[monthKey] += t.amount;
                }
                incomeByCategory[t.category || 'Otros'] = (incomeByCategory[t.category || 'Otros'] || 0) + t.amount;
            } else {
                totalExpense += t.amount;
                if (expenseByMonth[monthKey] !== undefined) {
                    expenseByMonth[monthKey] += t.amount;
                }
                expenseByCategory[t.category || 'Otros'] = (expenseByCategory[t.category || 'Otros'] || 0) + t.amount;
            }
        });

        // Generate PDF
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORME FINANCIERO', 105, 20, { align: 'center' });

        // Condo info
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(condo.name || 'Condominio', 14, 32);
        doc.setFontSize(10);
        doc.text(`Período: Últimos ${numMonths} meses`, 14, 38);
        doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX')}`, 14, 44);

        // Summary section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN EJECUTIVO', 14, 56);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const balance = totalIncome - totalExpense;
        const delinquencyRate = residents.length > 0 ? ((insolventCount / residents.length) * 100).toFixed(1) : '0';

        doc.text(`Total Ingresos: $${totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 20, 64);
        doc.text(`Total Egresos: $${totalExpense.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 20, 70);
        doc.setFont('helvetica', 'bold');
        doc.text(`Balance: $${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 20, 76);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Residentes: ${residents.length}`, 20, 82);
        doc.text(`Solventes: ${solventCount}`, 20, 88);
        doc.text(`Insolventes: ${insolventCount}`, 20, 94);
        doc.text(`% Morosidad: ${delinquencyRate}%`, 20, 100);

        // Income vs Expense by Month
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('INGRESOS VS EGRESOS POR MES', 14, 112);

        const monthTableData = Object.entries(incomeByMonth).map(([month, income]) => [
            month,
            `$${income.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            `$${(expenseByMonth[month] || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            `$${(income - (expenseByMonth[month] || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            startY: 116,
            head: [['Mes', 'Ingresos', 'Egresos', 'Balance']],
            body: monthTableData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 9 }
        });

        // Income by Category
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        // @ts-ignore
        const incomeY = doc.lastAutoTable.finalY + 15;
        doc.text('INGRESOS POR CATEGORÍA', 14, incomeY);

        const incomeCatData = Object.entries(incomeByCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amount]) => [
                cat,
                `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                `${((amount / totalIncome) * 100).toFixed(1)}%`
            ]);

        if (incomeCatData.length > 0) {
            autoTable(doc, {
                startY: incomeY + 4,
                head: [['Categoría', 'Monto', '%']],
                body: incomeCatData,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] },
                styles: { fontSize: 9 }
            });
        }

        // Expense by Category
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        // @ts-ignore
        const expenseY = doc.lastAutoTable.finalY + 15;
        doc.text('EGRESOS POR CATEGORÍA', 14, expenseY);

        const expenseCatData = Object.entries(expenseByCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amount]) => [
                cat,
                `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                `${((amount / totalExpense) * 100).toFixed(1)}%`
            ]);

        if (expenseCatData.length > 0) {
            autoTable(doc, {
                startY: expenseY + 4,
                head: [['Categoría', 'Monto', '%']],
                body: expenseCatData,
                theme: 'striped',
                headStyles: { fillColor: [239, 68, 68] },
                styles: { fontSize: 9 }
            });
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Generado por PIVOT CRM', 105, 285, { align: 'center' });

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new Response(pdfBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Informe_Financiero_${new Date().toISOString().split('T')[0]}.pdf"`
            }
        });

    } catch (e) {
        console.error("Error generating metrics report:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
