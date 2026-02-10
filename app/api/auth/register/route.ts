import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Correo y contraseña son requeridos" },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "El usuario ya existe" },
                { status: 400 }
            );
        }

        // Generate a random API Key
        const apiKey = `key_${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`;

        const user = await prisma.user.create({
            data: {
                email,
                password, // Note: In production, hash this password!
                apiKey,
            },
        });

        // Create default Funnel for the user
        const funnel = await prisma.funnel.create({
            data: {
                name: "Ventas por Defecto",
                userId: user.id,
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

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                apiKey: user.apiKey,
            },
        });
    } catch (error) {
        console.error("Error registration:", error);
        return NextResponse.json(
            { error: "Error al registrar usuario" },
            { status: 500 }
        );
    }
}
