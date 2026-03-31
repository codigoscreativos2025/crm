import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Get notifications for the last month
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const notifications = await prisma.notification.findMany({
            where: {
                userId,
                createdAt: { gte: thirtyDaysAgo }
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit
        });

        const unreadCount = await prisma.notification.count({
            where: {
                userId,
                read: false,
                createdAt: { gte: thirtyDaysAgo }
            }
        });

        return NextResponse.json({
            notifications,
            unreadCount,
            total: notifications.length
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const body = await req.json();
        const { notificationId, markAllRead } = body;

        if (markAllRead) {
            await prisma.notification.updateMany({
                where: { userId, read: false },
                data: { read: true }
            });
            return NextResponse.json({ success: true, message: "Todas las notificaciones marcadas como leídas" });
        }

        if (notificationId) {
            await prisma.notification.update({
                where: { id: notificationId, userId },
                data: { read: true }
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "ID de notificación requerido" }, { status: 400 });
    } catch (error) {
        console.error("Error updating notification:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}