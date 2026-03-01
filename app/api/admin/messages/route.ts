import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await auth();
    // @ts-ignore
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) return NextResponse.json({ error: "Missing contactId" }, { status: 400 });

    try {
        const messages = await prisma.message.findMany({
            where: { contactId: parseInt(contactId) },
            orderBy: { timestamp: 'asc' }
        });
        return NextResponse.json(messages);
    } catch (error) {
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
