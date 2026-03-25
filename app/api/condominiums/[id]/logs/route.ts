import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const logs = await prisma.condominiumLog.findMany({
            where: { condominiumId: id },
            orderBy: { createdAt: 'desc' },
            take: 150 // max 150 para la interfaz
        });

        return NextResponse.json(logs);
    } catch (e) {
        return NextResponse.json({ error: "Error fetching logs" }, { status: 500 });
    }
}
