import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import prisma from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    secret: process.env.AUTH_SECRET,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        Credentials({
            credentials: {
                email: {},
                password: {},
            },
            authorize: async (credentials) => {
                let user = null;

                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    user = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { email: credentials.email as string },
                                { username: credentials.email as string }
                            ]
                        }
                    })

                    if (!user) {
                        return null;
                    }

                    if (user.password !== credentials.password) {
                        return null;
                    }

                    if (!user.isActive) {
                        throw new Error(user.disabledMessage || "Cuenta desactivada por el administrador.");
                    }

                    if (user.parentId) {
                        const parent = await prisma.user.findUnique({
                            where: { id: user.parentId },
                            select: { isActive: true, disabledMessage: true }
                        });
                        if (parent && !parent.isActive) {
                            throw new Error(parent.disabledMessage || "La cuenta principal ha sido desactivada.");
                        }
                    }

                    return {
                        id: user.id.toString(),
                        name: user.username || user.email || "",
                        email: user.email,
                        role: user.role,
                        plan: (user as any).plan || "FREE",
                    };
                } catch (error: any) {
                    console.error("Auth error:", error.message);
                    throw new Error(error.message || "Error al iniciar sesión");
                }
            },
        }),
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async session({ session, token }) {
            if (session.user && token.sub) {
                // @ts-ignore
                session.user.id = token.sub;
                // @ts-ignore
                session.user.role = token.role || "USER";
                // @ts-ignore
                session.user.plan = token.plan || "FREE";
            }
            return session;
        },
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id;
                // @ts-ignore
                token.role = user.role || "USER";
                // @ts-ignore
                token.plan = user.plan || "FREE";
            }
            
            // If Google login, check/create user in database
            if (account?.provider === "google" && account.providerAccountId) {
                // @ts-ignore
                const googleId = account.providerAccountId;
                
                let dbUser = await prisma.user.findFirst({
                    where: {
                        // @ts-ignore
                        providerId: googleId
                    } as any
                });

                const userEmail = user?.email || token.email;
                
                if (!dbUser && userEmail) {
                    const apiKey = `key_${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`;
                    
                    dbUser = await prisma.user.create({
                        data: {
                            email: userEmail,
                            password: Math.random().toString(36).substring(2),
                            apiKey,
                            provider: "google",
                            providerId: googleId,
                            plan: "FREE",
                        } as any
                    });

                    await prisma.funnel.create({
                        data: {
                            name: "Ventas por Defecto",
                            userId: dbUser.id,
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
                }

                if (dbUser) {
                    token.id = dbUser.id;
                    token.role = dbUser.role;
                    token.plan = (dbUser as any).plan || "FREE";
                }
            }

            return token;
        },
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                return true;
            }
            return true;
        }
    }
});