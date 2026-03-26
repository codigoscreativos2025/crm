import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const condo = await prisma.condominium.findUnique({ where: { id } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const searchParams = req.nextUrl.searchParams;
        const source = searchParams.get('source');

        const whereClause: any = { condominiumId: id };
        if (source) whereClause.source = source;

        const logs = await prisma.condominiumLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 150
        });

        return NextResponse.json(logs);
    } catch (e) {
        return NextResponse.json({ error: "Error fetching logs" }, { status: 500 });
    }
}