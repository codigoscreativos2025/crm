import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createCondoLog } from "../../logHelper";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const body = await req.json();
        const { month, year, amount } = body;

        if (!month || !year || amount === undefined) {
             return NextResponse.json({ error: "Mes, Año y Monto son requeridos." }, { status: 400 });
        }

        const condo = await prisma.condominium.findUnique({
            where: { id },
            include: { residents: true }
        });

        if (!condo) return NextResponse.json({ error: "Condominio no encontrado" }, { status: 404 });

        let generatedCount = 0;

        // Para cada residente, verificar si ya tiene factura en ese mes/año
        for (const res of condo.residents) {
            const exists = await prisma.invoice.findFirst({
                where: {
                    condominiumId: id,
                    residentId: res.id,
                    month,
                    year
                }
            });

            if (!exists) {
                await prisma.invoice.create({
                    data: {
                        condominiumId: id,
                        residentId: res.id,
                        month,
                        year,
                        amount: parseFloat(amount),
                        status: 'PENDING'
                    }
                });
                generatedCount++;
            }
        }

        if (generatedCount > 0) {
            await createCondoLog(id, `Se generaron ${generatedCount} facturas para ${month}/${year}`, "CRM");
        }

        return NextResponse.json({ success: true, generated: generatedCount });
    } catch (e) {
        console.error("Error generating invoices:", e);
        return NextResponse.json({ error: "Error interno generado facturas." }, { status: 500 });
    }
}
