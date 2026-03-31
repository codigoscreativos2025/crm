import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";
import { getTemplateForDocument, renderTemplateToPdf } from "@/lib/pdfTemplateRenderer";

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

        const startDate = new Date(invoice.year, invoice.month - 1, 1);
        const endDate = new Date(invoice.year, invoice.month, 1);

        const expenses = await prisma.transaction.findMany({
            where: {
                condominiumId: condoId,
                type: 'EXPENSE',
                date: { gte: startDate, lt: endDate }
            }
        });

        const residentsCount = await prisma.resident.count({
            where: { condominiumId: condoId }
        });

        if (residentsCount === 0) {
            return NextResponse.json({ error: "No hay residentes registrados para calcular la plantilla" }, { status: 400 });
        }

        const fixedExpenses = expenses.filter(e => e.isFixed);
        const variableExpenses = expenses.filter(e => !e.isFixed);

        const fixedTotal = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
        const variableTotal = variableExpenses.reduce((sum, e) => sum + e.amount, 0);
        const grandTotal = fixedTotal + variableTotal;
        const amountPerResident = grandTotal / residentsCount;

        const template = await getTemplateForDocument(condoId, 'invoiceTemplate');

        if (!template) {
            return NextResponse.json({ error: "Error cargando plantilla" }, { status: 500 });
        }

        const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        const renderData = {
            condominium: {
                name: invoice.condominium.name || 'CONDOMINIO'
            },
            invoice: {
                id: invoice.id.toString().padStart(6, '0'),
                status: invoice.status === 'PAID' ? 'PAGADA' : 'GENERADA',
                amount: invoice.amount,
                date: new Date(invoice.createdAt).toLocaleDateString()
            },
            month: monthNames[invoice.month - 1] || invoice.month.toString(),
            year: invoice.year.toString(),
            fixedExpenses: fixedExpenses.map(e => ({
                concept: e.description || e.category,
                amount: e.amount
            })),
            variableExpenses: variableExpenses.map(e => ({
                concept: e.description || e.category,
                amount: e.amount
            })),
            totals: {
                fixed: fixedTotal,
                variable: variableTotal,
                grandTotal: grandTotal,
                perResident: amountPerResident
            },
            residentsCount: residentsCount
        };

        const pdfBuffer = await renderTemplateToPdf(template, renderData);

        return new Response(pdfBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Plantilla_Factura_${invoice.id}_${invoice.month}_${invoice.year}.pdf"`
            }
        });

    } catch (e) {
        console.error("Error creating template PDF", e);
        return NextResponse.json({ error: "Error interno generando plantilla" }, { status: 500 });
    }
}