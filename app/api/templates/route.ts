import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userId = parseInt(session.user.id);
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = currentUser?.parentId || userId;

        const templates = await prisma.messageTemplate.findMany({
            where: { userId: ownerId },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(templates);
    } catch (error) {
        console.error("Error fetching templates:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userId = parseInt(session.user.id);
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true, canEditTemplates: true, role: true }
        });

        // Verify if agent has permissions to create templates
        if (currentUser?.role !== 'ADMIN' && !currentUser?.canEditTemplates) {
            return NextResponse.json({ error: "No tienes permiso para gestionar plantillas" }, { status: 403 });
        }

        const ownerId = currentUser?.parentId || userId;

        const { name, content } = await req.json();

        if (!name || !content) {
            return NextResponse.json({ error: "Name and content are required" }, { status: 400 });
        }

        const newTemplate = await prisma.messageTemplate.create({
            data: {
                name,
                content,
                userId: ownerId
            }
        });

        return NextResponse.json(newTemplate, { status: 201 });
    } catch (error) {
        console.error("Error creating template:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
