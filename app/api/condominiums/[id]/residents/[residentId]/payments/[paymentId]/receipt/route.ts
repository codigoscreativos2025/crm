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
    const paymentId = parseInt(params.paymentId);

    if (isNaN(condoId) || isNaN(residentId) || isNaN(paymentId)) {
        return NextResponse.json({ error: "ID Inválido" }, { status: 400 });
    }

    try {
        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId }
        });

        if (!payment || payment.residentId !== residentId || payment.condominiumId !== condoId) {
            return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadsDir = join(process.cwd(), "public", "uploads", "receipts");
        await mkdir(uploadsDir, { recursive: true });

        const extension = file.name.split(".").pop() || "pdf";
        const filename = `receipt_${residentId}_${paymentId}_${Date.now()}.${extension}`;
        const filepath = join(uploadsDir, filename);

        await writeFile(filepath, buffer);

        const fileUrl = `/uploads/receipts/${filename}`;

        const updatedPayment = await prisma.payment.update({
            where: { id: paymentId },
            data: {
                receiptUrl: fileUrl,
                receiptType: file.type
            }
        });

        return NextResponse.json(updatedPayment);

    } catch (e) {
        console.error("Error uploading receipt:", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}