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

        const residents = await prisma.resident.findMany({
            where: { condominiumId: condoId }
        });

        const totalResidents = residents.length;
        const solventResidents = residents.filter(r => r.status === 'SOLVENTE').length;
        const insolventResidents = residents.filter(r => r.status === 'INSOLVENTE').length;

        const solventPercentage = totalResidents > 0 ? (solventResidents / totalResidents) * 100 : 0;
        const insolventPercentage = totalResidents > 0 ? (insolventResidents / totalResidents) * 100 : 0;

        return NextResponse.json({
            totalResidents,
            solventResidents,
            insolventResidents,
            solventPercentage: parseFloat(solventPercentage.toFixed(2)),
            insolventPercentage: parseFloat(insolventPercentage.toFixed(2))
        });

    } catch (e) {
        console.error("Error calculating solvency metrics:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}