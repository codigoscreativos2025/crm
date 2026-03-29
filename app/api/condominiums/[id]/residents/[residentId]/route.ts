import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function PUT(req: NextRequest, { params }: { params: { id: string, residentId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const condoId = parseInt(params.id);
        const residentId = parseInt(params.residentId);

        if (isNaN(condoId) || isNaN(residentId)) {
            return NextResponse.json({ error: "IDs Inválidos" }, { status: 400 });
        }

        const condo = await prisma.condominium.findUnique({
            where: { id: condoId }
        });

        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const body = await req.json();
        const { name, phone, additionalData } = body;

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
                        userId: auth.ownerId,
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
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const condoId = parseInt(params.id);
        const residentId = parseInt(params.residentId);

        if (isNaN(condoId) || isNaN(residentId)) {
            return NextResponse.json({ error: "IDs Inválidos" }, { status: 400 });
        }

        const condo = await prisma.condominium.findUnique({
            where: { id: condoId }
        });

        if (!condo || condo.userId !== auth.ownerId) {
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
