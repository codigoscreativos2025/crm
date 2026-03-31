import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const body = await req.json();
        const { plan } = body;

        const validPlans = ['FREELANCE', 'PRO', 'EMBAJADOR'];
        if (!validPlans.includes(plan)) {
            return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
        }

        // Update user's selected plan (pending payment)
        await prisma.user.update({
            where: { id: userId },
            data: { 
                plan: plan,
            } as any
        });

        return NextResponse.json({ 
            success: true, 
            plan,
            message: "Plan seleccionado. Procede al pago." 
        });
    } catch (error) {
        console.error("Error selecting plan:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}