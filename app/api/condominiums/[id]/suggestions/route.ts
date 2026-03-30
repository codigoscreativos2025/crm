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

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const type = searchParams.get('type');

        const whereClause: any = { resident: { condominiumId: condoId } };
        
        if (status) whereClause.status = status;
        if (type) whereClause.type = type;

        const suggestions = await prisma.residentSuggestion.findMany({
            where: whereClause,
            include: {
                resident: {
                    select: { id: true, name: true, phone: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(suggestions);

    } catch (e) {
        console.error("Error fetching suggestions:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

        const body = await req.json();
        const { residentId, type, description } = body;

        if (!residentId || !type || !description) {
            return NextResponse.json({ error: "Faltan datos obligatorios (residentId, type, description)" }, { status: 400 });
        }

        if (description.length < 10) {
            return NextResponse.json({ error: "La descripción debe tener al menos 10 caracteres" }, { status: 400 });
        }

        if (!["SUGERENCIA", "RECLAMO", "OTRO"].includes(type)) {
            return NextResponse.json({ error: "Tipo inválido. Debe ser: SUGERENCIA, RECLAMO u OTRO" }, { status: 400 });
        }

        // Verificar que el residente pertenece al condominio
        const resident = await prisma.resident.findFirst({
            where: { id: parseInt(residentId), condominiumId: condoId }
        });

        if (!resident) {
            return NextResponse.json({ error: "Residente no encontrado" }, { status: 404 });
        }

        const suggestion = await prisma.residentSuggestion.create({
            data: {
                residentId: parseInt(residentId),
                type,
                description: description.trim()
            }
        });

        return NextResponse.json(suggestion, { status: 201 });

    } catch (e) {
        console.error("Error creating suggestion:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
