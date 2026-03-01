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
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (currentUser?.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized. Super Admins only." }, { status: 403 });
        }

        const templates = await prisma.adminMessageTemplate.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(templates);
    } catch (error) {
        console.error("Error fetching admin templates:", error);
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
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (currentUser?.role !== 'ADMIN') {
            return NextResponse.json({ error: "Unauthorized. Super Admins only." }, { status: 403 });
        }

        const { name, content } = await req.json();

        if (!name || !content) {
            return NextResponse.json({ error: "Name and content are required" }, { status: 400 });
        }

        const newTemplate = await prisma.adminMessageTemplate.create({
            data: { name, content }
        });

        return NextResponse.json(newTemplate, { status: 201 });
    } catch (error) {
        console.error("Error creating admin template:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
