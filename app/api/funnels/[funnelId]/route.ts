import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function DELETE(
    request: Request,
    { params }: { params: { funnelId: string } }
) {
    try {
        const session = await auth();
        if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const funnelId = parseInt(params.funnelId);

        // Delete the funnel. Since stages have onDelete: Cascade, they will be deleted automatically.
        // Contacts in those stages will have their stageId set to null (onDelete: SetNull).
        await prisma.funnel.delete({
            where: { id: funnelId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting funnel:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
