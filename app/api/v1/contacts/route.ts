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
        const result = contacts.map((c: any) => ({
            id: c.id,
            name: c.name,
            nameConfirmed: c.nameConfirmed,
            phone: c.phone,
            aiDisabled: c.aiDisabledUntil ? c.aiDisabledUntil.getTime() > Date.now() : false,
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

// PATCH /api/v1/contacts?phone=...&userApiKey=...
export async function PATCH(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const userApiKey = searchParams.get("userApiKey");
    const phone = searchParams.get("phone");

    if (!userApiKey) {
        return NextResponse.json({ error: "userApiKey requerida" }, { status: 400 });
    }

    if (!phone) {
        return NextResponse.json({ error: "phone requerido en la URL" }, { status: 400 });
    }

    const user = await authenticateApiKey(userApiKey);
    if (!user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { stageId, disableAI, name } = body;

        const targetContact = await prisma.contact.findUnique({
            where: {
                userId_phone: {
                    userId: user.parentId || user.id, // Permite encontrar contactos compartidos con el principal
                    phone: phone
                }
            }
        });

        if (!targetContact) {
            return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
        }

        const updateData: any = {};

        if (stageId !== undefined && stageId !== null) {
            const parsedStageId = parseInt(String(stageId).trim(), 10);
            if (isNaN(parsedStageId)) {
                return NextResponse.json({ error: "stageId debe ser un número válido" }, { status: 400 });
            }

            // Verify stage belongs to this user's funnel
            const stage = await prisma.stage.findFirst({
                where: { id: parsedStageId, funnel: { userId: user.parentId || user.id } }
            });
            if (!stage) {
                return NextResponse.json({ error: "Etapa inválida o no pertenece al usuario" }, { status: 400 });
            }
            updateData.stageId = parsedStageId;
        }

        if (name !== undefined && name !== null) {
            updateData.name = String(name).trim();
            updateData.nameConfirmed = true;
        }

        if (disableAI !== undefined && disableAI !== null) {
            let isDisableAITrue = false;
            if (typeof disableAI === 'string') {
                isDisableAITrue = disableAI.trim().toLowerCase() === 'true';
            } else {
                isDisableAITrue = Boolean(disableAI);
            }

            if (isDisableAITrue) {
                const pauseTime = user.aiDeactivationMinutes || 60;
                const until = new Date();
                until.setMinutes(until.getMinutes() + pauseTime);
                updateData.aiDisabledUntil = until;
            } else {
                updateData.aiDisabledUntil = null;
            }
        }

        const updatedContact = await prisma.contact.update({
            where: { id: targetContact.id },
            data: updateData
        });

        return NextResponse.json({
            id: updatedContact.id,
            phone: updatedContact.phone,
            name: updatedContact.name,
            nameConfirmed: updatedContact.nameConfirmed,
            aiDisabledUntil: updatedContact.aiDisabledUntil,
            stageId: updatedContact.stageId
        });

    } catch (error) {
        console.error("Error patching contact:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
