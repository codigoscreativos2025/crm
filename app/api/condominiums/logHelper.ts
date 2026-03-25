import prisma from '@/lib/prisma';

export async function createCondoLog(
    condominiumId: number,
    action: string,
    source: 'CRM' | 'WHATSAPP' = 'CRM',
    details?: string
) {
    try {
        await prisma.condominiumLog.create({
            data: {
                condominiumId,
                action,
                source,
                details
            }
        });
    } catch (e) {
        console.error('Failed to create condo log', e);
    }
}
