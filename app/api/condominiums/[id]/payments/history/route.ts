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

        const residents = await prisma.resident.findMany({
            where: { condominiumId: condoId },
            orderBy: { name: 'asc' }
        });

        const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('HISTORIAL DE PAGOS - TODOS LOS RESIDENTES', 105, 25, { align: 'center' });

        doc.setFontSize(14);
        doc.text((condo.name || 'CONDOMINIO').toUpperCase(), 14, 40);

        let currentY = 50;

        for (const resident of residents) {
            const debts = await prisma.residentDebt.findMany({
                where: { residentId: resident.id },
                orderBy: [{ year: 'desc' }, { month: 'desc' }]
            });

            const payments = await prisma.payment.findMany({
                where: { residentId: resident.id },
                orderBy: [{ date: 'desc' }]
            });

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${resident.name} (${resident.phone}) - ${resident.status}`, 14, currentY);
            currentY += 5;

            const debtData = debts.slice(0, 6).map(d => [
                `${monthNames[d.month - 1].substring(0, 3)} ${d.year}`,
                `$${d.amount.toFixed(2)}`,
                d.isPaid ? '✓' : '⏳'
            ]);

            if (debtData.length > 0) {
                autoTable(doc, {
                    startY: currentY,
                    head: [['MES', 'MONTO', 'EST']],
                    body: debtData,
                    theme: 'striped',
                    headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
                    styles: { fontSize: 8, cellPadding: 2 },
                    margin: { left: 14 }
                });
                // @ts-ignore
                currentY = doc.lastAutoTable.finalY + 5;
            }
        }

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new Response(pdfBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Historial_Pagos_General.pdf"`
            }
        });

    } catch (e) {
        console.error("Error generating general history PDF:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}