import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    if (isNaN(condoId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const pendingPayments = await prisma.payment.findMany({
            where: {
                condominiumId: condoId,
                status: 'PENDING'
            },
            include: {
                resident: {
                    select: { id: true, name: true, phone: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json(pendingPayments);

    } catch (e) {
        console.error("Error fetching pending payments:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}