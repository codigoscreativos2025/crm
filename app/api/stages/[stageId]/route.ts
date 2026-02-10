import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PUT Update Stage (Name/Order)
export async function PUT(req: NextRequest, { params }: { params: { stageId: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { name, order } = body;

        const stage = await prisma.stage.update({
            where: { id: parseInt(params.stageId) },
            data: { name, order }
        });

        return NextResponse.json(stage);
    } catch (error) {
        return NextResponse.json({ error: "Error updating stage" }, { status: 500 });
    }
}

// DELETE Stage
export async function DELETE(req: NextRequest, { params }: { params: { stageId: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // Check if stage has contacts
        const count = await prisma.contact.count({
            where: { stageId: parseInt(params.stageId) }
        });

        if (count > 0) {
            return NextResponse.json({ error: "Cannot delete stage with contacts" }, { status: 400 });
        }

        await prisma.stage.delete({
            where: { id: parseInt(params.stageId) }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error deleting stage" }, { status: 500 });
    }
}
