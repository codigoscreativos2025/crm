import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const adminId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({ where: { id: adminId } });
        if (user?.role !== 'ADMIN') return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const templateId = parseInt(params.id);
        const { name, content } = await req.json();

        const updatedTemplate = await prisma.adminMessageTemplate.update({
            where: { id: templateId },
            data: { name, content }
        });

        return NextResponse.json(updatedTemplate);
    } catch (error) {
        console.error("Error updating admin template:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const adminId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({ where: { id: adminId } });
        if (user?.role !== 'ADMIN') return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const templateId = parseInt(params.id);

        await prisma.adminMessageTemplate.delete({
            where: { id: templateId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting admin template:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
