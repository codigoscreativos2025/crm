import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    if (isNaN(condoId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const searchParams = req.nextUrl.searchParams;
        const status = searchParams.get('status');
        const name = searchParams.get('name');

        // Get custom fields
        const configuredColumns: string[] = [];
        if (condo.residentFields) {
            try {
                const parsed = JSON.parse(condo.residentFields);
                if (Array.isArray(parsed)) configuredColumns.push(...parsed);
            } catch (e) {}
        }

        // Get all residents with their payments and debts
        const residents = await prisma.resident.findMany({
            where: { 
                condominiumId: condoId,
                ...(status ? { status } : {}),
                ...(name ? {
                    OR: [
                        { name: { contains: name } },
                        { phone: { contains: name } }
                    ]
                } : {})
            },
            orderBy: { name: 'asc' }
        }) as any[];

        // Get payments and debts for each resident
        const residentIds = residents.map(r => r.id);
        const payments = await prisma.payment.findMany({
            where: { residentId: { in: residentIds } },
            select: { residentId: true, amount: true, status: true }
        });
        const debts = await prisma.residentDebt.findMany({
            where: { residentId: { in: residentIds } },
            select: { residentId: true, amount: true, amountPaid: true, isPaid: true }
        });

        const paymentsByResident: Record<number, any[]> = {};
        const debtsByResident: Record<number, any[]> = {};
        
        payments.forEach(p => {
            if (!paymentsByResident[p.residentId]) paymentsByResident[p.residentId] = [];
            paymentsByResident[p.residentId].push(p);
        });
        
        debts.forEach(d => {
            if (!debtsByResident[d.residentId]) debtsByResident[d.residentId] = [];
            debtsByResident[d.residentId].push(d);
        });

        // Generate PDF
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('LISTADO DE RESIDENTES', 105, 20, { align: 'center' });

        // Condo name
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(condo.name || 'CONDOMINIO', 14, 30);

        // Filters info
        const filters: string[] = [];
        if (status) filters.push(`Estado: ${status === 'ACTIVO' ? 'Activo' : status === 'INACTIVO' ? 'Inactivo' : 'Insolvente'}`);
        if (name) filters.push(`Nombre: ${name}`);
        
        if (filters.length > 0) {
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text('Filtros: ' + filters.join(', '), 14, 36);
            doc.setTextColor(0);
        }

        // Summary stats
        const statusCounts = {
            ACTIVO: residents.filter(r => r.status === 'ACTIVO').length,
            INACTIVO: residents.filter(r => r.status === 'INACTIVO').length,
            INSOLVENTE: residents.filter(r => r.status === 'INSOLVENTE').length
        };

        doc.setFontSize(10);
        doc.text(`Total: ${residents.length} | Activos: ${statusCounts.ACTIVO} | Inactivos: ${statusCounts.INACTIVO} | Insolventes: ${statusCounts.INSOLVENTE}`, 14, 42);

        // Table headers
        const headers = ['Nombre', 'Teléfono', 'Estado'];
        if (configuredColumns.length > 0) {
            headers.push(...configuredColumns.slice(0, 3));
        }
        headers.push('Total Pagado', 'Deuda Pendiente');

        // Table data
        const tableData = residents.map((r: any) => {
            const rPayments = paymentsByResident[r.id] || [];
            const rDebts = debtsByResident[r.id] || [];
            const totalPaid = rPayments.filter((p: any) => p.status === 'RECONCILED').reduce((sum: number, p: any) => sum + p.amount, 0);
            const totalDebt = rDebts.filter((d: any) => !d.isPaid).reduce((sum: number, d: any) => sum + (d.amount - d.amountPaid), 0);
            
            let parsedJson: any = {};
            try {
                parsedJson = JSON.parse(r.additionalData || '{}');
            } catch (e) {}

            const row = [
                r.name,
                r.phone,
                r.status === 'ACTIVO' ? 'Activo' : r.status === 'INSOLVENTE' ? 'Insolvente' : 'Inactivo'
            ];

            if (configuredColumns.length > 0) {
                row.push(...configuredColumns.slice(0, 3).map(col => parsedJson[col] || '-'));
            }

            row.push(
                `$${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                `$${totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
            );

            return row;
        });

        autoTable(doc, {
            startY: 50,
            head: [headers],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 30 },
                2: { cellWidth: 25 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 },
                5: { cellWidth: 25 },
                6: { cellWidth: 25, halign: 'right' },
                7: { cellWidth: 30, halign: 'right' }
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 2) {
                    const status = data.cell.raw;
                    if (status === 'Insolvente') {
                        data.cell.styles.textColor = [220, 38, 38];
                    } else if (status === 'Activo') {
                        data.cell.styles.textColor = [22, 163, 74];
                    }
                }
            }
        });

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Generado el ${new Date().toLocaleString('es-MX')}`, 105, 285, { align: 'center' });

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new Response(pdfBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Residentes_${new Date().toISOString().split('T')[0]}.pdf"`
            }
        });

    } catch (e) {
        console.error("Error generating residents export PDF:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
