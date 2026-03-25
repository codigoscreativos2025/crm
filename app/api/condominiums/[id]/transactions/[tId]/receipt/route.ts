import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function POST(req: NextRequest, { params }: { params: { id: string, tId: string } }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const condoId = parseInt(params.id);
    const tId = parseInt(params.tId);

    if (isNaN(condoId) || isNaN(tId)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file received." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const originalName = file.name.replaceAll(" ", "_");
        const fileName = `${uuidv4()}-${originalName}`;

        // Ensure directory exists
        await mkdir(UPLOAD_DIR, { recursive: true });

        // Save file
        await writeFile(path.join(UPLOAD_DIR, fileName), buffer);

        const fileUrl = `/api/files/${fileName}`;

        // Update the transaction
        await prisma.transaction.update({
            where: { id: tId },
            data: {
                receiptUrl: fileUrl,
                receiptType: file.type
            }
        });

        // Add to history logs
        const { createCondoLog } = await import('../../../logHelper');
        await createCondoLog(condoId, `Comprobante subido para la transacción #${tId}`, "CRM");

        return NextResponse.json({
            success: true,
            url: fileUrl
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed." }, { status: 500 });
    }
}
