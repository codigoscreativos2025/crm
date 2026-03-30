import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function PUT(req: NextRequest, { params }: { params: { id: string, suggestionId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const suggestionId = parseInt(params.suggestionId);

    if (isNaN(condoId) || isNaN(suggestionId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const suggestion = await prisma.residentSuggestion.findUnique({ 
            where: { id: suggestionId },
            include: { resident: true }
        });
        
        if (!suggestion || suggestion.resident.condominiumId !== condoId) {
            return NextResponse.json({ error: "Sugerencia no encontrada" }, { status: 404 });
        }

        const body = await req.json();
        const { status, adminNote } = body;

        if (status && !["PENDIENTE", "EN_PROCESO", "ATENDIDA", "RECHAZADA"].includes(status)) {
            return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
        }

        const updated = await prisma.residentSuggestion.update({
            where: { id: suggestionId },
            data: {
                ...(status && { status }),
                ...(adminNote !== undefined && { adminNote })
            }
        });

        return NextResponse.json(updated);

    } catch (e) {
        console.error("Error updating suggestion:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
