import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const userId = parseInt(session.user.id);
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (currentUser?.role !== 'ADMIN') {
            return NextResponse.json({ error: "No autorizado. Solo Super Admins." }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                apiKey: true,
                metricsEnabled: true,
                isActive: true,
                disabledMessage: true,
                n8nWebhookUrl: true,
                parentId: true,
                canManageUsers: true,
                canEditTemplates: true,
                canExportData: true,
                createdAt: true,
            },
            orderBy: {
                id: 'asc'
            }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const userId = parseInt(session.user.id);
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        // Only ADMINs (or users with canManageUsers if implemented later) can create new users
        if (currentUser?.role !== 'ADMIN') {
            return NextResponse.json({ error: "No autorizado. Solo Administradores." }, { status: 403 });
        }

        const body = await req.json();
        const { username, password, role, isActive, metricsEnabled, canManageUsers, canEditTemplates, canExportData } = body;

        if (!username || !password) {
            return NextResponse.json({ error: "Usuario y contraseña son obligatorios" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { username }
        });

        if (existingUser) {
            return NextResponse.json({ error: "El nombre de usuario ya está registrado" }, { status: 400 });
        }

        const apiKey = `key_${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`;

        const newUser = await prisma.user.create({
            data: {
                username,
                password, // Note: Should be hashed in prod
                role: role || 'USER',
                apiKey,
                isActive: isActive ?? true,
                metricsEnabled: metricsEnabled ?? false,
                canManageUsers: canManageUsers ?? false,
                canEditTemplates: canEditTemplates ?? false,
                canExportData: canExportData ?? false,
                parentId: userId // Assign the superadmin as the parent owner
            }
        });

        // Create default Funnel for the new agent, associated to them
        await prisma.funnel.create({
            data: {
                name: "Ventas por Defecto (Agente)",
                userId: newUser.id,
                stages: {
                    create: [
                        { name: "Nuevo Lead", order: 1 },
                        { name: "Contactado", order: 2 },
                        { name: "Interesado", order: 3 },
                        { name: "Cerrado", order: 4 },
                    ]
                }
            }
        });

        return NextResponse.json(newUser, { status: 201 });

    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
