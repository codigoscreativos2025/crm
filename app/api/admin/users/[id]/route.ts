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
        const { email, username, password, apiKey, metricsEnabled, canManageUsers, canEditTemplates, canExportData, isActive, disabledMessage, n8nWebhookUrl } = body;

        const updateData: any = {};

        if (email !== undefined) updateData.email = email;
        if (username !== undefined) updateData.username = username;
        if (apiKey) updateData.apiKey = apiKey;
        if (typeof metricsEnabled === 'boolean') updateData.metricsEnabled = metricsEnabled;
        if (typeof canManageUsers === 'boolean') updateData.canManageUsers = canManageUsers;
        if (typeof canEditTemplates === 'boolean') updateData.canEditTemplates = canEditTemplates;
        if (typeof canExportData === 'boolean') updateData.canExportData = canExportData;
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

        // Check if username is already taken
        if (username) {
            const existingUser = await prisma.user.findUnique({
                where: { username }
            });
            if (existingUser && existingUser.id !== targetUserId) {
                return NextResponse.json({ error: "El nombre de usuario ya está en uso" }, { status: 400 });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: updateData,
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                apiKey: true,
                metricsEnabled: true,
                canManageUsers: true,
                canEditTemplates: true,
                canExportData: true,
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
