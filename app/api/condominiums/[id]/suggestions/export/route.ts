import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";
import { getTemplateForDocument, renderTemplateToPdf, getFilenameFromTemplate } from "@/lib/pdfTemplateRenderer";

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
        const typeFilter = searchParams.get('type');
        const statusFilter = searchParams.get('status');

        const whereClause: any = {};

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt.gte = new Date(startDate);
            if (endDate) whereClause.createdAt.lte = new Date(endDate);
        }

        if (typeFilter) {
            whereClause.type = typeFilter;
        }

        if (statusFilter) {
            whereClause.status = statusFilter;
        }

        const suggestions = await prisma.residentSuggestion.findMany({
            where: {
                ...whereClause,
                resident: { condominiumId: condoId }
            },
            include: {
                resident: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const template = await getTemplateForDocument(condoId, 'suggestionsExport');

        const suggestionsData = suggestions.map(s => ({
            date: new Date(s.createdAt).toLocaleDateString('es-MX'),
            type: s.type === 'SUGERENCIA' ? 'Sugerencia' : s.type === 'RECLAMO' ? 'Reclamo' : 'Otro',
            resident: s.resident?.name || 'N/A',
            description: s.description.length > 50 ? s.description.substring(0, 50) + '...' : s.description,
            status: s.status === 'PENDIENTE' ? 'Pendiente' : 
                   s.status === 'EN_PROCESO' ? 'En Proceso' : 
                   s.status === 'ATENDIDA' ? 'Atendida' : 'Rechazada'
        }));

        const suggestionsCount = suggestions.filter(s => s.type === 'SUGERENCIA').length;
        const claimsCount = suggestions.filter(s => s.type === 'RECLAMO').length;
        const pendingCount = suggestions.filter(s => s.status === 'PENDIENTE').length;

        const renderData = {
            condominium: {
                name: condo.name || 'CONDOMINIO'
            },
            totals: {
                count: suggestions.length,
                suggestions: suggestionsCount,
                claims: claimsCount,
                pending: pendingCount
            },
            suggestions: suggestionsData
        };

        const pdfBuffer = await renderTemplateToPdf(template!, renderData);

        const filename = getFilenameFromTemplate(template, 'Reclamos_y_Sugerencias');

        return new Response(pdfBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`
            }
        });

    } catch (e) {
        console.error("Error generating suggestions PDF:", e);
        return NextResponse.json({ error: "Error interno generando PDF" }, { status: 500 });
    }
}