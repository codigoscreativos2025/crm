import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const adminId = parseInt(session.user.id);
        const currentUser = await prisma.user.findUnique({
            where: { id: adminId },
            select: { role: true }
        });

        if (currentUser?.role !== 'ADMIN') {
            return NextResponse.json({ error: "No autorizado. Solo Super Admins." }, { status: 403 });
        }

        const targetUserId = parseInt(params.id);
        const body = await req.json();
        const { email, password, apiKey, metricsEnabled, isActive, disabledMessage, n8nWebhookUrl } = body;

        const updateData: any = {};

        if (email) updateData.email = email;
        if (apiKey) updateData.apiKey = apiKey;
        if (typeof metricsEnabled === 'boolean') updateData.metricsEnabled = metricsEnabled;
        if (typeof isActive === 'boolean') updateData.isActive = isActive;
        if (disabledMessage !== undefined) updateData.disabledMessage = disabledMessage;
        if (n8nWebhookUrl !== undefined) updateData.n8nWebhookUrl = n8nWebhookUrl;

        // In a real production app, this password should be hashed!
        // For this implementation, we are following the existing pattern of plaintext (as seen in seeded users).
        if (password) {
            updateData.password = password;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No valid data to update" }, { status: 400 });
        }

        // Check if email is already taken by another user
        if (email) {
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });
            if (existingUser && existingUser.id !== targetUserId) {
                return NextResponse.json({ error: "El correo electrónico ya está en uso por otro usuario" }, { status: 400 });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: updateData,
            select: {
                id: true,
                email: true,
                role: true,
                apiKey: true,
                metricsEnabled: true,
                isActive: true,
                disabledMessage: true,
                n8nWebhookUrl: true,
                createdAt: true,
            }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
