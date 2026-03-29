import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const condoId = parseInt(params.id);
        if (isNaN(condoId)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

        const condo = await prisma.condominium.findUnique({
            where: { id: condoId }
        });

        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const currentMonthStart = new Date();
        currentMonthStart.setDate(1);
        currentMonthStart.setHours(0,0,0,0);

        // Agrupación de ingresos por categoría (from Transaction)
        const incomeGroup = await prisma.transaction.groupBy({
            by: ['category'],
            where: {
                condominiumId: condoId,
                type: 'INCOME',
                date: { gte: currentMonthStart },
                status: 'RECONCILED'
            },
            _sum: { amount: true }
        });

        // Get total payments (from API) for the month
        const totalPayments = await prisma.payment.aggregate({
            where: {
                condominiumId: condoId,
                date: { gte: currentMonthStart },
                status: 'RECONCILED'
            },
            _sum: { amount: true }
        });

        // Agrupación de egresos por categoría
        const expenseGroup = await prisma.transaction.groupBy({
            by: ['category'],
            where: {
                condominiumId: condoId,
                type: 'EXPENSE',
                date: { gte: currentMonthStart },
                status: 'RECONCILED'
            },
            _sum: { amount: true }
        });

        // Add payments to income group as "Pagos API"
        const paymentAmount = totalPayments._sum.amount || 0;
        const incomeWithPayments = [
            ...incomeGroup.map(item => ({
                name: item.category,
                value: item._sum.amount || 0
            })),
            ...(paymentAmount > 0 ? [{ name: 'Pagos API', value: paymentAmount }] : [])
        ];

        const ingresos = incomeWithPayments.map((item, index) => ({
            name: item.name,
            value: item.value,
            color: COLORS[index % COLORS.length]
        })).filter(i => i.value > 0);

        const egresos = expenseGroup.map((item, index) => ({
            name: item.category,
            value: item._sum.amount || 0,
            color: COLORS[(index + 2) % COLORS.length]
        })).filter(e => e.value > 0);

        return NextResponse.json({ ingresos, egresos });

    } catch (error) {
        console.error("Error fetching category percentages:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
