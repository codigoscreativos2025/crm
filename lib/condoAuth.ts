import prisma from "@/lib/prisma";
import { auth } from "@/auth";

interface AuthResult {
    ownerId: number;
    userId: number;
    isAdmin: boolean;
    error?: string;
}

/**
 * Autentica usando sesión NextAuth O API Key.
 * Para endpoints de condominios que necesitan acceso externo (n8n, integraciones).
 */
export async function authenticateCondoRequest(request: Request): Promise<AuthResult> {
    // 1. Intentar con sesión NextAuth
    const session = await auth();
    if (session?.user?.id) {
        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true, role: true }
        });
        
        return {
            ownerId: user?.parentId || userId,
            userId,
            isAdmin: user?.role === 'ADMIN'
        };
    }

    // 2. Intentar con API Key desde header
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
        const token = authHeader.startsWith("Bearer ") 
            ? authHeader.split(" ")[1] 
            : authHeader;

        if (token) {
            const user = await prisma.user.findUnique({
                where: { apiKey: token },
                select: { id: true, parentId: true, role: true }
            });

            if (user) {
                return {
                    ownerId: user.parentId || user.id,
                    userId: user.id,
                    isAdmin: user.role === 'ADMIN'
                };
            }
        }
    }

    // 3. Intentar con query param userApiKey (para compatibilidad)
    const url = new URL(request.url);
    const apiKeyFromQuery = url.searchParams.get("userApiKey");
    if (apiKeyFromQuery) {
        const user = await prisma.user.findUnique({
            where: { apiKey: apiKeyFromQuery },
            select: { id: true, parentId: true, role: true }
        });

        if (user) {
            return {
                ownerId: user.parentId || user.id,
                userId: user.id,
                isAdmin: user.role === 'ADMIN'
            };
        }
    }

    return {
        ownerId: 0,
        userId: 0,
        isAdmin: false,
        error: "No autorizado. Proporciona sesión válida o API Key."
    };
}

/**
 * Valida que el usuario tenga acceso al condominio específico.
 */
export async function validateCondoAccess(condoId: number, ownerId: number): Promise<boolean> {
    const condo = await prisma.condominium.findUnique({
        where: { id: condoId },
        select: { userId: true }
    });

    return condo?.userId === ownerId;
}

/**
 * Autentica usando solo API Key (para webhooks v1).
 */
export async function authenticateApiKey(authorizationHeader: string | null) {
    if (!authorizationHeader) {
        return null;
    }

    const token = authorizationHeader.startsWith("Bearer ")
        ? authorizationHeader.split(" ")[1]
        : authorizationHeader;

    if (!token) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { apiKey: token },
        });
        return user;
    } catch (error) {
        console.error("Auth Error:", error);
        return null;
    }
}