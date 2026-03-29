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

        const payment = await prisma.payment.create({
            data: {
                residentId,
                condominiumId: condoId,
                amount: parseFloat(amount),
                date: parseLocalDate(paymentDateValue),
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

        // Get payments from Payment table
        const payments = await prisma.payment.findMany({
            where: {
                residentId,
                condominiumId: condoId
            },
            orderBy: { date: 'desc' }
        });

        // Get income transactions from Transaction table for this resident
        const transactions = await prisma.transaction.findMany({
            where: {
                residentId,
                condominiumId: condoId,
                type: 'INCOME'
            },
            orderBy: { date: 'desc' }
        });

        // Transform transactions to match payment format
        const transformedTransactions = transactions.map(t => ({
            id: t.id,
            amount: t.amount,
            date: t.date,
            status: t.status,
            receiptUrl: t.receiptUrl,
            receiptType: t.receiptType,
            notes: t.description,
            month: null,
            year: null,
            source: t.source,
            residentId: t.residentId,
            condominiumId: t.condominiumId,
            isTransaction: true
        }));

        // Combine and sort by date
        const combined = [
            ...payments.map(p => ({ ...p, isTransaction: false })),
            ...transformedTransactions
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json(combined);

    } catch (e) {
        console.error("Error fetching payments:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}