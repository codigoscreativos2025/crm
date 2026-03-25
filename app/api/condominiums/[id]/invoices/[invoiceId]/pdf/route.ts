import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
const PdfPrinter = require("pdfmake");
import { TDocumentDefinitions } from "pdfmake/interfaces";

// Usamos fuentes estándar de PDF (Helvetica) para evitar problemas en Serverless y dependencias de disco
const fonts = {
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

export async function GET(req: NextRequest, { params }: { params: { id: string, invoiceId: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const condoId = parseInt(params.id);
    const invoiceId = parseInt(params.invoiceId);

    if (isNaN(condoId) || isNaN(invoiceId)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                resident: true,
                condominium: true
            }
        });

        if (!invoice || invoice.condominiumId !== condoId) {
            return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
        }

        const printer = new PdfPrinter(fonts);

        const docDefinition: TDocumentDefinitions = {
            defaultStyle: {
                font: 'Helvetica'
            },
            content: [
                {
                    text: `ESTADO DE CUENTA / FACTURA`,
                    style: 'header',
                    alignment: 'center',
                    margin: [0, 0, 0, 20]
                },
                {
                    text: invoice.condominium.name.toUpperCase(),
                    style: 'subheader',
                    bold: true,
                    margin: [0, 0, 0, 10]
                },
                {
                    columns: [
                        {
                            width: '*',
                            text: [
                                { text: 'Residente: ', bold: true }, `${invoice.resident.name}\n`,
                                { text: 'Teléfono: ', bold: true }, `${invoice.resident.phone}\n`
                            ]
                        },
                        {
                            width: 'auto',
                            text: [
                                { text: 'Factura N°: ', bold: true }, `${invoice.id.toString().padStart(6, '0')}\n`,
                                { text: 'Fecha de Emisión: ', bold: true }, `${new Date(invoice.createdAt).toLocaleDateString()}\n`,
                                { text: 'Periodo: ', bold: true }, `${invoice.month.toString().padStart(2, '0')}/${invoice.year}\n`,
                                { text: 'Estatus: ', bold: true }, `${invoice.status === 'PAID' ? 'PAGADA' : 'PENDIENTE'}`
                            ],
                            alignment: 'right'
                        }
                    ],
                    margin: [0, 0, 0, 30]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto'],
                        body: [
                            [
                                { text: 'CONCEPTO', style: 'tableHeader', fillColor: '#eeeeee', bold: true },
                                { text: 'IMPORTE', style: 'tableHeader', fillColor: '#eeeeee', alignment: 'right', bold: true }
                            ],
                            [
                                `Cuota de Mantenimiento - Mes ${invoice.month}/${invoice.year}`,
                                { text: `$${invoice.amount.toFixed(2)}`, alignment: 'right' }
                            ],
                            [
                                { text: 'TOTAL A PAGAR:', bold: true, alignment: 'right' },
                                { text: `$${invoice.amount.toFixed(2)}`, bold: true, alignment: 'right' }
                            ]
                        ]
                    },
                    layout: 'lightHorizontalLines'
                },
                {
                    text: 'Gracias por su puntualidad. El pago puntual nos permite seguir manteniendo nuestras instalaciones en óptimo estado.',
                    italics: true,
                    margin: [0, 40, 0, 0],
                    fontSize: 10,
                    alignment: 'center'
                }
            ],
            styles: {
                header: {
                    fontSize: 18,
                    bold: true
                },
                subheader: {
                    fontSize: 14,
                    bold: true
                },
                tableHeader: {
                    bold: true,
                    fontSize: 12,
                    color: 'black'
                }
            }
        };

        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        
        // Convertir el stream a un Buffer para responder
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
        
        const returnBuffer = await new Promise<Buffer>((resolve, reject) => {
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', reject);
            pdfDoc.end();
        });

        // Retornamos la respuesta tipo PDF para visualizar inline o descargar (attachment)
        return new Response(returnBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Factura_${invoice.id}.pdf"`
            }
        });

    } catch (e) {
        console.error("Error creating PDF", e);
        return NextResponse.json({ error: "Error interno generando PDF" }, { status: 500 });
    }
}
