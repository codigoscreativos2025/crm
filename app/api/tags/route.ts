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
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });

        const ownerId = user?.parentId || userId;

        const tags = await prisma.tag.findMany({
            where: { userId: ownerId },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(tags);
    } catch (error) {
        console.error("Error fetching tags:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, color } = body;

        if (!name) {
            return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
        }

        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = user?.parentId || userId;

        // Check unique
        const existing = await prisma.tag.findFirst({
            where: { userId: ownerId, name: name }
        });
        if (existing) {
            return NextResponse.json({ error: "Ya existe una etiqueta con este nombre" }, { status: 400 });
        }

        const newTag = await prisma.tag.create({
            data: {
                name,
                color: color || '#3b82f6',
                userId: ownerId
            }
        });

        return NextResponse.json(newTag, { status: 201 });
    } catch (error) {
        console.error("Error creating tag:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
