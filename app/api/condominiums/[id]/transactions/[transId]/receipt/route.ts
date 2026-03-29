import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest, { params }: { params: { id: string, transId: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const condoId = parseInt(params.id);
        const transId = parseInt(params.transId);

        if (isNaN(condoId) || isNaN(transId)) {
            return NextResponse.json({ error: "IDs Inválidos" }, { status: 400 });
        }

        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { parentId: true }
        });
        const ownerId = user?.parentId || userId;

        const condo = await prisma.condominium.findUnique({
            where: { id: condoId }
        });

        if (!condo || condo.userId !== ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transId }
        });

        if (!transaction || transaction.condominiumId !== condoId) {
            return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
        }

        const contentType = req.headers.get("content-type") || "";
        let receiptUrl: string;
        let receiptType: string;

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;
            const urlFromForm = formData.get("receiptUrl") as string | null;

            if (file) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const ext = path.extname(file.name) || '';
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
                const fileName = `receipt_${transId}_${uniqueSuffix}`;

                const uploadDir = path.join(process.cwd(), 'uploads', 'receipts');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                const filePath = path.join(uploadDir, fileName);
                await writeFile(filePath, buffer);

                receiptUrl = `/uploads/receipts/${fileName}`;
                receiptType = file.type;
            } else if (urlFromForm) {
                receiptUrl = urlFromForm;
                const ext = urlFromForm.split(".").pop()?.toLowerCase() || "";
                receiptType = ext === "pdf" ? "application/pdf" : `image/${ext}`;
            } else {
                return NextResponse.json({ error: "Debe proporcionar un archivo (file) o una URL interna (receiptUrl)" }, { status: 400 });
            }
        } else {
            const body = await req.json();
            receiptUrl = body.receiptUrl;

            if (!receiptUrl) {
                return NextResponse.json({ error: "Debe proporcionar receiptUrl (URL interna del servidor)" }, { status: 400 });
            }

            if (!receiptUrl.startsWith("/api/files/")) {
                return NextResponse.json({ error: "La URL debe ser una ruta interna del servidor (ej: /api/files/xxx-File.jpg)" }, { status: 400 });
            }

            const ext = receiptUrl.split(".").pop()?.toLowerCase() || "";
            receiptType = ext === "pdf" ? "application/pdf" : `image/${ext}`;
        }

        const updated = await prisma.transaction.update({
            where: { id: transId },
            data: {
                receiptUrl,
                receiptType
            }
        });

        return NextResponse.json({ success: true, url: receiptUrl, transaction: updated });

    } catch (error) {
        console.error("Error uploading receipt:", error);
        return NextResponse.json({ error: "Error interno al subir archivo" }, { status: 500 });
    }
}
