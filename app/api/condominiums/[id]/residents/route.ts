import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const id = parseInt(params.id);
        const searchParams = req.nextUrl.searchParams;
        const phone = searchParams.get('phone');
        
        if (isNaN(id)) {
            return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
        }

        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = user?.parentId || userId;

        // Validar acceso al condominio
        const condo = await prisma.condominium.findUnique({
            where: { id }
        });

        if (!condo || condo.userId !== ownerId) {
            return NextResponse.json({ error: "No autorizado para este condominio" }, { status: 403 });
        }

        // Si pasan phone, buscar por phone
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
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const id = parseInt(params.id);
        if (isNaN(id)) {
            return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
        }

        const body = await req.json();
        const { name, phone, additionalData } = body;

        if (!name || !phone) {
            return NextResponse.json({ error: "Faltan datos obligatorios (name, phone)" }, { status: 400 });
        }

        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = user?.parentId || userId;

        const condo = await prisma.condominium.findUnique({
            where: { id }
        });

        if (!condo || condo.userId !== ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        // Validar duplicado por teléfono en este condominio
        const existing = await prisma.resident.findUnique({
            where: {
                condominiumId_phone: {
                    condominiumId: id,
                    phone: phone
                }
            }
        });

        if (existing) {
            return NextResponse.json({ error: "Ya existe un residente con ese número telefónico en el condominio" }, { status: 400 });
        }

        // Buscar si existe un contacto CRM asociado para vincularlo (Opcional)
        const crmContact = await prisma.contact.findUnique({
            where: {
                userId_phone: {
                    userId: ownerId,
                    phone: phone
                }
            }
        });

        const newResident = await prisma.resident.create({
            data: {
                condominiumId: id,
                name,
                phone,
                additionalData: additionalData || null,
                contactId: crmContact ? crmContact.id : null
            }
        });

        return NextResponse.json(newResident, { status: 201 });

    } catch (error) {
        console.error("Error creating resident:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
