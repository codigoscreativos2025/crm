import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(session.user.id) },
            select: {
                id: true,
                email: true,
                role: true,
                defaultFunnelId: true,
                defaultStageId: true,
                aiDeactivationMinutes: true,
                metricsEnabled: true
            }
        });
        return NextResponse.json({ user });
    } catch (error) {
        return NextResponse.json({ error: "Error fetching profile" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { password, defaultFunnelId, defaultStageId, aiDeactivationMinutes } = body;

        const updateData: any = {};

        if (password) {
            if (password.length < 6) {
                return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
            }
            updateData.password = password; // In prod, hash this!
        }

        if (aiDeactivationMinutes !== undefined) {
            updateData.aiDeactivationMinutes = parseInt(aiDeactivationMinutes);
        }

        if (defaultStageId !== undefined) {
            if (defaultStageId === null || defaultStageId === "") {
                updateData.defaultStageId = null;
            } else {
                updateData.defaultStageId = Number(defaultStageId);
            }
        }

        if (defaultFunnelId !== undefined) {
            // Validate it belongs to the user or allow resetting to null
            if (defaultFunnelId === null || defaultFunnelId === "") {
                updateData.defaultFunnelId = null;
            } else {
                const funnel = await prisma.funnel.findUnique({ where: { id: Number(defaultFunnelId) } });
                if (funnel?.userId === parseInt(session.user.id)) {
                    updateData.defaultFunnelId = Number(defaultFunnelId);
                } else {
                    return NextResponse.json({ error: "Invalid funnel" }, { status: 400 });
                }
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No valid data to update" }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: parseInt(session.user.id) },
            data: updateData
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error updating profile" }, { status: 500 });
    }
}
