import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const condoId = parseInt(params.id);
        if (isNaN(condoId)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = user?.parentId || userId;

        const condo = await prisma.condominium.findUnique({
            where: { id: condoId }
        });

        if (!condo || condo.userId !== ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        // Accept dynamic month range from query param
        const { searchParams } = new URL(req.url);
        const numMonths = parseInt(searchParams.get('months') || '6') || 6;

        // Obtener historial
        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - numMonths);

        const transactions = await prisma.transaction.findMany({
            where: {
                condominiumId: condoId,
                date: { gte: monthsAgo },
                status: 'RECONCILED'
            },
            select: {
                type: true,
                amount: true,
                date: true
            }
        });

        // Agrupar por mes/año
        const monthsStr = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const incomeVsExpenseMap: Record<string, { month: string, ing: number, egr: number, order: number }> = {};

        // Inicializar los meses
        for (let i = numMonths - 1; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            incomeVsExpenseMap[key] = {
                month: `${monthsStr[d.getMonth()]}`,
                ing: 0,
                egr: 0,
                order: d.getTime()
            };
        }

        transactions.forEach(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (incomeVsExpenseMap[key]) {
                if (t.type === 'INCOME') {
                    incomeVsExpenseMap[key].ing += t.amount;
                } else {
                    incomeVsExpenseMap[key].egr += t.amount;
                }
            }
        });

        const data = Object.values(incomeVsExpenseMap).sort((a, b) => a.order - b.order).map(item => ({
            name: item.month,
            ingresos: item.ing,
            egresos: item.egr
        }));

        return NextResponse.json(data);

    } catch (error) {
        console.error("Error fetching income-vs-expense metrics:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
