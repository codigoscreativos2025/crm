import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function DELETE(req: NextRequest, { params }: { params: { id: string, residentId: string, paymentId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const paymentId = parseInt(params.paymentId);

    if (isNaN(condoId) || isNaN(paymentId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId }
        });

        if (!payment || payment.condominiumId !== condoId) {
            return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
        }

        await prisma.payment.delete({
            where: { id: paymentId }
        });

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error("Error deleting payment:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
