import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const userId = parseInt(session.user.id);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { metricsEnabled: true, role: true, parentId: true }
        });

        const ownerId = user?.parentId || userId;

        if (!user?.metricsEnabled && user?.role !== 'ADMIN') {
            return NextResponse.json({ error: "Métricas no habilitadas para esta cuenta" }, { status: 403 });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        // KPI: Total Leads
        const totalLeads = await prisma.contact.count({
            where: { userId: ownerId }
        });

        // KPI: Leads this month
        const leadsThisMonth = await prisma.contact.count({
            where: { userId: ownerId, createdAt: { gte: thirtyDaysAgo } }
        });

        const newLeadsToday = await prisma.contact.count({
            where: {
                userId: ownerId,
                createdAt: { gte: new Date(now.setHours(0, 0, 0, 0)) }
            }
        });

        // KPI: Active Dialogs (Messages this month)
        const messagesThisMonth = await prisma.message.count({
            where: { contact: { userId: ownerId }, timestamp: { gte: thirtyDaysAgo } }
        });

        // KPI: Unread / Unreplied Chats
        const unrepliedMessages = await prisma.message.count({
            where: { contact: { userId: ownerId }, direction: 'inbound', isReadByAgent: false }
        });

        // Leads by Date (Last 7 days for the chart)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(new Date().getDate() - 7);

        const recentContacts = await prisma.contact.findMany({
            where: { userId: ownerId, createdAt: { gte: sevenDaysAgo } },
            select: { createdAt: true }
        });

        // Group contacts by date string (e.g. "Mon", "Tue")
        const daysMap: Record<string, number> = {
            'Dom': 0, 'Lun': 0, 'Mar': 0, 'Mié': 0, 'Jue': 0, 'Vie': 0, 'Sáb': 0
        };

        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        recentContacts.forEach((c: { createdAt: Date }) => {
            const dayName = dayNames[c.createdAt.getDay()];
            daysMap[dayName]++;
        });

        const leadsTrend = Object.keys(daysMap).map(day => ({
            name: day,
            leads: daysMap[day]
        }));

        // Lead Sources for Pie Chart
        const leadSources = [
            { name: 'WhatsApp Cloud API', value: totalLeads, color: '#25D366' },
        ];

        // Advanced Metrics: Funnel Distribution
        const funnels = await prisma.funnel.findMany({
            where: { userId: ownerId },
            include: {
                stages: {
                    include: {
                        contacts: {
                            select: {
                                createdAt: true,
                                updatedAt: true,
                                _count: {
                                    select: {
                                        messages: {
                                            where: { isReadByAgent: false }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Map funnel data for charts
        const funnelStats = funnels.map((f: any) => {
            let funnelTotal = 0;
            let funnelUnanswered = 0;
            const mappedStages = f.stages.map((stage: any) => {
                const count = stage.contacts.length;
                const unanswered = stage.contacts.filter((c: any) => c._count.messages > 0).length;
                funnelTotal += count;
                funnelUnanswered += unanswered;
                return {
                    id: stage.id,
                    name: stage.name,
                    count: count,
                    unansweredCount: unanswered,
                    avgDaysRes: 0 // In a real scenario, calculate from message timestamps
                };
            });
            return {
                id: f.id,
                name: f.name,
                totalLeads: funnelTotal,
                totalUnanswered: funnelUnanswered,
                stages: mappedStages
            };
        });

        // Compute peak hours
        const recentMessagesPeak = await prisma.message.findMany({
            where: { contact: { userId: ownerId }, timestamp: { gte: sevenDaysAgo } },
            select: { timestamp: true }
        });
        const peakHoursArray = new Array(24).fill(0);
        recentMessagesPeak.forEach((m: any) => {
            peakHoursArray[m.timestamp.getHours()]++;
        });
        const peakHours = peakHoursArray.map((count, hour) => ({
            hour: `${hour.toString().padStart(2, '0')}:00`,
            count
        }));

        // Recent Messages (Global across tenant)
        const recentMessages = await prisma.message.findMany({
            take: 5,
            orderBy: { timestamp: 'desc' },
            where: { contact: { userId: ownerId }, direction: 'inbound' },
            include: { contact: true }
        });

        const formattedRecentMessages = recentMessages.map((m: any) => ({
            id: m.id,
            contactName: m.contact.name || m.contact.phone,
            snippet: m.body.length > 40 ? m.body.substring(0, 40) + '...' : m.body,
            status: m.isReadByAgent ? 'Leído' : 'Nuevo',
            source: 'WhatsApp',
            time: m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        return NextResponse.json({
            kpis: {
                totalLeads,
                leadsThisMonth,
                messagesThisMonth,
                unrepliedMessages,
                newLeadsToday
            },
            leadsTrend,
            channelPerformance: [],
            leadSources,
            funnelStats,
            peakHours,
            recentMessages: formattedRecentMessages
        });

    } catch (error) {
        console.error("Error fetching metrics:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
