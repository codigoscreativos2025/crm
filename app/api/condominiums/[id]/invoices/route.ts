import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const url = new URL(req.url);
        const residentId = url.searchParams.get('residentId');

        const whereClause: any = { condominiumId: id };
        if (residentId) {
            whereClause.residentId = parseInt(residentId);
        }

        const invoices = await prisma.invoice.findMany({
            where: whereClause,
            include: { resident: true },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });

        return NextResponse.json(invoices);
    } catch (e) {
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
