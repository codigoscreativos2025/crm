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

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        // Verify contact belongs to user OR user is ADMIN
        const contact = await prisma.contact.findUnique({
            where: {
                id: parseInt(contactId),
            },
        });

        if (!contact) {
            return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
        }

        // Authorization check: Must be Owner OR Admin
        if (contact.userId !== userId && user?.role !== 'ADMIN') {
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

        // Verify contact
        const contact = await prisma.contact.findUnique({
            where: {
                id: parseInt(contactId),
                userId: parseInt(session.user.id),
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
                fileName
            },
        });

        // Trigger n8n Webhook (Fire and Forget)
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

        if (n8nWebhookUrl) {
            fetch(n8nWebhookUrl, {
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
            }).catch(err => console.error("Error sending to n8n:", err));
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

    if (!contactId) {
        return NextResponse.json({ error: "ID de contacto requerido" }, { status: 400 });
    }

    try {
        // Verify ownership
        const contact = await prisma.contact.findFirst({
            where: {
                id: parseInt(contactId),
                userId: parseInt(session.user.id)
            }
        });

        if (!contact) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

        await prisma.message.deleteMany({
            where: { contactId: parseInt(contactId) }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error deleting messages" }, { status: 500 });
    }
}
