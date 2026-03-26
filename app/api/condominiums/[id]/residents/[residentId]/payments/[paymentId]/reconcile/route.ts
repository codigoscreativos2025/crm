import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

async function calculateResidentSolvency(residentId: number) {
    const resident = await prisma.resident.findUnique({ where: { id: residentId } });
    if (!resident) return { totalDebt: 0, isSolvent: true };

    const debts = await prisma.residentDebt.findMany({
        where: { residentId, isPaid: false },
        orderBy: [{ year: 'asc' }, { month: 'asc' }]
    });

    const payments = await prisma.payment.findMany({
        where: { residentId, status: 'RECONCILED' },
        orderBy: [{ date: 'asc' }]
    });

    let advanceCredit = resident.advanceCredit || 0;

    for (const payment of payments) {
        if (payment.month === null || payment.year === null) {
            advanceCredit += payment.amount;
        } else {
            const debt = debts.find(d => d.month === payment.month && d.year === payment.year);
            if (debt) {
                debt.amountPaid += payment.amount;
                if (debt.amountPaid >= debt.amount) {
                    debt.isPaid = true;
                }
            }
        }
    }

    for (const debt of debts) {
        if (debt.isPaid) continue;
        const pendingAmount = debt.amount - debt.amountPaid;
        if (advanceCredit >= pendingAmount) {
            debt.amountPaid += pendingAmount;
            debt.isPaid = true;
            advanceCredit -= pendingAmount;
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
    const isSolvent = totalDebt <= 0;

    await prisma.resident.update({
        where: { id: residentId },
        data: { status: isSolvent ? 'SOLVENTE' : 'INSOLVENTE', advanceCredit }
    });

    return { totalDebt, isSolvent };
}

export async function POST(req: NextRequest, { params }: { params: { id: string, residentId: string, paymentId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const residentId = parseInt(params.residentId);
    const paymentId = parseInt(params.paymentId);

    if (isNaN(condoId) || isNaN(residentId) || isNaN(paymentId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment || payment.residentId !== residentId || payment.condominiumId !== condoId) {
            return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
        }

        const updatedPayment = await prisma.payment.update({
            where: { id: paymentId },
            data: { status: 'RECONCILED' }
        });

        await calculateResidentSolvency(residentId);

        return NextResponse.json(updatedPayment);
    } catch (e) {
        console.error("Error reconciling payment:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}