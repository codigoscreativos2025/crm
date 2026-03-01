import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import mime from "mime"; // You might need 'mime' package or just basic mapping. 

// Quick mime mapping fallback
const getMimeType = (filename: string) => {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.gif') return 'image/gif';
    if (ext === '.pdf') return 'application/pdf';
    return 'application/octet-stream';
};

export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
    const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
    const filename = params.filename;
    const filePath = path.join(UPLOAD_DIR, filename);

    try {
        await stat(filePath); // Check exists
        const fileBuffer = await readFile(filePath);
        const contentType = getMimeType(filename);

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
}
