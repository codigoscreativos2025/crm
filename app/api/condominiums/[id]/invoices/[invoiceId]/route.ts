import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string, invoiceId: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const invoiceId = parseInt(params.invoiceId);
    if (isNaN(invoiceId)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { condominium: true }
        });

        if (!invoice) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });

        return NextResponse.json(invoice);
    } catch (e) {
        console.error("Error fetching invoice:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string, invoiceId: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const invoiceId = parseInt(params.invoiceId);
    if (isNaN(invoiceId)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const body = await req.json();
        const updateData: any = {};

        // Only allow editing notes and lineItems order (not amounts)
        if (body.notes !== undefined) updateData.notes = body.notes;
        if (body.lineItems !== undefined) updateData.lineItems = body.lineItems;

        const updated = await prisma.invoice.update({
            where: { id: invoiceId },
            data: updateData
        });

        return NextResponse.json(updated);
    } catch (e) {
        console.error("Error updating invoice:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
