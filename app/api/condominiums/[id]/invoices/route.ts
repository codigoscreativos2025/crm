import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    if (isNaN(condoId)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const searchParams = req.nextUrl.searchParams;
        const month = searchParams.get('month');
        const year = searchParams.get('year');

        const whereClause: any = { condominiumId: condoId };
        
        if (month) whereClause.month = parseInt(month);
        if (year) whereClause.year = parseInt(year);

        const invoices = await prisma.invoice.findMany({
            where: whereClause,
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });

        return NextResponse.json(invoices);
    } catch (e) {
        console.error("Error fetching invoices:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const { searchParams } = new URL(req.url);
    const invoiceId = parseInt(searchParams.get('invoiceId') || '');

    if (isNaN(condoId) || isNaN(invoiceId)) {
        return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        await prisma.invoice.delete({ where: { id: invoiceId } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Error deleting invoice:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}