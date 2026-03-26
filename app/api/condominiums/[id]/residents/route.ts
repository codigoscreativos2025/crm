import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const id = parseInt(params.id);
        const searchParams = req.nextUrl.searchParams;
        const phone = searchParams.get('phone');
        
        if (isNaN(id)) {
            return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
        }

        const condo = await prisma.condominium.findUnique({
            where: { id }
        });

        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado para este condominio" }, { status: 403 });
        }

        const whereClause: any = { condominiumId: id };
        if (phone) {
            whereClause.phone = { contains: phone };
        }

        const residents = await prisma.resident.findMany({
            where: whereClause,
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(residents);

    } catch (error) {
        console.error("Error fetching residents:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const id = parseInt(params.id);
        if (isNaN(id)) {
            return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
        }

        const body = await req.json();
        const { name, phone, additionalData } = body;

        if (!name || !phone) {
            return NextResponse.json({ error: "Nombre y teléfono son requeridos" }, { status: 400 });
        }

        const condo = await prisma.condominium.findUnique({
            where: { id }
        });

        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado para este condominio" }, { status: 403 });
        }

        // Buscar si existe contacto CRM con ese teléfono
        let contactId: number | null = null;
        const contact = await prisma.contact.findFirst({
            where: { phone: phone.replace('+', '') }
        });
        if (contact) {
            contactId = contact.id;
        }

        const newResident = await prisma.resident.create({
            data: {
                name,
                phone,
                additionalData: additionalData || null,
                condominiumId: id,
                contactId
            }
        });

        const { createCondoLog } = await import('../../logHelper');
        await createCondoLog(id, `Nuevo residente registrado: ${name}`, "CRM");

        return NextResponse.json(newResident, { status: 201 });

    } catch (error) {
        console.error("Error creating resident:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}