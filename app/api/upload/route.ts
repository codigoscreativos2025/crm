import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

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
