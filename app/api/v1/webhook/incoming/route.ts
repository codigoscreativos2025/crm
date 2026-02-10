import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userApiKey, contactPhone, contactName, message, timestamp, stageId } = body;

        // 1. Authenticate Request
        const user = await authenticateApiKey(userApiKey);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!contactPhone || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 2. Find or Create Contact
        const contact = await prisma.contact.upsert({
            where: {
                userId_phone: {
                    userId: user.id,
                    phone: contactPhone,
                },
            },
            update: {
                // Update name if provided and previously null, or just keep latest
                name: contactName || undefined,
                stageId: stageId ? parseInt(stageId) : undefined,
            },
            create: {
                phone: contactPhone,
                name: contactName,
                userId: user.id,
            },
        });

        // 3. Save Message
        const newMessage = await prisma.message.create({
            data: {
                body: message,
                direction: "inbound", // Received from User
                status: "received",
                timestamp: timestamp ? (typeof timestamp === 'number' && timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp)) : new Date(), // Handle ISO string or Unix timestamp
                contactId: contact.id,
            },
        });

        return NextResponse.json({ success: true, messageId: newMessage.id });
    } catch (error) {
        console.error("Error in incoming webhook:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
