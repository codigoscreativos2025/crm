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
                                id: true,
                                name: true,
                                phone: true,
                                createdAt: true,
                                updatedAt: true,
                                _count: {
                                    select: {
                                        messages: {
                                            where: { isReadByAgent: false }
                                        }
                                    }
                                },
                                messages: {
                                    select: { timestamp: true, direction: true, isFromIA: true },
                                    orderBy: { timestamp: 'asc' }
                                }
                            }
                        }
                    }
                }
            }
        });

        const globalUnrepliedContacts: any[] = [];

        // Map funnel data for charts
        const funnelStats = funnels.map((f: any) => {
            let funnelTotal = 0;
            let funnelUnanswered = 0;
            const mappedStages = f.stages.map((stage: any) => {
                const count = stage.contacts.length;
                const unanswered = stage.contacts.filter((c: any) => c._count.messages > 0).length;
                funnelTotal += count;
                funnelUnanswered += unanswered;

                let stageTotalResponseTime = 0;
                let responsePairsCount = 0;
                let stageTotalRetentionTime = 0;
                let stageIAMessages = 0;
                let stageCRMMessages = 0;
                let stageTotalConversationTime = 0;
                let stageConversationCount = 0;
                let stageTotalResTimeIA = 0;
                let stageResCountIA = 0;
                let stageTotalResTimeHuman = 0;
                let stageResCountHuman = 0;
                const stagePeakHoursArray = new Array(24).fill(0);

                stage.contacts.forEach((contact: any) => {
                    // Retention time: Time since the contact was last updated (approximate time stuck in stage)
                    const retentionMs = now.getTime() - new Date(contact.updatedAt).getTime();
                    stageTotalRetentionTime += retentionMs;

                    let lastInboundTime: Date | null = null;
                    let previousMsgTime: Date | null = null;
                    let contactEffectiveTime = 0;

                    contact.messages.forEach((msg: any) => {
                        const msgTime = new Date(msg.timestamp);

                        // Stage Level Peak Hours
                        stagePeakHoursArray[msgTime.getHours()]++;

                        // IA vs CRM Counts
                        if (msg.direction === 'outbound') {
                            if (msg.isFromIA) stageIAMessages++;
                            else stageCRMMessages++;
                        }

                        // Conversation Duration Span (Effective Session Time)
                        if (previousMsgTime) {
                            const diff = msgTime.getTime() - previousMsgTime.getTime();
                            if (diff < 60 * 60 * 1000) { // If gap is less than 1 hour, aggregate
                                contactEffectiveTime += diff;
                            }
                        }
                        previousMsgTime = msgTime;

                        // Response time: Time between inbound message and the next outbound message
                        if (msg.direction === 'inbound') {
                            if (!lastInboundTime) lastInboundTime = new Date(msg.timestamp);
                        } else if (msg.direction === 'outbound' && lastInboundTime) {
                            const responseMs = new Date(msg.timestamp).getTime() - lastInboundTime.getTime();
                            // Sanity check for valid response times (less than 30 days)
                            if (responseMs >= 0 && responseMs < 30 * 24 * 60 * 60 * 1000) {
                                stageTotalResponseTime += responseMs;
                                responsePairsCount++;

                                if (msg.isFromIA) {
                                    stageTotalResTimeIA += responseMs;
                                    stageResCountIA++;
                                } else {
                                    stageTotalResTimeHuman += responseMs;
                                    stageResCountHuman++;
                                }
                            }
                            lastInboundTime = null; // Reset to look for next inbound
                        }
                    });

                    // Add Contact's overall Conversation Duration
                    if (contactEffectiveTime > 0) {
                        stageTotalConversationTime += contactEffectiveTime;
                        stageConversationCount++;
                    }

                    // Extract Metadata for Unreplied Leads
                    if (contact._count.messages > 0) {
                        globalUnrepliedContacts.push({
                            id: contact.id,
                            name: contact.name,
                            phone: contact.phone,
                            funnelName: f.name,
                            stageName: stage.name,
                            timeInStage: Math.floor(retentionMs / (1000 * 60 * 60 * 24)) // days
                        });
                    }
                });

                // Calculate averages in Minutes
                const avgMinsRes = responsePairsCount > 0 ? (stageTotalResponseTime / responsePairsCount) / (1000 * 60) : 0;
                const avgDaysRetention = count > 0 ? (stageTotalRetentionTime / count) / (1000 * 60 * 60 * 24) : 0;
                const avgConversationLengthMins = stageConversationCount > 0 ? (stageTotalConversationTime / stageConversationCount) / (1000 * 60) : 0;
                const peakHoursMap = stagePeakHoursArray.map((c, hour) => ({ hour: `${hour.toString().padStart(2, '0')}:00`, count: c }));

                return {
                    id: stage.id,
                    name: stage.name,
                    count: count,
                    unansweredCount: unanswered,
                    avgResponseTimeMins: Math.round(avgMinsRes),
                    avgTimeInStageDays: parseFloat(avgDaysRetention.toFixed(1)),
                    avgConversationLengthMins: Math.round(avgConversationLengthMins),
                    iaMessages: stageIAMessages,
                    crmMessages: stageCRMMessages,
                    stagePeakHours: peakHoursMap,
                    _internalTotalResTimeIA: stageTotalResTimeIA,
                    _internalResCountIA: stageResCountIA,
                    _internalTotalResTimeHuman: stageTotalResTimeHuman,
                    _internalResCountHuman: stageResCountHuman
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

        // Compute Weekly Peak Hours (Last 4 weeks)
        const twentyEightDaysAgo = new Date();
        twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

        const recentMessagesWeekly = await prisma.message.findMany({
            where: { contact: { userId: ownerId }, timestamp: { gte: twentyEightDaysAgo } },
            select: { timestamp: true }
        });

        const weeklyPeakArray = new Array(4).fill(0);
        const nowMs = Date.now();
        recentMessagesWeekly.forEach((m: any) => {
            const diffDays = Math.floor((nowMs - m.timestamp.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 7) weeklyPeakArray[3]++;
            else if (diffDays < 14) weeklyPeakArray[2]++;
            else if (diffDays < 21) weeklyPeakArray[1]++;
            else if (diffDays < 28) weeklyPeakArray[0]++;
        });

        const weeklyPeakHours = [
            { week: 'Hace 3 Semanas', count: weeklyPeakArray[0] },
            { week: 'Hace 2 Semanas', count: weeklyPeakArray[1] },
            { week: 'Semana Pasada', count: weeklyPeakArray[2] },
            { week: 'Esta Semana', count: weeklyPeakArray[3] }
        ];

        // Compute Unreplied Peak hours (Chats ignorados)
        const unrepliedMessagesQuery = await prisma.message.findMany({
            where: { contact: { userId: ownerId }, direction: 'inbound', isReadByAgent: false },
            select: { timestamp: true }
        });
        const unrepliedPeakHoursArray = new Array(24).fill(0);
        unrepliedMessagesQuery.forEach((m: any) => {
            unrepliedPeakHoursArray[m.timestamp.getHours()]++;
        });
        const unrepliedPeakHours = unrepliedPeakHoursArray.map((count, hour) => ({
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

        // Global Math for IA vs CRM and Conversations Length
        const globalIAMessages = await prisma.message.count({ where: { contact: { userId: ownerId }, direction: 'outbound', isFromIA: true } });
        const globalCRMMessages = await prisma.message.count({ where: { contact: { userId: ownerId }, direction: 'outbound', isFromIA: false } });

        let totalGlobalConversationTime = 0;
        let globalConversationCount = 0;
        let totalGlobalResponseTimeIA = 0;
        let globalResponseCountIA = 0;
        let totalGlobalResponseTimeHuman = 0;
        let globalResponseCountHuman = 0;

        funnelStats.forEach((f: any) => f.stages.forEach((s: any) => {
            totalGlobalConversationTime += s.avgConversationLengthMins * s.count;
            globalConversationCount += s.count;

            // Reconstruct aggregates using the totals calculated before mapping
            totalGlobalResponseTimeIA += s._internalTotalResTimeIA || 0;
            globalResponseCountIA += s._internalResCountIA || 0;
            totalGlobalResponseTimeHuman += s._internalTotalResTimeHuman || 0;
            globalResponseCountHuman += s._internalResCountHuman || 0;
        }));

        const globalAvgConversationLengthMins = globalConversationCount > 0 ? Math.round(totalGlobalConversationTime / globalConversationCount) : 0;
        const globalAvgResTimeIA = globalResponseCountIA > 0 ? Math.round((totalGlobalResponseTimeIA / globalResponseCountIA) / (1000 * 60)) : 0;
        const globalAvgResTimeHuman = globalResponseCountHuman > 0 ? Math.round((totalGlobalResponseTimeHuman / globalResponseCountHuman) / (1000 * 60)) : 0;

        return NextResponse.json({
            kpis: {
                totalLeads,
                leadsThisMonth,
                messagesThisMonth,
                unrepliedMessages,
                newLeadsToday,
                globalAvgConversationLengthMins,
                globalAvgResTimeIA,
                globalAvgResTimeHuman,
                globalIAMessages,
                globalCRMMessages
            },
            leadsTrend,
            channelPerformance: [],
            leadSources,
            funnelStats,
            peakHours,
            weeklyPeakHours,
            unrepliedPeakHours,
            unrepliedLeadsList: globalUnrepliedContacts,
            recentMessages: formattedRecentMessages
        });

    } catch (error) {
        console.error("Error fetching metrics:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
