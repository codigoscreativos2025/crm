import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const funnels = await prisma.funnel.findMany({
            where: { userId: parseInt(session.user.id) },
            include: { stages: true }
        });
        return NextResponse.json(funnels);
    } catch (error) {
        console.error("Error fetching funnels:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
