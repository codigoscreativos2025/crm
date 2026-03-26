import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

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

        const resident = await prisma.resident.findUnique({ where: { id: residentId } });
        if (!resident || resident.condominiumId !== condoId) {
            return NextResponse.json({ error: "Residente no encontrado" }, { status: 404 });
        }

        const debts = await prisma.residentDebt.findMany({
            where: { residentId },
            orderBy: [{ year: 'asc' }, { month: 'asc' }]
        });

        const totalDebt = debts.filter(d => !d.isPaid).reduce((sum, d) => sum + (d.amount - d.amountPaid), 0);

        return NextResponse.json({
            resident: {
                id: resident.id,
                name: resident.name,
                phone: resident.phone,
                status: resident.status,
                advanceCredit: resident.advanceCredit || 0
            },
            totalDebt,
            debts: debts.map(d => ({
                month: d.month,
                year: d.year,
                amount: d.amount,
                amountPaid: d.amountPaid,
                pending: d.amount - d.amountPaid,
                isPaid: d.isPaid
            }))
        });

    } catch (e) {
        console.error("Error fetching debt:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}