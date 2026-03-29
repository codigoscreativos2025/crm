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

        const whereClause: any = { 
            condominiumId: condoId,
            type: 'INCOME'
        };
        
        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate) whereClause.date.gte = new Date(startDate);
            if (endDate) whereClause.date.lte = new Date(endDate);
        }
        if (status) whereClause.status = status;
        if (residentId) whereClause.residentId = parseInt(residentId);

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                resident: {
                    select: { id: true, name: true, phone: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json(transactions);

    } catch (error) {
        console.error("Error fetching payments:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
