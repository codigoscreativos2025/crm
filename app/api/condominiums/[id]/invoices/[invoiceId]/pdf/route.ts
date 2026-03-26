import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string, invoiceId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const invoiceId = parseInt(params.invoiceId);

    if (isNaN(condoId) || isNaN(invoiceId)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { condominium: true }
        });

        if (!invoice || invoice.condominiumId !== condoId) {
            return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
        }

        let template: any = {};
        if (invoice.condominium.invoiceTemplate) {
            try { template = JSON.parse(invoice.condominium.invoiceTemplate); } catch(e) {}
        }

        let allLineItems: { concept: string; amount: number }[] = [];
        if (invoice.lineItems) {
            try { allLineItems = JSON.parse(invoice.lineItems); } catch(e) {}
        }

        const fixedItems = allLineItems.filter(item => item.concept.startsWith('[Fijo]'));
        const variableItems = allLineItems.filter(item => !item.concept.startsWith('[Fijo]'));

        const fixedTotal = fixedItems.reduce((sum, item) => sum + item.amount, 0);
        const variableTotal = variableItems.reduce((sum, item) => sum + item.amount, 0);

        const residentsCount = await prisma.resident.count({
            where: { condominiumId: condoId }
        });

        const amountPerResident = residentsCount > 0 ? invoice.amount / residentsCount : 0;

        const headerTitle = template.headerTitle || 'ESTADO DE CUENTA';
        const bodySize = template.bodySize || 11;
        const footerText = template.footerText || 'Gracias por su puntualidad.';

        const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(headerTitle, 105, 25, { align: 'center' });

        doc.setFontSize(14);
        doc.text((invoice.condominium.name || 'CONDOMINIO').toUpperCase(), 14, 40);

        doc.setFontSize(bodySize);
        doc.setFont('helvetica', 'normal');
        doc.text(`Periodo: ${monthNames[invoice.month - 1] || invoice.month} ${invoice.year}`, 14, 50);

        doc.text(`Factura N°: ${invoice.id.toString().padStart(6, '0')}`, 14, 58);
        doc.text(`Fecha: ${new Date(invoice.createdAt).toLocaleDateString()}`, 14, 66);
        doc.text(`Estatus: ${invoice.status === 'PAID' ? 'PAGADA' : 'GENERADA'}`, 14, 74);

        let currentY = 82;

        // GASTOS FIJOS - SIEMPRE SE MUESTRA
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('GASTOS FIJOS', 14, currentY);
        currentY += 5;

        const fixedTableData = fixedItems.length > 0
            ? fixedItems.map(item => [item.concept.replace('[Fijo] ', ''), `$${item.amount.toFixed(2)}`])
            : [['Sin gastos registrados', '$0.00']];
        fixedTableData.push(['SUBTOTAL GASTOS FIJOS', `$${fixedTotal.toFixed(2)}`]);

        autoTable(doc, {
            startY: currentY,
            head: [['CONCEPTO', 'IMPORTE']],
            body: fixedTableData,
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            styles: { fontSize: bodySize - 1, cellPadding: 3 },
            columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 40, halign: 'right' } }
        });

        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 8;

        // GASTOS VARIABLES - SIEMPRE SE MUESTRA
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('GASTOS VARIABLES', 14, currentY);
        currentY += 5;

        const variableTableData = variableItems.length > 0
            ? variableItems.map(item => [item.concept, `$${item.amount.toFixed(2)}`])
            : [['Sin gastos registrados', '$0.00']];
        variableTableData.push(['SUBTOTAL GASTOS VARIABLES', `$${variableTotal.toFixed(2)}`]);

        autoTable(doc, {
            startY: currentY,
            head: [['CONCEPTO', 'IMPORTE']],
            body: variableTableData,
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            styles: { fontSize: bodySize - 1, cellPadding: 3 },
            columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 40, halign: 'right' } }
        });

        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 8;

        // RESUMEN TOTAL - SIEMPRE SE MUESTRA
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN TOTAL', 14, currentY);
        currentY += 8;

        const summaryData = [
            ['Total Gastos Fijos', `$${fixedTotal.toFixed(2)}`],
            ['Total Gastos Variables', `$${variableTotal.toFixed(2)}`],
            ['TOTAL A DISTRIBUIR', `$${invoice.amount.toFixed(2)}`],
            ['Número de Residentes', residentsCount.toString()],
            ['MONTO POR RESIDENTE', `$${amountPerResident.toFixed(2)}`]
        ];

        autoTable(doc, {
            startY: currentY,
            body: summaryData,
            theme: 'plain',
            styles: { fontSize: bodySize, cellPadding: 4 },
            columnStyles: {
                0: { cellWidth: 80, fontStyle: 'bold' },
                1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
            }
        });

        // @ts-ignore
        const finalY = doc.lastAutoTable.finalY || 150;

        // TOTAL FINAL
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL: $${invoice.amount.toFixed(2)}`, 14, finalY + 5);

        if (invoice.notes) {
            doc.setFontSize(bodySize);
            doc.setFont('helvetica', 'italic');
            doc.text(`Notas: ${invoice.notes}`, 14, finalY + 15);
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text(footerText, 105, finalY + 30, { align: 'center' });

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new Response(pdfBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Factura_${invoice.id}_${invoice.month}_${invoice.year}.pdf"`
            }
        });

    } catch (e) {
        console.error("Error creating PDF", e);
        return NextResponse.json({ error: "Error interno generando PDF" }, { status: 500 });
    }
}