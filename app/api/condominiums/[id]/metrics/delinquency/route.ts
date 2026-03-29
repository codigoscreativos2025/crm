import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

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

        // Calculation of Delinquency based on Income for the current month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalResidents = await prisma.resident.count({
            where: { condominiumId: condoId }
        });

        if (totalResidents === 0) {
            return NextResponse.json([
                { name: 'Al día', value: 0, fill: '#25D366' },
                { name: 'Morosos', value: 0, fill: '#ff4d4f' }
            ]);
        }

        // Residents who made at least one income transaction this month
        const payingResidentsCountQuery = await prisma.transaction.groupBy({
            by: ['residentId'],
            where: {
                condominiumId: condoId,
                type: 'INCOME',
                date: { gte: firstDayOfMonth },
                residentId: { not: null }
            }
        });

        const alDiaCount = payingResidentsCountQuery.length;
        const morososCount = totalResidents - alDiaCount;

        const data = [
            { name: 'Al día', value: alDiaCount, fill: '#25D366' },
            { name: 'Morosos', value: morososCount, fill: '#ff4d4f' }
        ];

        return NextResponse.json(data);

    } catch (error) {
        console.error("Error fetching delinquency metrics:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
