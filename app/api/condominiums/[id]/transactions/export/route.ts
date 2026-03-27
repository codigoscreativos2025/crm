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

        const searchParams = req.nextUrl.searchParams;
        const type = searchParams.get('type') || 'INCOME';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        
        // Filters
        const residentId = searchParams.get('residentId');
        const category = searchParams.get('category');
        const source = searchParams.get('source');
        const status = searchParams.get('status');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const minAmount = searchParams.get('minAmount');
        const maxAmount = searchParams.get('maxAmount');

        const whereClause: any = { 
            condominiumId: condoId,
            type
        };
        
        if (startDate) whereClause.date = { ...whereClause.date, gte: new Date(startDate) };
        if (endDate) whereClause.date = { ...whereClause.date, lte: new Date(endDate) };
        if (status) whereClause.status = status;
        if (residentId) whereClause.residentId = parseInt(residentId);

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                resident: {
                    select: { id: true, name: true, phone: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        // Get payments if INCOME
        let payments: any[] = [];
        if (type === 'INCOME') {
            const paymentWhere: any = { condominiumId: condoId };
            if (startDate) paymentWhere.date = { ...paymentWhere.date, gte: new Date(startDate) };
            if (endDate) paymentWhere.date = { ...paymentWhere.date, lte: new Date(endDate) };
            if (status) paymentWhere.status = status;
            
            payments = await prisma.payment.findMany({
                where: paymentWhere,
                include: {
                    resident: {
                        select: { id: true, name: true, phone: true }
                    }
                },
                orderBy: { date: 'desc' }
            });
        }

        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        // Combine and apply filters
        let combinedData: any[] = [
            ...transactions.map((t: any) => ({
                id: t.id,
                type: 'transaction',
                date: t.date,
                description: t.description,
                category: t.category,
                amount: t.amount,
                status: t.status,
                receiptUrl: t.receiptUrl,
                resident: t.resident,
                residentId: t.residentId,
                source: (t as any).source || 'web'
            })),
            ...payments.map((p: any) => ({
                id: p.id,
                type: 'payment',
                date: p.date,
                description: p.notes || `Pago ${p.month ? monthNames[p.month - 1] : ''} ${p.year || ''}`.trim(),
                category: 'Pago de Residente',
                amount: p.amount,
                status: p.status,
                receiptUrl: p.receiptUrl,
                resident: p.resident,
                residentId: p.residentId,
                source: (p as any).source || 'api'
            }))
        ];

        // Apply remaining filters
        if (category) {
            combinedData = combinedData.filter(t => t.category === category);
        }
        if (source) {
            combinedData = combinedData.filter(t => t.source === source);
        }
        if (dateFrom) {
            combinedData = combinedData.filter(t => new Date(t.date) >= new Date(dateFrom));
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59);
            combinedData = combinedData.filter(t => new Date(t.date) <= toDate);
        }
        if (minAmount) {
            combinedData = combinedData.filter(t => t.amount >= parseFloat(minAmount));
        }
        if (maxAmount) {
            combinedData = combinedData.filter(t => t.amount <= parseFloat(maxAmount));
        }
        if (residentId) {
            combinedData = combinedData.filter(t => t.residentId === parseInt(residentId));
        }

        combinedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Generate PDF
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        const titleText = type === 'INCOME' ? 'INGRESOS Y PAGOS' : 'EGRESOS Y GASTOS';
        doc.text(titleText, 105, 20, { align: 'center' });

        // Condo name and date range
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(condo.name || 'CONDOMINIO', 14, 30);
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            doc.text(`Periodo: ${start.toLocaleDateString('es-MX')} - ${end.toLocaleDateString('es-MX')}`, 14, 36);
        }

        // Filters info
        let filterText = 'Filtros aplicados: ';
        const filters: string[] = [];
        if (category) filters.push(`Categoría: ${category}`);
        if (source) filters.push(`Origen: ${source === 'api' ? 'API' : 'Web'}`);
        if (status) filters.push(`Estado: ${status === 'PENDING' ? 'Por Conciliar' : 'Conciliado'}`);
        if (dateFrom) filters.push(`Desde: ${dateFrom}`);
        if (dateTo) filters.push(`Hasta: ${dateTo}`);
        if (minAmount) filters.push(`Monto mín.: $${minAmount}`);
        if (maxAmount) filters.push(`Monto máx.: $${maxAmount}`);
        if (residentId) filters.push(`Residente: ${combinedData[0]?.resident?.name || 'ID ' + residentId}`);
        
        if (filters.length > 0) {
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(filterText + filters.join(', '), 14, 42);
            doc.setTextColor(0);
        }

        // Table data
        const tableData = combinedData.map(t => [
            new Date(t.date).toLocaleDateString('es-MX'),
            t.description || '-',
            t.category || '-',
            `$${t.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            t.resident?.name || '-',
            t.source === 'api' ? 'API' : 'Web',
            t.status === 'RECONCILED' ? '✓' : '⏳'
        ]);

        autoTable(doc, {
            startY: 50,
            head: [['Fecha', 'Detalle', 'Categoría', 'Monto', 'Residente', 'Origen', 'Estado']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: type === 'INCOME' ? [16, 185, 129] : [220, 38, 38] },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 22 },
                1: { cellWidth: 40 },
                2: { cellWidth: 30 },
                3: { cellWidth: 25, halign: 'right' },
                4: { cellWidth: 30 },
                5: { cellWidth: 15 },
                6: { cellWidth: 15, halign: 'center' }
            }
        });

        // Totals
        const totalAmount = combinedData.reduce((sum, t) => sum + t.amount, 0);
        const pendingCount = combinedData.filter(t => t.status === 'PENDING').length;
        const reconciledCount = combinedData.filter(t => t.status === 'RECONCILED').length;

        // @ts-ignore
        const finalY = doc.lastAutoTable.finalY + 10;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total de registros: ${combinedData.length}`, 14, finalY);
        doc.text(`Total amount: $${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 14, finalY + 6);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Pendientes: ${pendingCount}`, 120, finalY);
        doc.text(`Conciliados: ${reconciledCount}`, 120, finalY + 6);

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Generado el ${new Date().toLocaleString('es-MX')}`, 105, 285, { align: 'center' });

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new Response(pdfBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Reporte_${type === 'INCOME' ? 'Ingresos' : 'Egresos'}_${new Date().toISOString().split('T')[0]}.pdf"`
            }
        });

    } catch (e) {
        console.error("Error generating export PDF:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
