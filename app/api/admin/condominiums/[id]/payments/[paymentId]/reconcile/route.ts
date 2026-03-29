import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

async function calculateSolvency(residentId: number) {
    const resident = await prisma.resident.findUnique({ where: { id: residentId } });
    if (!resident) return;

    const debts = await prisma.residentDebt.findMany({
        where: { residentId, isPaid: false },
        orderBy: [{ year: 'asc' }, { month: 'asc' }]
    });

    const transactions = await prisma.transaction.findMany({
        where: { residentId, type: 'INCOME', status: 'RECONCILED' },
        orderBy: [{ date: 'asc' }]
    });

    let advanceCredit = resident.advanceCredit || 0;

    for (const transaction of transactions) {
        if (transaction.month === null || transaction.year === null) {
            advanceCredit += transaction.amount;
        } else {
            const debt = debts.find(d => d.month === transaction.month && d.year === transaction.year);
            if (debt) {
                debt.amountPaid += transaction.amount;
                if (debt.amountPaid >= debt.amount) debt.isPaid = true;
            }
        }
    }

    for (const debt of debts) {
        if (debt.isPaid) continue;
        const pending = debt.amount - debt.amountPaid;
        if (advanceCredit >= pending) {
            debt.amountPaid += pending;
            debt.isPaid = true;
            advanceCredit -= pending;
        } else if (advanceCredit > 0) {
            debt.amountPaid += advanceCredit;
            advanceCredit = 0;
        }
    }

    for (const debt of debts) {
        await prisma.residentDebt.update({
            where: { id: debt.id },
            data: { amountPaid: debt.amountPaid, isPaid: debt.isPaid }
        });
    }

    const totalDebt = debts.filter(d => !d.isPaid).reduce((sum, d) => sum + (d.amount - d.amountPaid), 0);
    await prisma.resident.update({
        where: { id: residentId },
        data: { status: totalDebt <= 0 ? 'SOLVENTE' : 'INSOLVENTE', advanceCredit }
    });
}

export async function POST(req: NextRequest, { params }: { params: { id: string, paymentId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const transactionId = parseInt(params.paymentId);

    if (isNaN(condoId) || isNaN(transactionId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!transaction || transaction.condominiumId !== condoId) {
            return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
        }

        const updated = await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: 'RECONCILED' }
        });

        if (transaction.residentId) {
            await calculateSolvency(transaction.residentId);
        }

        return NextResponse.json(updated);
    } catch (e) {
        console.error("Error reconciling payment:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}