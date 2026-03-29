import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest, { params }: { params: { id: string, residentId: string, paymentId: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const condoId = parseInt(params.id);
    const residentId = parseInt(params.residentId);
    const transactionId = parseInt(params.paymentId);

    if (isNaN(condoId) || isNaN(residentId) || isNaN(transactionId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId }
        });

        if (!transaction || transaction.residentId !== residentId || transaction.condominiumId !== condoId) {
            return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
        }

        const contentType = req.headers.get("content-type") || "";
        let receiptUrl: string;
        let receiptType: string;

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("file") as File | null;
            const urlFromForm = formData.get("receiptUrl") as string | null;

            if (file) {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                const uploadsDir = join(process.cwd(), "public", "uploads", "receipts");
                await mkdir(uploadsDir, { recursive: true });

                const extension = file.name.split(".").pop() || "pdf";
                const filename = `receipt_${residentId}_${transactionId}_${Date.now()}.${extension}`;
                const filepath = join(uploadsDir, filename);

                await writeFile(filepath, buffer);
                receiptUrl = `/uploads/receipts/${filename}`;
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

        const updatedTransaction = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                receiptUrl,
                receiptType
            }
        });

        return NextResponse.json(updatedTransaction);

    } catch (e) {
        console.error("Error uploading receipt:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}