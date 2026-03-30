import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function PUT(req: NextRequest, { params }: { params: { id: string, methodId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const methodId = parseInt(params.methodId);

    if (isNaN(condoId) || isNaN(methodId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const method = await prisma.paymentMethod.findUnique({ where: { id: methodId } });
        if (!method || method.condominiumId !== condoId) {
            return NextResponse.json({ error: "Método de pago no encontrado" }, { status: 404 });
        }

        const body = await req.json();
        const { name, fields } = body;

        const updated = await prisma.paymentMethod.update({
            where: { id: methodId },
            data: {
                name: name ? name.trim() : undefined,
                fields: fields ? JSON.stringify(fields) : undefined
            }
        });

        return NextResponse.json(updated);

    } catch (e) {
        console.error("Error updating payment method:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string, methodId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const methodId = parseInt(params.methodId);

    if (isNaN(condoId) || isNaN(methodId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const method = await prisma.paymentMethod.findUnique({ where: { id: methodId } });
        if (!method || method.condominiumId !== condoId) {
            return NextResponse.json({ error: "Método de pago no encontrado" }, { status: 404 });
        }

        // Verificar si hay transacciones usando este método
        const transactionsCount = await prisma.transaction.count({
            where: { paymentMethodId: methodId }
        });

        if (transactionsCount > 0) {
            return NextResponse.json({ 
                error: "No se puede eliminar. Hay transacciones asociadas a este método de pago" 
            }, { status: 400 });
        }

        await prisma.paymentMethod.delete({
            where: { id: methodId }
        });

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error("Error deleting payment method:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
