import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const PLAN_PRICES: Record<string, number> = {
    FREELANCE: 30,
    PRO: 160,
    EMBAJADOR: 100,
};

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const body = await req.json();
        const { plan, orderId } = body;

        const validPlans = ['FREELANCE', 'PRO', 'EMBAJADOR'];
        if (!validPlans.includes(plan)) {
            return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
        }

        // In a real app, you would verify the PayPal order here
        // For demo purposes, we just activate the plan

        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        // Update user's plan with activation
        await prisma.user.update({
            where: { id: userId },
            data: { 
                plan: plan,
                planStartedAt: now,
                planExpiresAt: expiresAt,
            } as any
        });

        // Create notification for admin
        const adminUsers = await prisma.user.findMany({
            where: { role: "ADMIN" }
        });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, username: true }
        });

        for (const admin of adminUsers) {
            await prisma.notification.create({
                data: {
                    userId: admin.id,
                    type: "PAYMENT",
                    title: "Nuevo pago recibido",
                    message: `Usuario ${user?.email || user?.username} activó el plan ${plan} ($${PLAN_PRICES[plan]}/mes)`,
                    data: JSON.stringify({ 
                        plan, 
                        amount: PLAN_PRICES[plan],
                        orderId,
                        userId 
                    })
                } as any
            });
        }

        return NextResponse.json({ 
            success: true, 
            plan,
            activatedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            message: "Plan activado correctamente" 
        });
    } catch (error) {
        console.error("Error activating plan:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                plan: true, 
                planStartedAt: true, 
                planExpiresAt: true 
            }
        });

        // @ts-ignore
        const plan = user?.plan || "FREE";
        
        let status = "active";
        if (user?.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
            status = "expired";
        }

        return NextResponse.json({
            // @ts-ignore
            plan: plan,
            // @ts-ignore
            planStartedAt: user?.planStartedAt,
            // @ts-ignore
            planExpiresAt: user?.planExpiresAt,
            status
        });
    } catch (error) {
        console.error("Error getting subscription:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}