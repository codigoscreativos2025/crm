import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    if (isNaN(condoId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        // Get pending payments from Payment table (API)
        const pendingPayments = await prisma.payment.findMany({
            where: {
                condominiumId: condoId,
                status: 'PENDING'
            },
            include: {
                resident: {
                    select: { id: true, name: true, phone: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        // Get pending transactions from Transaction table (web) - INCOME type only
        const pendingTransactions = await prisma.transaction.findMany({
            where: {
                condominiumId: condoId,
                status: 'PENDING',
                type: 'INCOME'
            },
            include: {
                resident: {
                    select: { id: true, name: true, phone: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        // Transform transactions to match payment format
        const transformedTransactions = pendingTransactions.map(t => ({
            id: t.id,
            type: 'INCOME' as const,
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
            resident: t.resident,
            isTransaction: true
        }));

        // Combine and sort by date
        const combined = [
            ...pendingPayments.map(p => ({ ...p, isTransaction: false })),
            ...transformedTransactions
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json(combined);

    } catch (e) {
        console.error("Error fetching pending payments:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}