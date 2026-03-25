import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string, residentId: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const condoId = parseInt(params.id);
        const residentId = parseInt(params.residentId);

        if (isNaN(condoId) || isNaN(residentId)) {
            return NextResponse.json({ error: "IDs Inválidos" }, { status: 400 });
        }

        const body = await req.json();
        const { name, phone, additionalData } = body;

        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = user?.parentId || userId;

        const condo = await prisma.condominium.findUnique({
            where: { id: condoId }
        });

        if (!condo || condo.userId !== ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const existingResident = await prisma.resident.findUnique({
            where: { id: residentId }
        });

        if (!existingResident || existingResident.condominiumId !== condoId) {
            return NextResponse.json({ error: "Residente no encontrado" }, { status: 404 });
        }

        const dataToUpdate: any = {};
        if (name) dataToUpdate.name = name;
        if (phone && phone !== existingResident.phone) {
            // Check if new phone is already in use
            const duplicate = await prisma.resident.findUnique({
                where: {
                    condominiumId_phone: {
                        condominiumId: condoId,
                        phone: phone
                    }
                }
            });
            if (duplicate) {
                return NextResponse.json({ error: "El teléfono ya está en uso por otro residente" }, { status: 400 });
            }
            dataToUpdate.phone = phone;
            
            // Re-vincular contacto CRM si cambia el número
            const crmContact = await prisma.contact.findUnique({
                where: {
                    userId_phone: {
                        userId: ownerId,
                        phone: phone
                    }
                }
            });
            dataToUpdate.contactId = crmContact ? crmContact.id : null;
        }

        if (additionalData !== undefined) {
            dataToUpdate.additionalData = additionalData ? JSON.stringify(additionalData) : null;
        }

        const updated = await prisma.resident.update({
            where: { id: residentId },
            data: dataToUpdate
        });

        return NextResponse.json(updated);

    } catch (error) {
        console.error("Error updating resident:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string, residentId: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const condoId = parseInt(params.id);
        const residentId = parseInt(params.residentId);

        if (isNaN(condoId) || isNaN(residentId)) {
            return NextResponse.json({ error: "IDs Inválidos" }, { status: 400 });
        }

        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = user?.parentId || userId;

        const condo = await prisma.condominium.findUnique({
            where: { id: condoId }
        });

        if (!condo || condo.userId !== ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const existingResident = await prisma.resident.findUnique({
            where: { id: residentId }
        });

        if (!existingResident || existingResident.condominiumId !== condoId) {
            return NextResponse.json({ error: "Residente no encontrado" }, { status: 404 });
        }

        await prisma.resident.delete({
            where: { id: residentId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error deleting resident:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
