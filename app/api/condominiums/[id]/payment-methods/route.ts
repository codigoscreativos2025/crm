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

        const methods = await prisma.paymentMethod.findMany({
            where: { condominiumId: condoId },
            orderBy: { createdAt: 'asc' }
        });

        // Convert fields to simpler format for API
        const formattedMethods = methods.map(m => {
            let fieldsObj: Record<string, string> = {};
            try {
                const parsed = JSON.parse(m.fields);
                // Convert from [{"key":"cedula","label":"31099537"}] to {"cedula":"31099537"}
                if (Array.isArray(parsed)) {
                    parsed.forEach((f: { key: string; label: string }) => {
                        if (f.key) fieldsObj[f.key] = f.label || '';
                    });
                }
            } catch (e) {
                // If not valid JSON, try parsing as direct object
                try {
                    fieldsObj = JSON.parse(m.fields);
                } catch (e2) {}
            }
            return {
                ...m,
                fields: fieldsObj
            };
        });

        return NextResponse.json(formattedMethods);

    } catch (e) {
        console.error("Error fetching payment methods:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

        const body = await req.json();
        const { name, fields } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: "Nombre del método de pago es requerido" }, { status: 400 });
        }

        const method = await prisma.paymentMethod.create({
            data: {
                condominiumId: condoId,
                name: name.trim(),
                fields: fields ? JSON.stringify(fields) : "[]"
            }
        });

        return NextResponse.json(method, { status: 201 });

    } catch (e) {
        console.error("Error creating payment method:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
