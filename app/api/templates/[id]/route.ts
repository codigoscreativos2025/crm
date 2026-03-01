import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userId = parseInt(session.user.id);
        const templateId = parseInt(params.id);
        const { name, content } = await req.json();

        // Check ownership
        const template = await prisma.messageTemplate.findUnique({ where: { id: templateId } });
        if (!template || template.userId !== userId) {
            return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
        }

        const updatedTemplate = await prisma.messageTemplate.update({
            where: { id: templateId },
            data: { name, content }
        });

        return NextResponse.json(updatedTemplate);
    } catch (error) {
        console.error("Error updating template:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userId = parseInt(session.user.id);
        const templateId = parseInt(params.id);

        // Check ownership
        const template = await prisma.messageTemplate.findUnique({ where: { id: templateId } });
        if (!template || template.userId !== userId) {
            return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
        }

        await prisma.messageTemplate.delete({
            where: { id: templateId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting template:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
