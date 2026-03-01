import prisma from "@/lib/prisma";

export async function authenticateApiKey(authorizationHeader: string | null) {
    if (!authorizationHeader) {
        return null;
    }

    // Expecting "Bearer <API_KEY>" or just "<API_KEY>"
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
