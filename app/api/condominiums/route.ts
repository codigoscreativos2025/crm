import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const userId = parseInt(session.user.id);
        
        // Verifica si tiene la sección habilitada (opcional, pero buena práctica)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isCondoEnabled: true, parentId: true, role: true }
        });

        // Uncomment if you want strict access control
        // if (!user?.isCondoEnabled && user?.role !== 'ADMIN') {
        //     return NextResponse.json({ error: "Módulo de condominios no habilitado" }, { status: 403 });
        // }

        const ownerId = user?.parentId || userId;

        // Como es 1:1, devolvemos el único condominio del ownerId, o null
        const condominium = await prisma.condominium.findUnique({
            where: { userId: ownerId },
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
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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

        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = user?.parentId || userId;

        // Verificar si ya tiene uno (Relación 1:1)
        const existing = await prisma.condominium.findUnique({
            where: { userId: ownerId }
        });

        if (existing) {
            return NextResponse.json({ error: "Ya tienes un condominio configurado." }, { status: 400 });
        }

        const newCondo = await prisma.condominium.create({
            data: {
                name,
                type,
                userId: ownerId
            }
        });

        return NextResponse.json(newCondo, { status: 201 });

    } catch (error) {
        console.error("Error creating condominium:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
