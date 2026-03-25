import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, type, residentFields, incomeCategories, expenseCategories, invoiceDay } = body;
        const id = parseInt(params.id);

        if (isNaN(id)) {
            return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
        }

        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = user?.parentId || userId;

        // Verificar que el condominio existe y pertenece al usuario
        const existing = await prisma.condominium.findUnique({
            where: { id }
        });

        if (!existing || existing.userId !== ownerId) {
            return NextResponse.json({ error: "Condominio no encontrado o sin permisos" }, { status: 404 });
        }

        const dataToUpdate: any = {};
        if (name) dataToUpdate.name = name;
        if (type && (type === 'CASA' || type === 'APARTAMENTO')) dataToUpdate.type = type;
        if (residentFields !== undefined) dataToUpdate.residentFields = residentFields;
        if (incomeCategories !== undefined) dataToUpdate.incomeCategories = incomeCategories;
        if (expenseCategories !== undefined) dataToUpdate.expenseCategories = expenseCategories;
        if (invoiceDay !== undefined) dataToUpdate.invoiceDay = parseInt(invoiceDay, 10) || 1;

        const updated = await prisma.condominium.update({
            where: { id },
            data: dataToUpdate
        });

        // Generar un LOG usando el helper
        const { createCondoLog } = await import('../logHelper');
        await createCondoLog(id, "Configuración del condominio actualizada", "CRM");

        return NextResponse.json(updated);

    } catch (error) {
        console.error("Error updating condominium:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const id = parseInt(params.id);
        if (isNaN(id)) {
            return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
        }

        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = user?.parentId || userId;

        const existing = await prisma.condominium.findUnique({
            where: { id }
        });

        if (!existing || existing.userId !== ownerId) {
            return NextResponse.json({ error: "Condominio no encontrado o sin permisos" }, { status: 404 });
        }

        await prisma.condominium.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "Condominio eliminado exitosamente." });

    } catch (error) {
        console.error("Error deleting condominium:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
