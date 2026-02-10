import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userApiKey, contactPhone, message, timestamp } = body;

        // 1. Authenticate Request
        const user = await authenticateApiKey(userApiKey);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!contactPhone || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 2. Find Contact (Should exist, but handle if not)
        let contact = await prisma.contact.findUnique({
            where: {
                userId_phone: {
                    userId: user.id,
                    phone: contactPhone,
                },
            },
        });

        if (!contact) {
            // If sending a message to a new contact (outbound initiated), create it
            contact = await prisma.contact.create({
                data: {
                    phone: contactPhone,
                    userId: user.id
                }
            })
        }

        // 3. Save Message
        const newMessage = await prisma.message.create({
            data: {
                body: message,
                direction: "outbound", // Sent by Agent/Us
                status: "sent",
                timestamp: timestamp ? (typeof timestamp === 'number' && timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp)) : new Date(),
                contactId: contact.id,
            },
        });

        return NextResponse.json({ success: true, messageId: newMessage.id });
    } catch (error) {
        console.error("Error in outgoing webhook:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
