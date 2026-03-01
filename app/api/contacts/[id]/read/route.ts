import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const contactId = parseInt(params.id);

        // Verify ownership
        const contact = await prisma.contact.findFirst({
            where: {
                id: contactId,
                userId: parseInt(session.user.id)
            }
        });

        if (!contact) {
            return NextResponse.json({ error: "No encontrado o no autorizado" }, { status: 404 });
        }

        // Update all unread messages for this contact to read
        await prisma.message.updateMany({
            where: {
                contactId: contactId,
                isReadByAgent: false
            },
            data: {
                isReadByAgent: true
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error marking messages as read:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
