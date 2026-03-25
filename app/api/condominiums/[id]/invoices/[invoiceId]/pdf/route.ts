import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string, invoiceId: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const condoId = parseInt(params.id);
    const invoiceId = parseInt(params.invoiceId);

    if (isNaN(condoId) || isNaN(invoiceId)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { condominium: true }
        });

        if (!invoice || invoice.condominiumId !== condoId) {
            return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
        }

        // Parse template config
        let template: any = {};
        if (invoice.condominium.invoiceTemplate) {
            try { template = JSON.parse(invoice.condominium.invoiceTemplate); } catch(e) {}
        }

        // Parse line items
        let lineItems: { concept: string; amount: number }[] = [];
        if (invoice.lineItems) {
            try { lineItems = JSON.parse(invoice.lineItems); } catch(e) {}
        }

        const headerTitle = template.headerTitle || 'ESTADO DE CUENTA';
        const bodySize = template.bodySize || 11;
        const footerText = template.footerText || 'Gracias por su puntualidad.';

        const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        // Use jsPDF (already installed) for server-side PDF generation
        const { jsPDF } = await import('jspdf');
        // @ts-ignore
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(headerTitle, 105, 25, { align: 'center' });

        doc.setFontSize(14);
        doc.text((invoice.condominium.name || 'CONDOMINIO').toUpperCase(), 14, 40);

        doc.setFontSize(bodySize);
        doc.setFont('helvetica', 'normal');
        doc.text(`Periodo: ${monthNames[invoice.month - 1] || invoice.month} ${invoice.year}`, 14, 50);

        doc.text(`Factura N°: ${invoice.id.toString().padStart(6, '0')}`, 14, 60);
        doc.text(`Fecha: ${new Date(invoice.createdAt).toLocaleDateString()}`, 14, 67);
        doc.text(`Estatus: ${invoice.status === 'PAID' ? 'PAGADA' : 'GENERADA'}`, 14, 74);

        // Table
        const tableHead = [['CONCEPTO', 'IMPORTE']];
        const tableBody = lineItems.map(item => [
            item.concept,
            `$${item.amount.toFixed(2)}`
        ]);
        tableBody.push(['TOTAL', `$${invoice.amount.toFixed(2)}`]);

        autoTable(doc, {
            startY: 82,
            head: tableHead,
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold' },
            footStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
            styles: { fontSize: bodySize, cellPadding: 4 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 50, halign: 'right' }
            }
        });

        // Notes
        // @ts-ignore
        const finalY = doc.lastAutoTable?.finalY || 150;
        if (invoice.notes) {
            doc.setFontSize(bodySize);
            doc.setFont('helvetica', 'italic');
            doc.text(`Notas: ${invoice.notes}`, 14, finalY + 15);
        }

        // Footer
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
