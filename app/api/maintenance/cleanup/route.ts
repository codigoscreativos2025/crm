import { NextResponse } from "next/server";
import { cleanupOldImages, getCleanupStatus } from "@/lib/image-cleanup";

export async function POST() {
    try {
        const result = await cleanupOldImages();
        return NextResponse.json({
            success: true,
            ...result,
            message: `Se eliminaron ${result.deleted} referencias de imágenes`
        });
    } catch (error) {
        console.error("Cleanup error:", error);
        return NextResponse.json({ error: "Error en la limpieza" }, { status: 500 });
    }
}

export async function GET() {
    const status = getCleanupStatus();
    return NextResponse.json(status);
}
