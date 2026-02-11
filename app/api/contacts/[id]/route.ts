import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const contact = await prisma.contact.findUnique({
            where: {
                id: parseInt(params.id),
                userId: parseInt(session.user.id),
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
        const body = await req.json();
        const { stageId, name } = body;

        const contact = await prisma.contact.update({
            where: {
                id: parseInt(contactId),
                userId: parseInt(session.user.id), // Ensure ownership
            },
            data: {
                stageId: stageId ? parseInt(stageId) : undefined,
                name: name || undefined,
            },
        });

        return NextResponse.json(contact);
    } catch (error) {
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

        // Verify ownership
        const contact = await prisma.contact.findFirst({
            where: { id: contactId, userId },
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
