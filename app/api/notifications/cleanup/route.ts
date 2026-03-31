import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        // Delete notifications older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await prisma.notification.deleteMany({
            where: {
                createdAt: { lt: thirtyDaysAgo }
            }
        });

        return NextResponse.json({ 
            success: true, 
            deleted: result.count,
            message: `Se eliminaron ${result.count} notificaciones antiguas` 
        });
    } catch (error) {
        console.error("Error cleaning up notifications:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}