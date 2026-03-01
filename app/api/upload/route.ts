import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readdir, stat, unlink } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs'; // Required for fs

// Configurable upload directory (Volume mount path in Docker)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Helper to clean up old files
async function cleanupOldFiles() {
    try {
        const files = await readdir(UPLOAD_DIR);
        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        for (const file of files) {
            const filePath = path.join(UPLOAD_DIR, file);
            try {
                const stats = await stat(filePath);
                if (now - stats.mtimeMs > TWENTY_FOUR_HOURS) {
                    await unlink(filePath);
                    console.log(`Deleted old file: ${file}`);
                }
            } catch (err) {
                console.error(`Error checking/deleting file ${file}:`, err);
            }
        }
    } catch (error) {
        // Directory might not exist yet or empty
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file received." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const originalName = file.name.replaceAll(" ", "_"); // Sanitize
        const fileName = `${uuidv4()}-${originalName}`;

        // Ensure directory exists
        await mkdir(UPLOAD_DIR, { recursive: true });

        // Cleanup old files (fire and forget)
        cleanupOldFiles().catch(console.error);

        // Write file
        await writeFile(path.join(UPLOAD_DIR, fileName), buffer);

        // Return URL for the custom file serving route
        const fileUrl = `/api/files/${fileName}`;

        return NextResponse.json({
            success: true,
            url: fileUrl,
            name: originalName,
            type: file.type
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed." }, { status: 500 });
    }
}
