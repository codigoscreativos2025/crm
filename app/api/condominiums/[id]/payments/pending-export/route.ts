import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";
import { getTemplateForDocument, renderTemplateToPdf, getFilenameFromTemplate } from "@/lib/pdfTemplateRenderer";
import { getDefaultTemplate } from "@/lib/pdfTemplateTypes";

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

        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const whereClause: any = {
            condominiumId: condoId,
            status: 'PENDING',
            type: 'INCOME'
        };

        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate) whereClause.date.gte = new Date(startDate);
            if (endDate) whereClause.date.lte = new Date(endDate);
        }

        const pendingPayments = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                resident: true
            },
            orderBy: { date: 'desc' }
        });

        const template = await getTemplateForDocument(condoId, 'pendingPayments');

        const payments = pendingPayments.map(p => {
            let unit = 'N/A';
            if (p.resident?.additionalData) {
                try {
                    const data = JSON.parse(p.resident.additionalData);
                    unit = data.unit || 'N/A';
                } catch (e) {}
            }
            return {
                date: new Date(p.date).toLocaleDateString('es-MX'),
                resident: p.resident?.name || 'N/A',
                unit,
                reference: p.reference || 'N/A',
                amount: p.amount
            };
        });

        const totalAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

        const renderData = {
            condominium: {
                name: condo.name || 'CONDOMINIO'
            },
            totals: {
                count: pendingPayments.length,
                amount: totalAmount
            },
            payments
        };

        const pdfBuffer = await renderTemplateToPdf(template || getDefaultTemplate('pendingPayments'), renderData);

        const filename = getFilenameFromTemplate(template, 'Pagos_Por_Conciliar');

        return new Response(pdfBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`
            }
        });

    } catch (e) {
        console.error("Error generating pending payments PDF:", e);
        return NextResponse.json({ error: "Error interno generando PDF" }, { status: 500 });
    }
}