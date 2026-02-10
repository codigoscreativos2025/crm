import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    providers: [
        Credentials({
            // You can specify which fields should be submitted, by adding keys to the `credentials` object.
            // e.g. domain, username, password, 2FA token, etc.
            credentials: {
                email: {},
                password: {},
            },
            authorize: async (credentials) => {
                let user = null;

                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // specific logic for authorize
                try {
                    user = await prisma.user.findUnique({
                        where: {
                            email: credentials.email as string
                        }
                    })

                    if (!user) {
                        // No user found, so this is their first attempt to login
                        return null;
                    }

                    // Check password (PLAINTEXT FOR DEMO - USE BCRYPT IN PROD)
                    if (user.password !== credentials.password) {
                        return null;
                    }

                    // Return user object with their profile data
                    return {
                        ...user,
                        id: user.id.toString(),
                    };
                } catch (error) {
                    return null;
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
                // Add user ID to session
                // @ts-ignore
                session.user.id = token.sub;
                // @ts-ignore
                session.user.role = token.role;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                // @ts-ignore
                token.role = user.role;
            }
            return token;
        }
    }
});
