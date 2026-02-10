import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const contacts = await prisma.contact.findMany({
            where: {
                userId: parseInt(session.user.id),
            },
            include: {
                messages: {
                    orderBy: {
                        timestamp: 'desc',
                    },
                    take: 1,
                },
                stage: true,
            },
        });

        // Sort contacts by latest message timestamp
        const sortedContacts = contacts.sort((a: any, b: any) => {
            const dateA = a.messages[0]?.timestamp.getTime() || 0;
            const dateB = b.messages[0]?.timestamp.getTime() || 0;
            return dateB - dateA;
        });

        return NextResponse.json(sortedContacts);
    } catch (error) {
        console.error("Error fetching contacts:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
