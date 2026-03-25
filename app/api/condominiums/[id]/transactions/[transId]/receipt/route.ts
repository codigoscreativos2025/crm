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

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = path.extname(file.name) || '';
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        const fileName = `receipt_${transId}_${uniqueSuffix}`;

        // Asegurar que exista el directorio uploads/receipts
        const uploadDir = path.join(process.cwd(), 'uploads', 'receipts');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);

        // Actualizar transacción
        const fileUrl = `/uploads/receipts/${fileName}`; // Asumiendo que /uploads está mapeado en Next.js public/ o routeado

        const updated = await prisma.transaction.update({
            where: { id: transId },
            data: {
                receiptUrl: fileUrl,
                receiptType: file.type
            }
        });

        return NextResponse.json({ success: true, url: fileUrl, transaction: updated });

    } catch (error) {
        console.error("Error uploading receipt:", error);
        return NextResponse.json({ error: "Error interno al subir archivo" }, { status: 500 });
    }
}
