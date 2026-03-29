import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

const parseLocalDate = (dateStr: string | undefined) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

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

        // Create in Transaction table (unified)
        const transaction = await prisma.transaction.create({
            data: {
                condominiumId: condoId,
                residentId,
                type: 'INCOME',
                category: 'Pago de Residente',
                amount: parseFloat(amount),
                description: notes || null,
                date: parseLocalDate(paymentDateValue),
                status: 'PENDING',
                source: 'api',
                month: month ? parseInt(month) : null,
                year: year ? parseInt(year) : null
            }
        });

        const { createCondoLog } = await import("@/app/api/condominiums/logHelper");
        await createCondoLog(condoId, `Nuevo pago registrado para ${resident.name}: $${amount}`, "CRM");

        return NextResponse.json(transaction, { status: 201 });

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

        // Get income transactions from Transaction table
        const transactions = await prisma.transaction.findMany({
            where: {
                residentId,
                condominiumId: condoId,
                type: 'INCOME'
            },
            include: {
                resident: {
                    select: { id: true, name: true, phone: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json(transactions);

    } catch (e) {
        console.error("Error fetching payments:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}