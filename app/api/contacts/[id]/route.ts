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
