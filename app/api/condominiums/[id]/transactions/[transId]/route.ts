import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string, transId: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const condoId = parseInt(params.id);
        const transId = parseInt(params.transId);

        if (isNaN(condoId) || isNaN(transId)) {
            return NextResponse.json({ error: "IDs Inválidos" }, { status: 400 });
        }

        const body = await req.json();
        const { category, amount, description, status, date, type, residentId, isFixed } = body;

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

        const existingTrans = await prisma.transaction.findUnique({
            where: { id: transId }
        });

        if (!existingTrans || existingTrans.condominiumId !== condoId) {
            return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
        }

        const dataToUpdate: any = {};
        if (category) dataToUpdate.category = category;
        if (amount !== undefined) dataToUpdate.amount = parseFloat(amount);
        if (description !== undefined) dataToUpdate.description = description || null;
        if (status && (status === 'PENDING' || status === 'RECONCILED')) dataToUpdate.status = status;
        if (date) dataToUpdate.date = new Date(date);
        if (type && (type === 'INCOME' || type === 'EXPENSE')) dataToUpdate.type = type;
        if (isFixed !== undefined) dataToUpdate.isFixed = isFixed;
        
        // Handle Resident ID Update (Only applicable for INCOME generally)
        if (residentId !== undefined) {
             if (residentId === null) {
                 dataToUpdate.residentId = null;
             } else {
                 const resData = await prisma.resident.findUnique({ where: { id: parseInt(residentId) } });
                 if (!resData || resData.condominiumId !== condoId) {
                     return NextResponse.json({ error: "El residente especificado no es válido" }, { status: 400 });
                 }
                 dataToUpdate.residentId = parseInt(residentId);
             }
        }

        const updated = await prisma.transaction.update({
            where: { id: transId },
            data: dataToUpdate
        });

        return NextResponse.json(updated);

    } catch (error) {
        console.error("Error updating transaction:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string, transId: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const condoId = parseInt(params.id);
        const transId = parseInt(params.transId);

        if (isNaN(condoId) || isNaN(transId)) {
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

        const existingTrans = await prisma.transaction.findUnique({
            where: { id: transId }
        });

        if (!existingTrans || existingTrans.condominiumId !== condoId) {
            return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
        }

        await prisma.transaction.delete({
            where: { id: transId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error deleting transaction:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
