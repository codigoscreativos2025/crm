import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";

const parseLocalDate = (dateStr: string | undefined) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const condoId = parseInt(params.id);
        if (isNaN(condoId)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

        const searchParams = req.nextUrl.searchParams;
        const type = searchParams.get('type');
        const status = searchParams.get('status');
        const residentId = searchParams.get('residentId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const condo = await prisma.condominium.findUnique({
            where: { id: condoId }
        });

        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const whereClause: any = { condominiumId: condoId };
        
        if (type) whereClause.type = type;
        if (status) whereClause.status = status;
        if (residentId) whereClause.residentId = parseInt(residentId);
        
        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate) whereClause.date.gte = new Date(startDate);
            if (endDate) whereClause.date.lte = new Date(endDate);
        }

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                resident: {
                    select: { id: true, name: true, phone: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json(transactions);

    } catch (error) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const condoId = parseInt(params.id);
        if (isNaN(condoId)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

        const body = await req.json();
        const { type, category, amount, description, date, status, residentId, receiptUrl, receiptType, isFixed, source } = body;

        if (!type || !category || amount === undefined) {
            return NextResponse.json({ error: "Faltan datos obligatorios (type, category, amount)" }, { status: 400 });
        }

        if (type !== 'INCOME' && type !== 'EXPENSE') {
            return NextResponse.json({ error: "Tipo de transacción inválido" }, { status: 400 });
        }

        const condo = await prisma.condominium.findUnique({
            where: { id: condoId }
        });

        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        if (type === 'INCOME' && residentId) {
            const resData = await prisma.resident.findUnique({ where: { id: parseInt(residentId) } });
            if (!resData || resData.condominiumId !== condoId) {
                return NextResponse.json({ error: "El residente especificado no es válido o no pertenece al condominio" }, { status: 400 });
            }
        }

        const newTransaction = await prisma.transaction.create({
            data: {
                condominiumId: condoId,
                type,
                category,
                amount: parseFloat(amount),
                description: description || null,
                status: status || 'PENDING',
                date: parseLocalDate(date),
                isFixed: type === 'EXPENSE' ? (isFixed === true) : false,
                source: source || 'web',
                residentId: type === 'INCOME' && residentId ? parseInt(residentId) : null,
                receiptUrl: receiptUrl || null,
                receiptType: receiptType || null
            }
        });

        const { createCondoLog } = await import('../../logHelper');
        await createCondoLog(condoId, `Nueva Transacción: ${type === 'INCOME' ? 'Ingreso' : 'Egreso'} por $${amount}`, "CRM");

        return NextResponse.json(newTransaction, { status: 201 });

    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}