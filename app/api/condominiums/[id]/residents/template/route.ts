import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { utils, write } from 'xlsx';
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "ID Inválido" }, { status: 400 });

    try {
        const condo = await prisma.condominium.findUnique({ where: { id } });
        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        let dynamicHeaders: string[] = [];
        if (condo.residentFields) {
            try {
                dynamicHeaders = JSON.parse(condo.residentFields);
                if (!Array.isArray(dynamicHeaders)) dynamicHeaders = [];
            } catch(e) {}
        }

        const headers = ['Nombre', 'Teléfono', ...dynamicHeaders];
        const wb = utils.book_new();
        const ws = utils.aoa_to_sheet([headers]);
        utils.book_append_sheet(wb, ws, "Plantilla Residentes");
        
        const buffer = write(wb, { type: 'buffer', bookType: 'xlsx' });

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Disposition': 'attachment; filename="plantilla_residentes.xlsx"',
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }
        });
    } catch (e) {
        console.error("Error creating template", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}