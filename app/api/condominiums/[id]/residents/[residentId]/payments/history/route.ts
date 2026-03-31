import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";
import { getTemplateForDocument, renderTemplateToPdf } from "@/lib/pdfTemplateRenderer";

export async function GET(req: NextRequest, { params }: { params: { id: string, residentId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const residentId = parseInt(params.residentId);

    if (isNaN(condoId) || isNaN(residentId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const resident = await prisma.resident.findUnique({ where: { id: residentId } });
        if (!resident || resident.condominiumId !== condoId) {
            return NextResponse.json({ error: "Residente no encontrado" }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const yearFilter = searchParams.get('year');
        
        const debts = await prisma.residentDebt.findMany({
            where: { residentId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });

        const transactionWhere: any = {
            residentId,
            type: 'INCOME'
        };
        if (yearFilter) {
            const year = parseInt(yearFilter);
            transactionWhere.date = {
                gte: new Date(year, 0, 1),
                lte: new Date(year, 11, 31)
            };
        }

        const transactions = await prisma.transaction.findMany({
            where: transactionWhere,
            orderBy: [{ date: 'desc' }]
        });

        const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        const template = await getTemplateForDocument(condoId, 'paymentHistory');

        if (!template) {
            return NextResponse.json({ error: "Error cargando plantilla" }, { status: 500 });
        }

        const totalPaid = transactions.filter(t => t.status === 'RECONCILED').reduce((sum, t) => sum + t.amount, 0);
        const totalDebt = debts.filter(d => !d.isPaid).reduce((sum, d) => sum + (d.amount - d.amountPaid), 0);

        const renderData = {
            condominium: {
                name: condo.name || 'CONDOMINIO'
            },
            resident: {
                name: resident.name,
                phone: resident.phone,
                unit: (resident.additionalData ? JSON.parse(resident.additionalData).unit : '') || '',
                status: resident.status,
                advanceCredit: resident.advanceCredit || 0
            },
            debts: debts.map(d => ({
                month: monthNames[d.month - 1],
                year: d.year,
                amount: d.amount,
                amountPaid: d.amountPaid,
                isPaid: d.isPaid
            })),
            payments: transactions.map(t => ({
                date: t.date ? new Date(t.date).toLocaleDateString() : '-',
                description: t.month && t.year ? `${monthNames[t.month - 1]} ${t.year}` : 'Abono general',
                reference: t.reference || '-',
                amount: t.amount,
                status: t.status === 'RECONCILED' ? 'PAGADO' : 'PENDIENTE'
            })),
            totals: {
                totalPaid: totalPaid,
                totalDebt: totalDebt
            },
            lastPayment: transactions.length > 0 ? {
                date: new Date(transactions[0].date).toLocaleDateString()
            } : null
        };

        const pdfBuffer = await renderTemplateToPdf(template, renderData);

        return new Response(pdfBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Historial_Pagos_${resident.name.replace(/ /g, '_')}.pdf"`
            }
        });

    } catch (e) {
        console.error("Error generating history PDF:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}