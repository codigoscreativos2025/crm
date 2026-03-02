import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import * as xlsx from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, parentId: true, canExportData: true }
        });

        if (user?.role !== 'ADMIN' && !user?.canExportData) {
            return NextResponse.json({ error: "No tienes permiso para exportar datos" }, { status: 403 });
        }

        const ownerId = user?.parentId || userId;

        const format = req.nextUrl.searchParams.get('format') || 'excel';

        // Fetch contacts with their details
        const contacts = await prisma.contact.findMany({
            where: { userId: ownerId },
            include: {
                stage: {
                    include: { funnel: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Structure the Excel Data Array
        const excelData = contacts.map(c => ({
            "Nombre Completo": c.name || '',
            "Teléfono": c.phone,
            "Embudo": c.stage?.funnel?.name || 'No asignado',
            "Etapa": c.stage?.name || 'No asignada',
            "Confirmado por IA": c.nameConfirmed ? 'Sí' : 'No',
            "Fecha Creación": c.createdAt.toLocaleString('es-ES', { timeZone: 'UTC' }),
            "Última Actualización": c.updatedAt.toLocaleString('es-ES', { timeZone: 'UTC' })
        }));

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text('Reporte de Leads - CRM Pivot', 14, 15);

            const tableColumn = ["Nombre", "Teléfono", "Embudo", "Etapa", "Confirmado", "Fecha Cre."];
            const tableRows: any[] = [];

            contacts.forEach(c => {
                const rowData = [
                    c.name || 'Sin nombre',
                    c.phone,
                    c.stage?.funnel?.name || '-',
                    c.stage?.name || '-',
                    c.nameConfirmed ? 'Sí' : 'No',
                    c.createdAt.toLocaleDateString()
                ];
                tableRows.push(rowData);
            });

            // @ts-ignore
            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 20,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [37, 211, 102] } // WhatsApp Green
            });

            const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

            return new NextResponse(pdfBuffer, {
                status: 200,
                headers: {
                    'Content-Disposition': `attachment; filename="Reporte_Leads_CRM_${new Date().toISOString().split('T')[0]}.pdf"`,
                    'Content-Type': 'application/pdf'
                }
            });
        }

        // Default to Excel
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(excelData);

        // Auto-size columns appropriately
        const colWidths = [
            { wch: 30 }, // Nombre
            { wch: 20 }, // Teléfono
            { wch: 25 }, // Embudo
            { wch: 25 }, // Etapa
            { wch: 15 }, // IA
            { wch: 20 }, // Creación
            { wch: 20 }  // Actualización
        ];
        ws['!cols'] = colWidths;

        xlsx.utils.book_append_sheet(wb, ws, "Leads CRM");

        const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        return new NextResponse(excelBuffer, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="Reporte_Leads_CRM_${new Date().toISOString().split('T')[0]}.xlsx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });

    } catch (error) {
        console.error("Error exporting excel:", error);
        return NextResponse.json({ error: "Error al generar reporte Excel" }, { status: 500 });
    }
}
