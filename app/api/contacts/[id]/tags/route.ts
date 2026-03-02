import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { tagId } = body;
        const contactId = parseInt(params.id);

        if (!tagId) {
            return NextResponse.json({ error: "El tagId es obligatorio" }, { status: 400 });
        }

        const userId = parseInt(session.user.id);
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = currentUser?.parentId || userId;

        // Verify contact
        const contact = await prisma.contact.findUnique({
            where: { id: contactId, userId: ownerId },
            include: { tags: true }
        });

        if (!contact) {
            return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
        }

        // Add tag
        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: {
                tags: {
                    connect: { id: parseInt(tagId) }
                }
            },
            include: { tags: true }
        });

        return NextResponse.json(updated.tags);
    } catch (error) {
        console.error("Error adding tag to contact:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const url = new URL(req.url);
        const tagId = url.searchParams.get('tagId');
        const contactId = parseInt(params.id);

        if (!tagId) {
            return NextResponse.json({ error: "El tagId es obligatorio" }, { status: 400 });
        }

        const userId = parseInt(session.user.id);
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = currentUser?.parentId || userId;

        const updated = await prisma.contact.update({
            where: { id: contactId, userId: ownerId },
            data: {
                tags: {
                    disconnect: { id: parseInt(tagId) }
                }
            },
            include: { tags: true }
        });

        return NextResponse.json(updated.tags);
    } catch (error) {
        console.error("Error removing tag from contact:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
