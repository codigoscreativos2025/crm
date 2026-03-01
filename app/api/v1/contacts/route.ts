import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/auth";

// GET /api/v1/contacts?userApiKey=xxx
// Opcional: &phone=+521... para buscar un lead específico
export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const userApiKey = searchParams.get("userApiKey");
    const phone = searchParams.get("phone");

    if (!userApiKey) {
        return NextResponse.json({ error: "userApiKey requerida" }, { status: 400 });
    }

    const user = await authenticateApiKey(userApiKey);
    if (!user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const where: any = { userId: user.id };
        if (phone) {
            where.phone = phone;
        }

        const contacts = await prisma.contact.findMany({
            where,
            include: {
                stage: {
                    include: {
                        funnel: true
                    }
                },
                messages: {
                    orderBy: { timestamp: "desc" },
                    take: 1,
                }
            },
            orderBy: { id: "desc" }
        });

        // Flatten response for easy use in n8n
        const result = contacts.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            stage: c.stage ? {
                id: c.stage.id,
                name: c.stage.name,
                order: c.stage.order,
            } : null,
            funnel: c.stage?.funnel ? {
                id: c.stage.funnel.id,
                name: c.stage.funnel.name,
            } : null,
            lastMessage: c.messages[0]?.body || null,
            lastMessageAt: c.messages[0]?.timestamp || null,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching contacts:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
