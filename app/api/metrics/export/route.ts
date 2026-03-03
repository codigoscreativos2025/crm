import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import * as xlsx from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function POST(req: NextRequest) {
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

        const body = await req.json().catch(() => ({}));
        const kpis = body.kpis || {};
        const funnelStats = body.funnelStats || [];
        const tagsDensity = body.tagsDensity || [];
        const projections = body.projections || {};

        // Fetch contacts with their details
        const contacts = await prisma.contact.findMany({
            where: { userId: ownerId },
            include: {
                stage: { include: { funnel: true } },
                messages: { select: { isReadByAgent: true, direction: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Structure the Excel Data Array
        const excelData = contacts.map(c => {
            const hasUnread = c.messages.some(m => m.direction === 'inbound' && !m.isReadByAgent);
            return {
                "Nombre Completo": c.name || '',
                "Teléfono": c.phone,
                "Embudo": c.stage?.funnel?.name || 'No asignado',
                "Etapa": c.stage?.name || 'No asignada',
                "Estado Atn.": hasUnread ? 'Esperando Respuesta' : 'Al día',
                "IA Pausada": c.aiDisabledUntil && new Date(c.aiDisabledUntil).getTime() > Date.now() ? 'Sí' : 'No',
                "Fecha Creación": c.createdAt.toLocaleString('es-ES', { timeZone: 'UTC' }),
                "Última Actualización": c.updatedAt.toLocaleString('es-ES', { timeZone: 'UTC' })
            };
        });

        const kpiSummaryData = [
            { "Métrica": "Total Leads Históricos", "Valor": kpis.totalLeads || contacts.length },
            { "Métrica": "Leads Nuevos Hoy", "Valor": kpis.newLeadsToday || 0 },
            { "Métrica": "Conversaciones Activas Mes", "Valor": kpis.messagesThisMonth || 0 },
            { "Métrica": "Conversaciones Activas (<15m)", "Valor": kpis.activeDialogsCount || 0 },
            { "Métrica": "Leads Sin Responder", "Valor": kpis.unrepliedMessages || 0 },
            { "Métrica": "Promedio Duración Sesión (min)", "Valor": kpis.globalAvgConversationLengthMins || 0 },
            { "Métrica": "Velocidad Respuesta IA (min)", "Valor": kpis.globalAvgResTimeIA || 0 },
            { "Métrica": "Velocidad Respuesta Humano (min)", "Valor": kpis.globalAvgResTimeHuman || 0 },
            { "Métrica": "Mensajes Generados por IA", "Valor": kpis.globalIAMessages || 0 },
            { "Métrica": "Mensajes Operadores Humanos", "Valor": kpis.globalCRMMessages || 0 },
            { "Métrica": "Proyección Leads (Fin Mes)", "Valor": projections.estimatedLeadsThisMonth || 0 },
            { "Métrica": "Proyección Crecimiento (%)", "Valor": `${projections.projectedGrowth || 0}%` },
        ];

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text('Reporte de Leads - CRM Pivot', 14, 15);

            if (kpis.totalLeads !== undefined) {
                const kpiRows = kpiSummaryData.map(k => [k.Métrica, k.Valor.toString()]);
                autoTable(doc, {
                    head: [["Indicadores Globales (KPI)", "Valor Calculado"]],
                    body: kpiRows,
                    startY: 20,
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [43, 45, 66] }
                });
            }

            const tableColumn = ["Nombre", "Teléfono", "Embudo", "Etapa", "Estado", "Fecha Cre."];
            const tableRows: any[] = [];

            contacts.forEach(c => {
                const hasUnread = c.messages.some(m => m.direction === 'inbound' && !m.isReadByAgent);
                const rowData = [
                    c.name || 'Sin nombre',
                    c.phone,
                    c.stage?.funnel?.name || '-',
                    c.stage?.name || '-',
                    hasUnread ? 'Esperando' : 'Al día',
                    c.createdAt.toLocaleDateString()
                ];
                tableRows.push(rowData);
            });

            const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 20;

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: finalY,
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

        // Add KPI Sheet
        const wsKPI = xlsx.utils.json_to_sheet(kpiSummaryData);
        wsKPI['!cols'] = [{ wch: 40 }, { wch: 20 }];
        xlsx.utils.book_append_sheet(wb, wsKPI, "Resumen Global");

        // Add Contacts Sheet
        const ws = xlsx.utils.json_to_sheet(excelData);

        // Auto-size columns appropriately
        const colWidths = [
            { wch: 30 }, // Nombre
            { wch: 20 }, // Teléfono
            { wch: 25 }, // Embudo
            { wch: 25 }, // Etapa
            { wch: 20 }, // Estado Atn
            { wch: 15 }, // IA
            { wch: 20 }, // Creación
            { wch: 20 }  // Actualización
        ];
        ws['!cols'] = colWidths;

        xlsx.utils.book_append_sheet(wb, ws, "Base de Leads");

        // Add Tags Density Sheet
        if (tagsDensity && tagsDensity.length > 0) {
            const labelsTags = tagsDensity.map((t: any) => ({
                "Etiqueta": t.tag,
                "Leads Asociados": t.count
            }));
            const wsTags = xlsx.utils.json_to_sheet(labelsTags);
            wsTags['!cols'] = [{ wch: 30 }, { wch: 20 }];
            xlsx.utils.book_append_sheet(wb, wsTags, "Densidad Etiquetas");
        }

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
