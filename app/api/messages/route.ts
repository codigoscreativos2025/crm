import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const contactId = searchParams.get('contactId');

    if (!contactId) {
        return NextResponse.json({ error: "ID de contacto es requerido" }, { status: 400 });
    }

    try {
        const userId = parseInt(session.user.id);

        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true, role: true }
        });
        const ownerId = currentUser?.parentId || userId;

        // Verify contact belongs to tenant OR user is ADMIN
        const contact = await prisma.contact.findUnique({
            where: {
                id: parseInt(contactId),
            },
        });

        if (!contact) {
            return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
        }

        // Authorization check: Must be Owner/Tenant Agent OR Admin
        if (contact.userId !== ownerId && currentUser?.role !== 'ADMIN') {
            return NextResponse.json({ error: "No autorizado para ver este chat" }, { status: 403 });
        }

        const messages = await prisma.message.findMany({
            where: {
                contactId: parseInt(contactId),
            },
            orderBy: {
                timestamp: 'asc',
            },
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { contactId, body: messageBody, direction, status, fileUrl, fileType, fileName } = body;

        if (!contactId || !messageBody) {
            return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }

        const userId = parseInt(session.user.id);
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true, aiDeactivationMinutes: true }
        });
        const ownerId = currentUser?.parentId || userId;

        // Verify contact belongs to tenant
        const contact = await prisma.contact.findUnique({
            where: {
                id: parseInt(contactId),
                userId: ownerId,
            },
        });

        if (!contact) {
            return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
        }

        // Save Message to DB
        const newMessage = await prisma.message.create({
            data: {
                body: messageBody,
                direction: direction || 'outbound',
                status: status || 'sent',
                contactId: parseInt(contactId),
                fileUrl,
                fileType,
                fileName,
                isReadByAgent: true, // Agent is actively sending this from the UI
            },
        });

        // Auto-pause AI for this contact since a human replied
        const pauseTime = currentUser?.aiDeactivationMinutes || 60;
        const until = new Date();
        until.setMinutes(until.getMinutes() + pauseTime);

        // Calculate if we need to insert a system message for AI_DISABLED
        // If it was already disabled, skip adding noise, or add it anyway to update the expiration.
        // We will just add it if contact.aiDisabledUntil is invalid or in the past
        let shouldLogDisable = false;
        if (!contact.aiDisabledUntil || new Date(contact.aiDisabledUntil).getTime() < Date.now()) {
            shouldLogDisable = true;
        }

        await prisma.contact.update({
            where: { id: parseInt(contactId) },
            data: { aiDisabledUntil: until }
        });

        if (shouldLogDisable) {
            await prisma.message.create({
                data: {
                    body: "IA_DISABLED",
                    direction: "system",
                    status: "sent",
                    contactId: parseInt(contactId),
                    fileName: until.toISOString(), // Store the exact expiration time here
                    isReadByAgent: true,
                }
            });
        }

        // Trigger n8n Webhook (Fire and Forget)
        const userWithWebhook = await prisma.user.findUnique({
            where: { id: parseInt(session.user.id) },
            select: { n8nWebhookUrl: true }
        });
        const n8nWebhookUrl = userWithWebhook?.n8nWebhookUrl || process.env.N8N_WEBHOOK_URL;

        if (n8nWebhookUrl) {
            try {
                await fetch(n8nWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messageId: newMessage.id,
                        message: messageBody,
                        contactPhone: contact.phone,
                        contactName: contact.name,
                        direction: 'outbound',
                        timestamp: newMessage.timestamp,
                        userId: session.user.id,
                        userEmail: session.user.email,
                        fileUrl: fileUrl ? `${process.env.NEXTAUTH_URL || ''}${fileUrl}` : undefined,
                        fileType,
                        fileName
                    })
                });
            } catch (err) {
                console.error("Error sending to n8n:", err);
            }
        }

        return NextResponse.json(newMessage);

    } catch (error) {
        console.error("Error sending message:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const contactId = searchParams.get('contactId');
    const messageId = searchParams.get('messageId');

    if (!contactId && !messageId) {
        return NextResponse.json({ error: "ID de contacto o mensaje requerido" }, { status: 400 });
    }

    try {
        const userId = parseInt(session.user.id);
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = currentUser?.parentId || userId;

        if (messageId) {
            // Delete single message
            const message = await prisma.message.findUnique({
                where: { id: parseInt(messageId) },
                include: { contact: true }
            });

            if (!message) return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });

            // Verify ownership against tenant
            if (message.contact.userId !== ownerId) {
                return NextResponse.json({ error: "No autorizado" }, { status: 403 });
            }

            await prisma.message.delete({
                where: { id: parseInt(messageId) }
            });

            return NextResponse.json({ success: true, deletedId: messageId });

        } else if (contactId) {
            // Verify ownership
            const contact = await prisma.contact.findFirst({
                where: {
                    id: parseInt(contactId),
                    userId: ownerId
                }
            });

            if (!contact) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

            await prisma.message.deleteMany({
                where: { contactId: parseInt(contactId) }
            });

            return NextResponse.json({ success: true });
        }


    } catch (error) {
        return NextResponse.json({ error: "Error deleting messages" }, { status: 500 });
    }
}
