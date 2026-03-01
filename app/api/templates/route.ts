import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userId = parseInt(session.user.id);
        const templates = await prisma.messageTemplate.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(templates);
    } catch (error) {
        console.error("Error fetching templates:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userId = parseInt(session.user.id);
        const { name, content } = await req.json();

        if (!name || !content) {
            return NextResponse.json({ error: "Name and content are required" }, { status: 400 });
        }

        const newTemplate = await prisma.messageTemplate.create({
            data: {
                name,
                content,
                userId
            }
        });

        return NextResponse.json(newTemplate, { status: 201 });
    } catch (error) {
        console.error("Error creating template:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
