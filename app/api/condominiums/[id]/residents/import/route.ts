import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { authenticateCondoRequest } from "@/lib/condoAuth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateCondoRequest(req);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const condoId = parseInt(params.id);
        if (isNaN(condoId)) return NextResponse.json({ error: "ID de condominio inválido" }, { status: 400 });

        const condo = await prisma.condominium.findUnique({ where: { id: condoId } });

        if (!condo || condo.userId !== auth.ownerId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No se encontró ningún archivo." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Parse excel
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON (header de fila 1)
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
            return NextResponse.json({ error: "El archivo está vacío o no es válido." }, { status: 400 });
        }

        // Obtener teléfonos existentes para validar duplicados
        const existingResidents = await prisma.resident.findMany({
            where: { condominiumId: condoId },
            select: { phone: true }
        });
        const existingPhones = new Set(existingResidents.map(r => String(r.phone).trim()));

        // Obtener contactos del CRM para cruce (opcional)
        const crmContacts = await prisma.contact.findMany({
            where: { userId: auth.ownerId },
            select: { id: true, phone: true }
        });
        const crmPhonesMap = new Map(crmContacts.map(c => [String(c.phone), c.id]));

        const errors: string[] = [];
        const toInsert: any[] = [];
        const processedPhones = new Set<string>();

        // Validar fila por fila
        for (let i = 0; i < jsonData.length; i++) {
            const row: any = jsonData[i];
            const lineNumber = i + 2; // +1(0-index) +1(header)
            
            // Buscar columnas "nombre" y "telefono" (case-insensitive para mayor tolerancia)
            let nameField = '';
            let phoneField = '';
            
            for (const key of Object.keys(row)) {
                if (key.toLowerCase().includes('nombre') || key.toLowerCase() === 'name') nameField = key;
                if (key.toLowerCase().includes('tel') || key.toLowerCase().includes('celular') || key.toLowerCase() === 'phone') phoneField = key;
            }

            if (!nameField) nameField = 'Nombre'; // default back to assume strict match if not found loosely
            if (!phoneField) phoneField = 'Telefono'; 

            const rawName = row[nameField];
            const rawPhone = row[phoneField];

            const name = rawName ? String(rawName).trim() : '';
            const phone = rawPhone ? String(rawPhone).trim() : '';

            if (!name) {
                errors.push(`Línea ${lineNumber}: El campo Nombre está vacío o la columna no fue identificada.`);
                continue;
            }
            if (!phone) {
                errors.push(`Línea ${lineNumber}: El campo Teléfono está vacío o la columna no fue identificada.`);
                continue;
            }

            // Clean number for consistency
            const cleanPhone = phone.replace(/[^0-9+\-]/g, '');
            if (cleanPhone.length < 7) {
                 errors.push(`Línea ${lineNumber}: El Teléfono '${phone}' parece inválido.`);
                 continue;
            }

            // Validar duplicado en DB
            if (existingPhones.has(cleanPhone)) {
                errors.push(`Línea ${lineNumber}: El Teléfono '${cleanPhone}' ya está registrado en este condominio.`);
                continue;
            }

            // Validar duplicado en este mismo excel
            if (processedPhones.has(cleanPhone)) {
                errors.push(`Línea ${lineNumber}: El Teléfono '${cleanPhone}' está duplicado en el archivo Excel.`);
                continue;
            }
            processedPhones.add(cleanPhone);

            // Extract additional data config json
            const additionalData: any = {};
            for (const key of Object.keys(row)) {
                if (key !== nameField && key !== phoneField) {
                    additionalData[key] = String(row[key]).trim(); // Stringify all custom columns
                }
            }

            // Cruzar con CRM si existe
            const mappedContactId = crmPhonesMap.get(cleanPhone) || null;

            toInsert.push({
                condominiumId: condoId,
                name: name,
                phone: cleanPhone,
                additionalData: Object.keys(additionalData).length > 0 ? JSON.stringify(additionalData) : null,
                contactId: mappedContactId
            });
        }

        // Si hay errores, se aborta y se muestran al usuario para que corrija
        if (errors.length > 0) {
            return NextResponse.json({ 
                error: "El archivo contiene errores y no se han importado residentes. Corrige los problemas e intenta nuevamente.", 
                details: errors 
            }, { status: 400 });
        }

        if (toInsert.length === 0) {
            return NextResponse.json({ error: "No se encontraron datos válidos para insertar." }, { status: 400 });
        }

        // Insertar bulk
        await prisma.$transaction(
            toInsert.map(data => prisma.resident.create({ data }))
        );

        return NextResponse.json({ success: true, count: toInsert.length, message: `${toInsert.length} residentes importados exitosamente.` });

    } catch (error) {
        console.error("Error importing residents:", error);
        return NextResponse.json({ error: "Error procesando el archivo de Excel" }, { status: 500 });
    }
}
