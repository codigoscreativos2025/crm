import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET stages for a funnel
export async function GET(req: NextRequest, { params }: { params: { funnelId: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stages = await prisma.stage.findMany({
        where: { funnelId: parseInt(params.funnelId) },
        orderBy: { order: 'asc' }
    });

    return NextResponse.json(stages);
}

// POST create new stage in funnel
export async function POST(req: NextRequest, { params }: { params: { funnelId: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { name, order } = body;

        const stage = await prisma.stage.create({
            data: {
                name,
                order: order || 99,
                funnelId: parseInt(params.funnelId)
            }
        });

        return NextResponse.json(stage);
    } catch (error) {
        return NextResponse.json({ error: "Error creating stage" }, { status: 500 });
    }
}
