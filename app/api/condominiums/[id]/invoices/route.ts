import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const condoId = parseInt(params.id);
    if (isNaN(condoId)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = user?.parentId || userId;

        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const invoices = await prisma.invoice.findMany({
            where: { condominiumId: condoId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });

        return NextResponse.json(invoices);
    } catch (e) {
        console.error("Error fetching invoices:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const condoId = parseInt(params.id);
    const { searchParams } = new URL(req.url);
    const invoiceId = parseInt(searchParams.get('invoiceId') || '');

    if (isNaN(condoId) || isNaN(invoiceId)) {
        return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
    }

    try {
        await prisma.invoice.delete({ where: { id: invoiceId } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Error deleting invoice:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
