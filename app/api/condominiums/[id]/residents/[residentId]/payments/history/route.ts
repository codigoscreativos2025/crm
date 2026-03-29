import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string, residentId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const residentId = parseInt(params.residentId);

    if (isNaN(condoId) || isNaN(residentId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const resident = await prisma.resident.findUnique({ where: { id: residentId } });
        if (!resident || resident.condominiumId !== condoId) {
            return NextResponse.json({ error: "Residente no encontrado" }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const yearFilter = searchParams.get('year');
        
        const debts = await prisma.residentDebt.findMany({
            where: { residentId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });

        // Build transaction where clause
        const transactionWhere: any = {
            residentId,
            type: 'INCOME'
        };
        if (yearFilter) {
            const year = parseInt(yearFilter);
            transactionWhere.date = {
                gte: new Date(year, 0, 1),
                lte: new Date(year, 11, 31)
            };
        }

        const transactions = await prisma.transaction.findMany({
            where: transactionWhere,
            orderBy: [{ date: 'desc' }]
        });

        const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('HISTORIAL DE PAGOS', 105, 25, { align: 'center' });

        doc.setFontSize(14);
        doc.text((condo.name || 'CONDOMINIO').toUpperCase(), 14, 40);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Residente: ${resident.name}`, 14, 50);
        doc.text(`Teléfono: ${resident.phone}`, 14, 58);
        doc.text(`Estado: ${resident.status}`, 14, 66);
        if (resident.advanceCredit && resident.advanceCredit > 0) {
            doc.text(`Saldo a favor: $${resident.advanceCredit.toFixed(2)}`, 14, 74);
        }

        let currentY = 82;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DEUDAS POR MES', 14, currentY);
        currentY += 5;

        const debtData = debts.map(d => [
            `${monthNames[d.month - 1]} ${d.year}`,
            `$${d.amount.toFixed(2)}`,
            `$${d.amountPaid.toFixed(2)}`,
            d.isPaid ? 'PAGADO' : 'PENDIENTE'
        ]);

        if (debtData.length === 0) {
            debtData.push(['Sin deudas', '-', '-', '-']);
        }

        autoTable(doc, {
            startY: currentY,
            head: [['MES/AÑO', 'IMPORTE', 'PAGADO', 'ESTADO']],
            body: debtData,
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
            styles: { fontSize: 10, cellPadding: 3 }
        });

        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('HISTORIAL DE PAGOS', 14, currentY);
        currentY += 5;

        // Use transactions only
        const paymentData = transactions.map(t => [
            t.date ? new Date(t.date).toLocaleDateString() : '-',
            t.month && t.year ? `${monthNames[t.month - 1]} ${t.year}` : 'Abono general',
            `$${t.amount.toFixed(2)}`,
            t.status === 'RECONCILED' ? '✓' : '⏳',
            t.source || 'web'
        ]);

        if (paymentData.length === 0) {
            paymentData.push(['Sin pagos', '-', '-', '-', '-']);
        }

        autoTable(doc, {
            startY: currentY,
            head: [['FECHA', 'CONCEPTO', 'IMPORTE', 'ESTADO', 'ORIGEN']],
            body: paymentData,
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
            styles: { fontSize: 10, cellPadding: 3 }
        });

        // @ts-ignore
        const finalY = doc.lastAutoTable.finalY + 10;

        // Calculate total from transactions
        const totalPaid = transactions.filter(t => t.status === 'RECONCILED').reduce((sum, t) => sum + t.amount, 0);
        const totalDebt = debts.filter(d => !d.isPaid).reduce((sum, d) => sum + (d.amount - d.amountPaid), 0);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total pagado histórico: $${totalPaid.toFixed(2)}`, 14, finalY);
        doc.text(`Deuda actual: $${totalDebt.toFixed(2)}`, 14, finalY + 8);

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new Response(pdfBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Historial_Pagos_${resident.name.replace(/ /g, '_')}.pdf"`
            }
        });

    } catch (e) {
        console.error("Error generating history PDF:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}