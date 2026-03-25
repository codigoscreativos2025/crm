import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createCondoLog } from "../../../logHelper";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const body = await req.json();
        const { month, year } = body;

        if (!month || !year) {
             return NextResponse.json({ error: "Mes y Año son requeridos." }, { status: 400 });
        }

        // Check if invoice already exists for this month/year
        const existing = await prisma.invoice.findFirst({
            where: { condominiumId: id, month, year }
        });
        if (existing) {
            return NextResponse.json({ error: `Ya existe una factura para ${month}/${year}. Elimínela primero si desea regenerarla.` }, { status: 400 });
        }

        const condo = await prisma.condominium.findUnique({
            where: { id }
        });

        if (!condo) return NextResponse.json({ error: "Condominio no encontrado" }, { status: 404 });

        // Get all expenses for that month/year
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        const expenses = await prisma.transaction.findMany({
            where: {
                condominiumId: id,
                type: 'EXPENSE',
                date: { gte: startDate, lt: endDate }
            },
            select: { category: true, amount: true, description: true, isFixed: true }
        });

        // Also include FIXED expenses from previous months that haven't been replicated here yet
        // Fixed expenses are identified by isFixed=true from any prior month
        const fixedFromPrior = await prisma.transaction.findMany({
            where: {
                condominiumId: id,
                type: 'EXPENSE',
                isFixed: true,
                date: { lt: startDate }
            },
            select: { category: true, amount: true, description: true },
            distinct: ['category', 'description']
        });

        // Build line items from current month expenses
        const lineItems: { concept: string; amount: number }[] = [];

        // Group expenses by category
        const categoryTotals: Record<string, number> = {};
        expenses.forEach((e: any) => {
            const key = e.category || 'Sin categoría';
            categoryTotals[key] = (categoryTotals[key] || 0) + e.amount;
        });

        Object.entries(categoryTotals).forEach(([cat, amt]) => {
            lineItems.push({ concept: cat, amount: amt });
        });

        // Add fixed costs from prior months that aren't already in this month
        const existingCats = new Set(Object.keys(categoryTotals));
        fixedFromPrior.forEach((fc: any) => {
            const key = `[Fijo] ${fc.description || fc.category}`;
            if (!existingCats.has(fc.category)) {
                lineItems.push({ concept: key, amount: fc.amount });
            }
        });

        // Total amount
        const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

        const invoice = await prisma.invoice.create({
            data: {
                condominiumId: id,
                month,
                year,
                amount: totalAmount,
                lineItems: JSON.stringify(lineItems),
                status: 'GENERATED'
            }
        });

        await createCondoLog(id, `Factura mensual generada para ${month}/${year} - Total: $${totalAmount.toFixed(2)}`, "CRM");

        return NextResponse.json({ success: true, invoice });
    } catch (e) {
        console.error("Error generating invoice:", e);
        return NextResponse.json({ error: "Error interno generando factura." }, { status: 500 });
    }
}
