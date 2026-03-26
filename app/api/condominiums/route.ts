import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function GET(req: NextRequest) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const condominium = await prisma.condominium.findUnique({
            where: { userId: auth.ownerId },
            include: {
                _count: {
                    select: { residents: true, transactions: true }
                }
            }
        });

        if (!condominium) {
            return NextResponse.json({ exists: false, data: null });
        }

        return NextResponse.json({ exists: true, data: condominium });

    } catch (error) {
        console.error("Error fetching condominiums:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, type } = body;

        if (!name || !type) {
            return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
        }

        if (type !== 'CASA' && type !== 'APARTAMENTO') {
            return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
        }

        // Verificar si ya tiene uno (Relación 1:1)
        const existing = await prisma.condominium.findUnique({
            where: { userId: auth.ownerId }
        });

        if (existing) {
            return NextResponse.json({ error: "Ya tienes un condominio configurado." }, { status: 400 });
        }

        const newCondo = await prisma.condominium.create({
            data: {
                name,
                type,
                userId: auth.ownerId
            }
        });

        return NextResponse.json(newCondo, { status: 201 });

    } catch (error) {
        console.error("Error creating condominium:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}