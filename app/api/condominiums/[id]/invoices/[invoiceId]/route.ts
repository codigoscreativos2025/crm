import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string, invoiceId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const invoiceId = parseInt(params.invoiceId);
    
    if (isNaN(condoId) || isNaN(invoiceId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { condominium: true }
        });

        if (!invoice || invoice.condominiumId !== condoId) {
            return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
        }

        return NextResponse.json(invoice);
    } catch (e) {
        console.error("Error fetching invoice:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string, invoiceId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const invoiceId = parseInt(params.invoiceId);
    
    if (isNaN(condoId) || isNaN(invoiceId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const body = await req.json();
        const updateData: any = {};

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