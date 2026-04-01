import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";
import { getTemplateForDocument, renderTemplateToPdf, getFilenameFromTemplate } from "@/lib/pdfTemplateRenderer";

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

        const template = await getTemplateForDocument(condoId, 'invoice');

        if (!template) {
            return NextResponse.json({ error: "Error cargando plantilla" }, { status: 500 });
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

        const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        const renderData = {
            condominium: {
                name: invoice.condominium.name || 'CONDOMINIO'
            },
            invoice: {
                id: invoice.id.toString().padStart(6, '0'),
                status: invoice.status === 'PAID' ? 'PAGADA' : 'GENERADA',
                amount: invoice.amount,
                notes: invoice.notes
            },
            month: monthNames[invoice.month - 1] || invoice.month.toString(),
            year: invoice.year.toString(),
            invoiceDate: new Date(invoice.createdAt).toLocaleDateString(),
            fixedExpenses: fixedItems.map(item => ({
                concept: item.concept.replace('[Fijo] ', ''),
                amount: item.amount
            })),
            variableExpenses: variableItems.map(item => ({
                concept: item.concept,
                amount: item.amount
            })),
            totals: {
                fixed: fixedTotal,
                variable: variableTotal,
                grandTotal: invoice.amount,
                perResident: amountPerResident
            },
            residentsCount: residentsCount
        };

        const pdfBuffer = await renderTemplateToPdf(template, renderData);

        const filename = getFilenameFromTemplate(template, `Factura_${invoice.id}_${invoice.month}_${invoice.year}`);

        return new Response(pdfBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`
            }
        });

    } catch (e) {
        console.error("Error creating PDF", e);
        return NextResponse.json({ error: "Error interno generando PDF" }, { status: 500 });
    }
}