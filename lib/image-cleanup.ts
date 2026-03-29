import prisma from '@/lib/prisma';
import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

type MessageImageRef = { id: number; fileUrl: string | null; fileName: string | null };

const BATCH_SIZE = 50;
const RETENTION_DAYS = parseInt(process.env.IMAGE_RETENTION_DAYS || '30');
const CLEANUP_INTERVAL_HOURS = parseInt(process.env.CLEANUP_INTERVAL_HOURS || '12');

let isRunning = false;
let lastRunTime = 0;
let cleanupInterval: NodeJS.Timeout | null = null;

async function isFileReferencedInDatabase(fileUrl: string): Promise<boolean> {
    try {
        const transaction = await prisma.transaction.findFirst({
            where: { receiptUrl: fileUrl }
        });

        return !!transaction;
    } catch (err) {
        console.error('[ImageCleanup] Error checking file reference:', err);
        return true;
    }
}

export async function cleanupOldImages(): Promise<{ deleted: number; errors: number }> {
    if (isRunning) {
        console.log('[ImageCleanup] Cleanup already running, skipping...');
        return { deleted: 0, errors: 0 };
    }

    const now = Date.now();
    if (now - lastRunTime < 1000 * 60 * 5) {
        console.log('[ImageCleanup] Too soon since last cleanup, skipping...');
        return { deleted: 0, errors: 0 };
    }

    isRunning = true;
    lastRunTime = now;

    let deleted = 0;
    let errors = 0;

    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

        let hasMore = true;
        let cursor: number | undefined = undefined;

        while (hasMore) {
            const messages: MessageImageRef[] = await prisma.message.findMany({
                where: {
                    fileUrl: { not: null },
                    timestamp: { lt: cutoffDate },
                },
                take: BATCH_SIZE,
                skip: cursor ? 1 : 0,
                cursor: cursor ? { id: cursor } : undefined,
                select: { id: true, fileUrl: true, fileName: true },
                orderBy: { id: 'asc' },
            });

            if (messages.length === 0) {
                hasMore = false;
                break;
            }

            for (const msg of messages) {
                if (msg.fileUrl) {
                    try {
                        if (msg.fileUrl.includes('/receipts/') || msg.fileUrl.startsWith('/api/files/')) {
                            continue;
                        }
                        const filename = msg.fileUrl.split('/').pop();
                        if (filename) {
                            const filePath = path.join(UPLOAD_DIR, filename);
                            const fileStats = await stat(filePath).catch(() => null);
                            if (fileStats) {
                                await unlink(filePath);
                            }
                        }
                    } catch (err) {
                        console.error(`[ImageCleanup] Error deleting file: ${msg.fileUrl}`, err);
                        errors++;
                    }
                }
            }

            const ids = messages.map(m => m.id);
            await prisma.message.updateMany({
                where: { id: { in: ids } },
                data: { fileUrl: null, fileType: null, fileName: null },
            });

            deleted += messages.length;
            cursor = messages[messages.length - 1].id;
            hasMore = messages.length === BATCH_SIZE;
        }

        console.log(`[ImageCleanup] Completed. Deleted ${deleted} image references, ${errors} errors`);
    } catch (err) {
        console.error('[ImageCleanup] Error during cleanup:', err);
        errors++;
    } finally {
        isRunning = false;
    }

    return { deleted, errors };
}

export async function cleanupUploadedFiles(): Promise<{ deleted: number; errors: number }> {
    if (isRunning) {
        console.log('[ImageCleanup] Cleanup already running, skipping...');
        return { deleted: 0, errors: 0 };
    }

    isRunning = true;
    let deleted = 0;
    let errors = 0;

    try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        
        try {
            const files = await readdir(uploadsDir);
            
            for (const file of files) {
                const filePath = path.join(uploadsDir, file);
                const fileStats = await stat(filePath);
                
                if (fileStats.isDirectory()) continue;
                
                const relativePath = `/uploads/${file}`;
                
                const isReferenced = await isFileReferencedInDatabase(relativePath);
                
                if (!isReferenced) {
                    try {
                        await unlink(filePath);
                        deleted++;
                        console.log(`[ImageCleanup] Deleted unused file: ${file}`);
                    } catch (err) {
                        console.error(`[ImageCleanup] Error deleting file ${file}:`, err);
                        errors++;
                    }
                }
            }
        } catch (err) {
            console.log('[ImageCleanup] Uploads directory does not exist or is empty');
        }

        console.log(`[FileCleanup] Completed. Deleted ${deleted} unused files, ${errors} errors`);
    } catch (err) {
        console.error('[FileCleanup] Error during cleanup:', err);
        errors++;
    } finally {
        isRunning = false;
    }

    return { deleted, errors };
}

export function startCleanupScheduler(): void {
    if (cleanupInterval) {
        console.log('[ImageCleanup] Scheduler already running');
        return;
    }

    const intervalMs = CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;
    console.log(`[ImageCleanup] Starting scheduler (every ${CLEANUP_INTERVAL_HOURS}h, retention: ${RETENTION_DAYS} days)`);

    setInterval(async () => {
        console.log('[ImageCleanup] Scheduled cleanup triggered');
        await cleanupOldImages();
    }, intervalMs);
}

export function stopCleanupScheduler(): void {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        console.log('[ImageCleanup] Scheduler stopped');
    }
}

export function getCleanupStatus() {
    return {
        isRunning,
        lastRunTime: lastRunTime ? new Date(lastRunTime).toISOString() : null,
        retentionDays: RETENTION_DAYS,
        intervalHours: CLEANUP_INTERVAL_HOURS,
    };
}
