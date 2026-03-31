import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateCondoRequest } from "@/lib/condoAuth";
import { DocumentType, PdfTemplate, getDefaultTemplate, AllTemplates, DOCUMENT_TYPE_LABELS } from "@/lib/pdfTemplateTypes";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; type: string } }
) {
  const auth = await authenticateCondoRequest(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const condoId = parseInt(params.id);
  const docType = params.type as DocumentType;

  if (isNaN(condoId)) {
    return NextResponse.json({ error: "ID de condominio inválido" }, { status: 400 });
  }

  const validTypes: DocumentType[] = [
    "invoice",
    "invoiceTemplate",
    "paymentReceipt",
    "paymentHistory",
    "residentExport",
    "transactionExport",
    "financialReport",
  ];

  if (!validTypes.includes(docType)) {
    return NextResponse.json(
      { error: `Tipo de documento inválido. Tipos válidos: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
    if (!condo || condo.userId !== auth.ownerId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    let templates: Partial<AllTemplates> = {};
    
    if (condo.invoiceTemplates) {
      try {
        templates = JSON.parse(condo.invoiceTemplates);
      } catch (e) {
        console.error("Error parsing invoiceTemplates:", e);
      }
    }

    let template: PdfTemplate;
    
    if (templates[docType]) {
      template = templates[docType] as PdfTemplate;
    } else {
      template = getDefaultTemplate(docType);
    }

    return NextResponse.json({
      documentType: docType,
      documentLabel: DOCUMENT_TYPE_LABELS[docType],
      template,
      availableTypes: validTypes.map(t => ({
        type: t,
        label: DOCUMENT_TYPE_LABELS[t],
      })),
    });
  } catch (e) {
    console.error("Error getting template:", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; type: string } }
) {
  const auth = await authenticateCondoRequest(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const condoId = parseInt(params.id);
  const docType = params.type as DocumentType;

  if (isNaN(condoId)) {
    return NextResponse.json({ error: "ID de condominio inválido" }, { status: 400 });
  }

  const validTypes: DocumentType[] = [
    "invoice",
    "invoiceTemplate",
    "paymentReceipt",
    "paymentHistory",
    "residentExport",
    "transactionExport",
    "financialReport",
  ];

  if (!validTypes.includes(docType)) {
    return NextResponse.json(
      { error: `Tipo de documento inválido. Tipos válidos: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
    if (!condo || condo.userId !== auth.ownerId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const template = body.template as PdfTemplate;

    if (!template || !template.sections) {
      return NextResponse.json({ error: "Plantilla inválida" }, { status: 400 });
    }

    let templates: Partial<AllTemplates> = {};
    
    if (condo.invoiceTemplates) {
      try {
        templates = JSON.parse(condo.invoiceTemplates);
      } catch (e) {
        console.error("Error parsing invoiceTemplates:", e);
      }
    }

    templates[docType] = template;

    await prisma.condominium.update({
      where: { id: condoId },
      data: { invoiceTemplates: JSON.stringify(templates) },
    });

    return NextResponse.json({
      success: true,
      documentType: docType,
      message: `Plantilla de ${DOCUMENT_TYPE_LABELS[docType]} guardada correctamente`,
    });
  } catch (e) {
    console.error("Error saving template:", e);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
