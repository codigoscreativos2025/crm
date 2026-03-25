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
        const headerFont = template.headerFont || 'Helvetica';
        const headerSize = template.headerSize || 18;
        const bodyFont = template.bodyFont || 'Helvetica';
        const bodySize = template.bodySize || 11;
        const footerText = template.footerText || 'Gracias por su puntualidad.';
        const footerSize = template.footerSize || 10;

        // Build table body from line items
        const tableBody: any[] = [
            [
                { text: 'CONCEPTO', fillColor: '#eeeeee', bold: true, font: bodyFont, fontSize: bodySize },
                { text: 'IMPORTE', fillColor: '#eeeeee', alignment: 'right', bold: true, font: bodyFont, fontSize: bodySize }
            ]
        ];

        lineItems.forEach(item => {
            tableBody.push([
                { text: item.concept, font: bodyFont, fontSize: bodySize },
                { text: `$${item.amount.toFixed(2)}`, alignment: 'right', font: bodyFont, fontSize: bodySize }
            ]);
        });

        tableBody.push([
            { text: 'TOTAL:', bold: true, alignment: 'right', font: bodyFont, fontSize: bodySize + 1 },
            { text: `$${invoice.amount.toFixed(2)}`, bold: true, alignment: 'right', font: bodyFont, fontSize: bodySize + 1 }
        ]);

        const fonts = {
            Helvetica: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' },
            Times: { normal: 'Times-Roman', bold: 'Times-Bold', italics: 'Times-Italic', bolditalics: 'Times-BoldItalic' },
            Courier: { normal: 'Courier', bold: 'Courier-Bold', italics: 'Courier-Oblique', bolditalics: 'Courier-BoldOblique' }
        };

        // @ts-ignore - pdfmake types don't match runtime export
        const PdfPrinter = require('pdfmake/src/printer');
        const printer = new PdfPrinter(fonts);

        const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        const docDefinition: any = {
            defaultStyle: { font: bodyFont },
            content: [
                {
                    text: headerTitle,
                    font: headerFont,
                    fontSize: headerSize,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 0, 0, 10]
                },
                {
                    text: invoice.condominium.name.toUpperCase(),
                    font: headerFont,
                    fontSize: headerSize - 4,
                    bold: true,
                    margin: [0, 0, 0, 5]
                },
                {
                    text: `Periodo: ${monthNames[invoice.month - 1] || invoice.month} ${invoice.year}`,
                    font: bodyFont,
                    fontSize: bodySize,
                    margin: [0, 0, 0, 5]
                },
                {
                    columns: [
                        {
                            width: '*',
                            text: [
                                { text: 'Factura N°: ', bold: true },
                                `${invoice.id.toString().padStart(6, '0')}\n`,
                                { text: 'Fecha: ', bold: true },
                                `${new Date(invoice.createdAt).toLocaleDateString()}\n`,
                                { text: 'Estatus: ', bold: true },
                                `${invoice.status === 'PAID' ? 'PAGADA' : 'GENERADA'}`
                            ],
                            font: bodyFont,
                            fontSize: bodySize
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto'],
                        body: tableBody
                    },
                    layout: 'lightHorizontalLines'
                },
                ...(invoice.notes ? [{
                    text: `Notas: ${invoice.notes}`,
                    font: bodyFont,
                    fontSize: bodySize,
                    italics: true,
                    margin: [0, 20, 0, 0]
                }] : []),
                {
                    text: footerText,
                    italics: true,
                    margin: [0, 30, 0, 0],
                    fontSize: footerSize,
                    font: bodyFont,
                    alignment: 'center'
                }
            ]
        };

        const pdfDoc = printer.createPdfKitDocument(docDefinition);

        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: any) => chunks.push(chunk));

        const returnBuffer = await new Promise<Buffer>((resolve, reject) => {
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', reject);
            pdfDoc.end();
        });

        return new Response(returnBuffer as unknown as BodyInit, {
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
