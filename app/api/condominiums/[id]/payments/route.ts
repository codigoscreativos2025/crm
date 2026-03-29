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

        const searchParams = req.nextUrl.searchParams;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const status = searchParams.get('status');
        const residentId = searchParams.get('residentId');

        // Build where clauses for both tables
        const transactionWhere: any = { 
            condominiumId: condoId,
            type: 'INCOME'  // Only get INCOME transactions (payments)
        };
        const paymentWhere: any = { condominiumId: condoId };
        
        if (startDate || endDate) {
            transactionWhere.date = {};
            paymentWhere.date = {};
            if (startDate) {
                transactionWhere.date.gte = new Date(startDate);
                paymentWhere.date.gte = new Date(startDate);
            }
            if (endDate) {
                transactionWhere.date.lte = new Date(endDate);
                paymentWhere.date.lte = new Date(endDate);
            }
        }
        if (status) {
            transactionWhere.status = status;
            paymentWhere.status = status;
        }
        if (residentId) {
            transactionWhere.residentId = parseInt(residentId);
            paymentWhere.residentId = parseInt(residentId);
        }

        // Get transactions (INCOME only from web)
        const transactions = await prisma.transaction.findMany({
            where: transactionWhere,
            include: {
                resident: {
                    select: { id: true, name: true, phone: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        // Get payments (from API)
        const payments = await prisma.payment.findMany({
            where: paymentWhere,
            include: {
                resident: {
                    select: { id: true, name: true, phone: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        // Transform transactions to match payment format
        const transformedTransactions = transactions.map(t => ({
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
            isTransaction: true  // Flag to identify from Transaction table
        }));

        // Combine and sort by date
        const combined = [
            ...payments.map(p => ({ ...p, isTransaction: false })),
            ...transformedTransactions
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json(combined);

    } catch (error) {
        console.error("Error fetching payments:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
