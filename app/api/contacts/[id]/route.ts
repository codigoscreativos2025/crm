import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

        const contact = await prisma.contact.findUnique({
            where: {
                id: parseInt(params.id),
                userId: ownerId,
            },
            include: {
                stage: true
            }
        });

        if (!contact) {
            return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
        }

        return NextResponse.json(contact);
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener contacto" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const contactId = params.id;

    try {
        const userId = parseInt(session.user.id);
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { aiDeactivationMinutes: true, parentId: true }
        });
        const ownerId = currentUser?.parentId || userId;

        const body = await req.json();
        const { stageId, name, disableAI } = body;

        const updateData: any = {
            stageId: stageId ? parseInt(stageId) : undefined,
        };

        if (name) {
            updateData.name = name;
            updateData.nameConfirmed = true;
        }

        if (disableAI !== undefined) {
            if (disableAI) {
                const minutes = currentUser?.aiDeactivationMinutes || 60;
                updateData.aiDisabledUntil = new Date(Date.now() + minutes * 60000);
            } else {
                updateData.aiDisabledUntil = null;
            }
        }

        const contact = await prisma.contact.update({
            where: {
                id: parseInt(contactId),
                userId: ownerId, // Ensure ownership via parent ID
            },
            data: updateData,
        });

        return NextResponse.json(contact);
    } catch (error) {
        console.error("Error al actualizar contacto:", error);
        return NextResponse.json({ error: "Error al actualizar contacto" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const contactId = parseInt(params.id);
        const userId = parseInt(session.user.id);

        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = currentUser?.parentId || userId;

        // Verify ownership
        const contact = await prisma.contact.findFirst({
            where: { id: contactId, userId: ownerId },
        });

        if (!contact) {
            return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
        }

        // Delete contact (cascade should handle messages if configured, but let's be safe)
        // Note: Prisma schema usually handles cascade delete if configured. 
        // If not, we should delete messages first.
        const deleteMessages = prisma.message.deleteMany({
            where: { contactId },
        });
        const deleteContact = prisma.contact.delete({
            where: { id: contactId },
        });

        await prisma.$transaction([deleteMessages, deleteContact]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting contact:", error);
        return NextResponse.json({ error: "Error al eliminar contacto" }, { status: 500 });
    }
}
