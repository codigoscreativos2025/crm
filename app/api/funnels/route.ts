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
            include: { stages: { orderBy: { order: 'asc' } } }
        });
        return NextResponse.json(funnels);
    } catch (error) {
        console.error("Error fetching funnels:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { name } = await req.json();
        if (!name?.trim()) {
            return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
        }

        const funnel = await prisma.funnel.create({
            data: {
                name: name.trim(),
                userId: parseInt(session.user.id),
                stages: {
                    create: [
                        { name: "Nuevo", order: 1 },
                        { name: "En proceso", order: 2 },
                        { name: "Cerrado", order: 3 },
                    ]
                }
            },
            include: { stages: true }
        });

        return NextResponse.json(funnel, { status: 201 });
    } catch (error) {
        console.error("Error creating funnel:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
