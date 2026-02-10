import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const funnels = await prisma.funnel.findMany({
            where: {
                userId: parseInt(session.user.id),
            },
            include: {
                stages: {
                    orderBy: { order: 'asc' }
                }
            }
        });

        return NextResponse.json(funnels);
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener embudos" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name } = body;

        const funnel = await prisma.funnel.create({
            data: {
                name,
                userId: parseInt(session.user.id),
                stages: {
                    create: [
                        { name: "Etapa 1", order: 1 },
                        { name: "Etapa 2", order: 2 },
                        { name: "Etapa 3", order: 3 },
                    ]
                }
            },
            include: { stages: true }
        });
        return NextResponse.json(funnel);
    } catch (error) {
        return NextResponse.json({ error: "Error al crear embudo" }, { status: 500 });
    }
}
