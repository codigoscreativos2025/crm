import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const userId = parseInt(session.user.id);
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = currentUser?.parentId || userId;

        const funnels = await prisma.funnel.findMany({
            where: { userId: ownerId },
            include: { stages: { orderBy: { order: 'asc' } } }
        });
        return NextResponse.json(funnels);
    } catch (error) {
        console.error("Error fetching funnels:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const userId = parseInt(session.user.id);
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = currentUser?.parentId || userId;

        const { name } = await req.json();
        if (!name?.trim()) {
            return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
        }

        const funnel = await prisma.funnel.create({
            data: {
                name: name.trim(),
                userId: ownerId, // Scope creation to the organization
                stages: {
                    create: [
                        { name: "Nuevo", order: 1 },
                        { name: "En proceso", order: 2 },
                        { name: "Cerrado", order: 3 },
                    ]
                }
            },
            include: { stages: true }
        });

        return NextResponse.json(funnel, { status: 201 });
    } catch (error) {
        console.error("Error creating funnel:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
