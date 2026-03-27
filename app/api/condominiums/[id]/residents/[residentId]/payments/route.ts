import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function POST(req: NextRequest, { params }: { params: { id: string, residentId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const residentId = parseInt(params.residentId);

    if (isNaN(condoId) || isNaN(residentId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const resident = await prisma.resident.findUnique({
            where: { id: residentId }
        });

        if (!resident || resident.condominiumId !== condoId) {
            return NextResponse.json({ error: "Residente no encontrado" }, { status: 404 });
        }

        const body = await req.json();
        const { amount, date, paymentDate, notes, month, year } = body;
        const paymentDateValue = date || paymentDate;

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Monto requerido y válido" }, { status: 400 });
        }

        const payment = await prisma.payment.create({
            data: {
                residentId,
                condominiumId: condoId,
                amount: parseFloat(amount),
                date: paymentDateValue ? new Date(paymentDateValue) : new Date(),
                notes: notes || null,
                month: month ? parseInt(month) : null,
                year: year ? parseInt(year) : null,
                status: 'PENDING',
                source: 'api'
            }
        });

        const { createCondoLog } = await import("@/app/api/condominiums/logHelper");
        await createCondoLog(condoId, `Nuevo pago registrado para ${resident.name}: $${amount}`, "CRM");

        return NextResponse.json(payment, { status: 201 });

    } catch (e) {
        console.error("Error creating payment:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function GET(req: NextRequest, { params }: { params: { id: string, residentId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const residentId = parseInt(params.residentId);

    if (isNaN(condoId) || isNaN(residentId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const payments = await prisma.payment.findMany({
            where: {
                residentId,
                condominiumId: condoId
            },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json(payments);

    } catch (e) {
        console.error("Error fetching payments:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}