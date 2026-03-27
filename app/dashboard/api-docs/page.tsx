'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, Search, FileUp, Users, MessageSquare, Home, Receipt, CreditCard, FileText, History, Filter, X, ZoomIn } from 'lucide-react';
import EscNavHandler from '@/components/EscNavHandler';

interface EndpointField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface Endpoint {
  method: string;
  path: string;
  title: string;
  description: string;
  generalDescription?: string;
  category: string;
  auth?: string;
  curl: string;
  responseJSON?: string;
  note?: string;
  filters?: { name: string; example: string; description: string }[];
  fields?: EndpointField[];
}

const endpoints: Endpoint[] = [
  // CRM Endpoints
  {
    method: 'POST',
    path: '/api/upload',
    title: 'Subir Archivo',
    description: 'Sube un archivo al CRM y retorna la URL para usar en mensajes.',
    generalDescription: 'Este endpoint permite subir archivos multimedia (imágenes, documentos, audio) al servidor del CRM. Los archivos se guardan localmente y se eliminan automáticamente después de 30 días para liberar espacio. Retorna una URL pública que puede usarse en mensajes de WhatsApp o cualquier otra integración.',
    category: 'Archivos',
    fields: [
      { name: 'file', type: 'File', required: true, description: 'Archivo a subir (multipart/form-data). Soporta imágenes, PDF, audio, video.' }
    ],
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/upload" -F "file=@/ruta/a/imagen.jpg"`,
    responseJSON: `{\n  "success": true,\n  "url": "/api/files/uuid-imagen.jpg",\n  "name": "imagen.jpg"\n}`
  },
  {
    method: 'GET',
    path: '/api/v1/contacts',
    title: 'Listar Contactos',
    description: 'Recupera la lista de leads vinculados a tu cuenta.',
    generalDescription: 'Retorna todos los contactos/leads asociados a tu cuenta de usuario. Cada contacto contiene información básica como teléfono, nombre y otros datos demographics capturados durante las interacciones. Es útil para sincronizar listas de clientes con sistemas externos.',
    category: 'Contactos',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/v1/contacts?userApiKey=TU_API_KEY"`,
    responseJSON: `[\n  {\n    "id": 12,\n    "phone": "5212345678",\n    "name": "Juan Perez"\n  }\n]`
  },
  {
    method: 'PATCH',
    path: '/api/v1/contacts',
    title: 'Actualizar Contacto',
    description: 'Actualiza propiedades de un Lead desde integradores externos.',
    generalDescription: 'Permite actualizar información de un contacto específico identificado por su número de teléfono. Es útil para sincronizar datos desde sistemas externos (ERP, CRM externo, formularios web) hacia el CRM. Solo actualiza los campos proporcionados.',
    category: 'Contactos',
    fields: [
      { name: 'phone', type: 'string', required: true, description: 'Número de teléfono del contacto a actualizar (identificador único). Formato: +52...' },
      { name: 'name', type: 'string', required: false, description: 'Nuevo nombre del contacto.' },
      { name: 'stageId', type: 'number', required: false, description: 'ID de la etapa del embudo de ventas (1-5).' },
      { name: 'disableAI', type: 'boolean', required: false, description: 'Desactivar IA para este contacto (true/false).' }
    ],
    curl: `curl -X PATCH "https://crm.pivotsoluciones.com/api/v1/contacts?phone=5212345678&userApiKey=TU_API_KEY" \\\n  -d '{"stageId": 4, "disableAI": true}'`,
    responseJSON: `{\n  "id": 12,\n  "phone": "5212345678",\n  "stageId": 4\n}`
  },
  {
    method: 'POST',
    path: '/api/v1/webhook/incoming',
    title: 'Recibir Mensaje Entrante',
    description: 'Recibe mensajes entrantes (texto o imagen) desde n8n.',
    generalDescription: 'Endpoint diseñado para recibir mensajes entrantes desde flujos de n8n. Se usa principalmente para integrar el CRM con canales externos o automatizaciones que necesitan registrar mensajes en el historial del contacto. Soporta mensajes de texto e imágenes.',
    category: 'Webhooks',
    fields: [
      { name: 'userApiKey', type: 'string', required: true, description: 'Clave API del usuario propietario del contacto.' },
      { name: 'contactPhone', type: 'string', required: true, description: 'Número de teléfono del contacto que envía el mensaje.' },
      { name: 'message', type: 'string', required: true, description: 'Contenido del mensaje de texto. Enviar "IMAGE" si es una imagen.' },
      { name: 'imageUrl', type: 'string', required: false, description: 'URL de la imagen si el mensaje contiene una imagen.' }
    ],
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/v1/webhook/incoming" \\\n  -H "Content-Type: application/json" \\\n  -d '{"userApiKey": "TU_API_KEY", "contactPhone": "521234567890", "message": "Hola"}'`,
    responseJSON: `{\n  "success": true,\n  "messageId": 1025\n}`
  },
  {
    method: 'POST',
    path: '/api/v1/webhook/outgoing',
    title: 'Enviar Mensaje Saliente',
    description: 'Recibe mensajes salientes generados por la IA desde n8n.',
    generalDescription: 'Endpoint para registrar mensajes salientes enviados a través de n8n. Permite que las automatizaciones que generan mensajes (como respuestas de IA o notificaciones programadas) queden registradas en el historial del contacto en el CRM.',
    category: 'Webhooks',
    fields: [
      { name: 'userApiKey', type: 'string', required: true, description: 'Clave API del usuario.' },
      { name: 'contactPhone', type: 'string', required: true, description: 'Número de teléfono del contacto destino.' },
      { name: 'message', type: 'string', required: true, description: 'Contenido del mensaje enviado.' }
    ],
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/v1/webhook/outgoing" \\\n  -H "Content-Type: application/json" \\\n  -d '{"userApiKey": "TU_API_KEY", "contactPhone": "521234567890", "message": "Te envío la cotización"}'`,
    responseJSON: `{\n  "success": true,\n  "messageId": 1026\n}`
  },
  {
    method: 'POST',
    path: '/api/messages',
    title: 'Registrar Mensaje Manual',
    description: 'Registra un mensaje enviado desde el CRM y dispara el Webhook hacia n8n.',
    generalDescription: 'Permite registrar manualmente un mensaje en el historial del CRM y simultáneamente enviar un webhook a n8n para activar flujos de automatización. Útil para registrar interacciones que no vienen directamente del WhatsApp.',
    category: 'Mensajes',
    fields: [
      { name: 'contactId', type: 'number', required: true, description: 'ID del contacto en el CRM.' },
      { name: 'body', type: 'string', required: true, description: 'Contenido del mensaje.' },
      { name: 'direction', type: 'string', required: true, description: 'Dirección del mensaje: "outbound" (enviado) o "inbound" (recibido).' }
    ],
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/messages" \\\n  -H "Content-Type: application/json" \\\n  -d '{"contactId": 12, "body": "Hola Juan", "direction": "outbound"}'`,
    responseJSON: `{\n  "id": 1024,\n  "contactId": 12,\n  "body": "Hola Juan"\n}`
  },
  // Condo Endpoints
  {
    method: 'GET',
    path: '/api/condominiums',
    title: 'Obtener Mi Condominio',
    description: 'Devuelve el condominio vinculado al usuario (relación 1:1).',
    generalDescription: 'Retorna la información del condominio asociado al usuario autenticado. Cada usuario puede tener un solo condominio. Este endpoint es útil para obtener datos básicos como nombre, tipo de propiedad y configuración general.',
    category: 'Condominios',
    auth: 'session | userApiKey',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums?userApiKey=TU_API_KEY"`,
    responseJSON: `{\n  "exists": true,\n  "data": {\n    "id": 1,\n    "name": "Residencial Las Palmas",\n    "type": "CASA"\n  }\n}`
  },
  {
    method: 'POST',
    path: '/api/condominiums',
    title: 'Crear Condominio',
    description: 'Crea un nuevo condominio. Solo 1 por usuario.',
    generalDescription: 'Crea un nuevo condominio vinculado al usuario. Cada usuario puede tener un máximo de un condominio. Una vez creado, no se puede eliminar ni crear otro. Requiere datos básicos como nombre y tipo de propiedad.',
    category: 'Condominios',
    auth: 'session | userApiKey',
    fields: [
      { name: 'name', type: 'string', required: true, description: 'Nombre oficial del condominio.' },
      { name: 'type', type: 'string', required: true, description: 'Tipo de propiedad: "CASA" (casa-habitación) o "APARTAMENTO" (edificio de departamentos).' },
      { name: 'address', type: 'string', required: false, description: 'Dirección física del condominio.' }
    ],
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums?userApiKey=TU_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Torres del Sol", "type": "APARTAMENTO"}'`,
    responseJSON: `{\n  "id": 1,\n  "name": "Torres del Sol"\n}`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}',
    title: 'Obtener Condominio por ID',
    description: 'Devuelve los datos de un condominio específico.',
    generalDescription: 'Retorna información detallada de un condominio específico, incluyendo configuración de campos personalizados para residentes, conteos de relaciones y configuraciones avanzadas.',
    category: 'Condominios',
    auth: 'session | userApiKey',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1?userApiKey=TU_API_KEY"`,
    responseJSON: `{\n  "id": 1,\n  "name": "Residencial Las Palmas",\n  "type": "CASA",\n  "residentFields": ["Casa"],\n  "_count": { "residents": 24 }\n}`
  },
  {
    method: 'PUT',
    path: '/api/condominiums/{id}',
    title: 'Actualizar Condominio',
    description: 'Actualiza la configuración del condominio.',
    generalDescription: 'Permite actualizar la información y configuración del condominio, incluyendo nombre, dirección, tipo de propiedad y campos personalizados para residentes.',
    category: 'Condominios',
    auth: 'session | userApiKey',
    fields: [
      { name: 'name', type: 'string', required: false, description: 'Nuevo nombre del condominio.' },
      { name: 'address', type: 'string', required: false, description: 'Nueva dirección.' },
      { name: 'residentFields', type: 'JSON', required: false, description: 'Array de nombres de campos personalizados para residentes. Ej: ["Casa", "Torre", "Piso"].' },
      { name: 'incomeCategories', type: 'JSON', required: false, description: 'Array de categorías de ingresos personalizadas.' },
      { name: 'expenseCategories', type: 'JSON', required: false, description: 'Array de categorías de gastos personalizadas.' }
    ],
    curl: `curl -X PUT "https://crm.pivotsoluciones.com/api/condominiums/1?userApiKey=TU_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Nuevo Nombre"}'`,
    responseJSON: `{\n  "id": 1,\n  "name": "Nuevo Nombre"\n}`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/residents',
    title: 'Listar Residentes',
    description: 'Retorna todos los residentes del condominio.',
    generalDescription: 'Obtiene la lista completa de residentes registrados en el condominio. Cada residente puede estar vinculado a un contacto del CRM. Soporta filtros para buscar por teléfono.',
    category: 'Residentes',
    auth: 'session | userApiKey',
    filters: [
      { name: 'phone', example: '?phone=521234567890', description: 'Filtrar por número de teléfono' }
    ],
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/residents?userApiKey=TU_API_KEY" \\\n  -H "Accept: application/json"`,
    responseJSON: `[{\n  "id": 1,\n  "name": "Juan Pérez",\n  "phone": "+521234567890"\n}]`
  },
  {
    method: 'POST',
    path: '/api/condominiums/{id}/residents',
    title: 'Agregar Residente',
    description: 'Crea un nuevo residente. Se vincula automáticamente si el teléfono coincide con un contacto del CRM.',
    generalDescription: 'Registra un nuevo residente en el condominio. Si el número de teléfono coincide con un contacto existente en el CRM, se enlazan automáticamente. Los residentes pueden tener campos personalizados adicionales.',
    category: 'Residentes',
    auth: 'session | userApiKey',
    fields: [
      { name: 'name', type: 'string', required: true, description: 'Nombre completo del residente.' },
      { name: 'phone', type: 'string', required: true, description: 'Teléfono del residente (identificador único). Formato WhatsApp.' },
      { name: 'additionalData', type: 'JSON', required: false, description: 'Campos personalizados del residente. Ej: {"Casa": "A1", "Torre": "Torre 1"}.' }
    ],
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums/1/residents?userApiKey=TU_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Ana García", "phone": "+521112223333"}'`,
    responseJSON: `{\n  "id": 2,\n  "name": "Ana García",\n  "phone": "+521112223333"\n}`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/residents/template',
    title: 'Descargar Plantilla Excel',
    description: 'Descarga una plantilla Excel para importar residentes.',
    generalDescription: 'Retorna un archivo Excel con la estructura correcta para importar residentes masivamente. La plantilla incluye las columnas requeridas y opcionales según la configuración del condominio.',
    category: 'Residentes',
    auth: 'session | userApiKey',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/residents/template?userApiKey=TU_API_KEY" \\\n  --output plantilla.xlsx`,
    responseJSON: `// Archivo binario .xlsx`
  },
  {
    method: 'POST',
    path: '/api/condominiums/{id}/residents/import',
    title: 'Importar Residentes',
    description: 'Importa residentes desde un archivo Excel (.xlsx).',
    generalDescription: 'Procesa un archivo Excel con datos de residentes y los importa al condominio. Valida los datos y reporta errores específicos por fila. Los residentes que ya existen (mismo teléfono) se actualizan.',
    category: 'Residentes',
    auth: 'session | userApiKey',
    fields: [
      { name: 'file', type: 'File', required: true, description: 'Archivo Excel (.xlsx) con los datos de residentes.' }
    ],
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums/1/residents/import?userApiKey=TU_API_KEY" \\\n  -F "file=@plantilla.xlsx"`,
    responseJSON: `{\n  "success": true,\n  "count": 15,\n  "errors": []\n}`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/transactions',
    title: 'Listar Transacciones',
    description: 'Retorna las transacciones del condominio con filtros opcionales.',
    generalDescription: 'Obtiene el historial de transacciones (ingresos y gastos) del condominio. Permite filtrar por tipo, estado, residente y rango de fechas. Útil para reportes financieros.',
    category: 'Transacciones',
    auth: 'session | userApiKey',
    filters: [
      { name: 'type', example: '?type=INCOME', description: 'Filtrar por tipo: INCOME o EXPENSE' },
      { name: 'status', example: '?status=PENDING', description: 'Filtrar por estado: PENDING o RECONCILED' },
      { name: 'residentId', example: '?residentId=5', description: 'Filtrar por ID de residente' },
      { name: 'startDate', example: '?startDate=2026-01-01', description: 'Filtrar desde fecha (ISO)' },
      { name: 'endDate', example: '?endDate=2026-01-31', description: 'Filtrar hasta fecha (ISO)' }
    ],
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/transactions?userApiKey=TU_API_KEY&type=INCOME&status=PENDING" \\\n  -H "Accept: application/json"`,
    responseJSON: `[{\n  "id": 1,\n  "type": "INCOME",\n  "category": "Cuota Mensual",\n  "amount": 1500.00,\n  "status": "PENDING",\n  "resident": { "name": "Juan" }\n}]`
  },
  {
    method: 'POST',
    path: '/api/condominiums/{id}/transactions',
    title: 'Crear Transacción',
    description: 'Registra una nueva transacción (ingreso o egreso).',
    generalDescription: 'Crea una nueva transacción financiera en el condominio. Las transacciones pueden ser ingresos (aportaciones, cuotas) o gastos (mantenimiento, servicios). Cada transacción puede estar asociada a un residente.',
    category: 'Transacciones',
    auth: 'session | userApiKey',
    fields: [
      { name: 'type', type: 'string', required: true, description: 'Tipo de transacción: "INCOME" (ingreso) o "EXPENSE" (egreso).' },
      { name: 'category', type: 'string', required: true, description: 'Categoría de la transacción. Ej: "Cuota Mensual", "Servicios", "Mantenimiento".' },
      { name: 'amount', type: 'number', required: true, description: 'Monto de la transacción (positivo).' },
      { name: 'description', type: 'string', required: false, description: 'Descripción breve o concepto.' },
      { name: 'date', type: 'string', required: false, description: 'Fecha de la transacción (YYYY-MM-DD).' },
      { name: 'residentId', type: 'number', required: false, description: 'ID del residente asociado (solo para INCOME).' },
      { name: 'status', type: 'string', required: false, description: 'Estado inicial: "PENDING" (por conciliar) o "RECONCILED" (conciliado).' },
      { name: 'isFixed', type: 'boolean', required: false, description: 'Si es true, el gasto se replica automáticamente cada mes.' }
    ],
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums/1/transactions?userApiKey=TU_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"type": "EXPENSE", "category": "Limpieza", "amount": 500, "isFixed": false}'`,
    responseJSON: `{\n  "id": 1,\n  "type": "EXPENSE",\n  "amount": 500\n}`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/invoices',
    title: 'Listar Facturas',
    description: 'Retorna las facturas del condominio.',
    generalDescription: 'Obtiene el historial de facturas mensuales generadas para el condominio. Cada factura representa la distribución de gastos de un mes específico entre todos los residentes.',
    category: 'Facturas',
    auth: 'session | userApiKey',
    filters: [
      { name: 'month', example: '?month=3', description: 'Filtrar por mes (1-12)' },
      { name: 'year', example: '?year=2026', description: 'Filtrar por año' }
    ],
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/invoices?userApiKey=TU_API_KEY&month=3&year=2026"`,
    responseJSON: `[{\n  "id": 1,\n  "month": 3,\n  "year": 2026,\n  "amount": 15000.00,\n  "status": "PENDING"\n}]`
  },
  {
    method: 'POST',
    path: '/api/condominiums/{id}/invoices/generate',
    title: 'Generar Factura Mensual',
    description: 'Genera una factura basada en los gastos del mes.',
    generalDescription: 'Crea una nueva factura mensual calculando el total de gastos del mes y dividiéndolo entre el número de residentes. Genera automáticamente las deudas pendientes para cada residente.',
    category: 'Facturas',
    auth: 'session | userApiKey',
    fields: [
      { name: 'month', type: 'number', required: true, description: 'Mes de la factura (1-12).' },
      { name: 'year', type: 'number', required: true, description: 'Año de la factura (ej: 2026).' }
    ],
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums/1/invoices/generate?userApiKey=TU_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"month": 3, "year": 2026}'`,
    responseJSON: `{\n  "success": true,\n  "invoice": {\n    "id": 1,\n    "month": 3,\n    "year": 2026,\n    "amount": 15000.00\n  }\n}`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/invoices/{invoiceId}/pdf',
    title: 'Descargar Factura PDF',
    description: 'Genera y descarga el PDF de una factura específica.',
    generalDescription: 'Genera un documento PDF con el detalle completo de una factura mensual, incluyendo gastos por categoría, total, y el cálculo realizado por residente.',
    category: 'Facturas',
    auth: 'session | userApiKey',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/invoices/5/pdf?userApiKey=TU_API_KEY" \\\n  --output factura.pdf`,
    responseJSON: `// Archivo binario PDF`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/invoices/{invoiceId}/template',
    title: 'Descargar Plantilla de Gastos',
    description: 'Genera PDF con Gastos Fijos, Variables y cálculo por residente.',
    generalDescription: 'Genera un PDF detallado que desglosa los gastos fijos (que se repiten mensual), los gastos variables del mes, y muestra cómo se calcula el monto por residente.',
    category: 'Facturas',
    auth: 'session | userApiKey',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/invoices/5/template?userApiKey=TU_API_KEY" \\\n  --output plantilla.pdf`,
    responseJSON: `// Archivo binario PDF`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/logs',
    title: 'Ver Historial de Actividad',
    description: 'Retorna los logs de auditoría del condominio.',
    generalDescription: 'Obtiene el historial de acciones realizadas en el condominio (creación de residentes, transacciones, cambios de configuración). Útil para auditoría y seguimiento de cambios.',
    category: 'Registros',
    auth: 'session | userApiKey',
    filters: [
      { name: 'source', example: '?source=CRM', description: 'Filtrar por fuente: CRM o WHATSAPP' }
    ],
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/logs?userApiKey=TU_API_KEY&source=CRM"`,
    responseJSON: `[{\n  "id": 1,\n  "action": "Configuración actualizada",\n  "source": "CRM",\n  "createdAt": "2026-03-25T12:00:00Z"\n}]`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/metrics/income-vs-expense',
    title: 'Métricas Ingresos vs Egresos',
    description: 'Retorna gráfico de ingresos vs egresos por mes.',
    generalDescription: 'Proporciona datos para generar gráficos de comparación entre ingresos y gastos por mes. Útil para visualizar la salud financiera del condominio a lo largo del tiempo.',
    category: 'Métricas',
    auth: 'session | userApiKey',
    filters: [
      { name: 'months', example: '?months=6', description: 'Cantidad de meses a graficar (3,6,9,12,24)' }
    ],
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/metrics/income-vs-expense?userApiKey=TU_API_KEY&months=6"`,
    responseJSON: `[{\n  "month": "2026-03",\n  "income": 15000,\n  "expense": 8000\n}]`
  },
  // Pagos
  {
    method: 'GET',
    path: '/api/condominiums/{id}/residents/{residentId}/payments',
    title: 'Listar Pagos de Residente',
    description: 'Retorna todos los pagos de un residente específico.',
    generalDescription: 'Obtiene el historial completo de pagos realizados por un residente, incluyendo monto, fecha, estado de conciliación y período al que corresponde el pago.',
    category: 'Pagos',
    auth: 'session | userApiKey',
    filters: [
      { name: 'status', example: '?status=PENDING', description: 'Filtrar por estado: PENDING o RECONCILED' }
    ],
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/residents/5/payments?userApiKey=TU_API_KEY"`,
    responseJSON: `[{\n  "id": 1,\n  "amount": 1500.00,\n  "status": "RECONCILED",\n  "date": "2026-03-15T00:00:00.000Z",\n  "month": 3,\n  "year": 2026\n}]`
  },
  {
    method: 'POST',
    path: '/api/condominiums/{id}/residents/{residentId}/payments',
    title: 'Registrar Pago',
    description: 'Registra un nuevo pago para un residente. Puede ser parcial o completo.',
    generalDescription: 'Crea un registro de pago para un residente. El pago puede ser parcial (abono a cuenta) o completo. Una vez conciliado, actualiza automáticamente el estado de insolvencia del residente. Los valores numéricos deben enviarse SIN comillas.',
    category: 'Pagos',
    auth: 'session | userApiKey',
    fields: [
      { name: 'amount', type: 'number', required: true, description: 'Monto del pago (sin comillas). Ej: 1500' },
      { name: 'date', type: 'string', required: false, description: 'Fecha del pago en formato YYYY-MM-DD. Por defecto: fecha actual.' },
      { name: 'month', type: 'number', required: false, description: 'Mes que cancela (1-12). Opcional.' },
      { name: 'year', type: 'number', required: false, description: 'Año que cancela. Opcional.' },
      { name: 'notes', type: 'string', required: false, description: 'Notas adicionales sobre el pago.' }
    ],
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums/1/residents/5/payments?userApiKey=TU_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"amount": 1500, "date": "2026-03-15", "month": 3, "year": 2026}'`,
    note: 'IMPORTANTE: Los valores numéricos deben ir SIN comillas (no como strings)',
    responseJSON: `{\n  "id": 1,\n  "amount": 1500.00,\n  "date": "2026-03-15T00:00:00.000Z",\n  "status": "PENDING",\n  "source": "api"\n}`
  },
  {
    method: 'POST',
    path: '/api/condominiums/{id}/residents/{residentId}/payments/{paymentId}/receipt',
    title: 'Subir Comprobante de Pago',
    description: 'Sube un archivo de comprobante (imagen/PDF) para un pago.',
    generalDescription: 'Asocia un archivo de soporte (boucher, recibo, captura de pantalla) a un pago existente. El archivo se guarda y puede descargarse posteriormente.',
    category: 'Pagos',
    auth: 'session | userApiKey',
    fields: [
      { name: 'file', type: 'File', required: true, description: 'Archivo de comprobante (imagen JPEG/PNG o PDF).' }
    ],
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums/1/residents/5/payments/1/receipt?userApiKey=TU_API_KEY" \\\n  -F "file=@comprobante.jpg"`,
    responseJSON: `{\n  "success": true,\n  "receiptUrl": "/api/files/comprobante.jpg"\n}`
  },
  {
    method: 'POST',
    path: '/api/condominiums/{id}/residents/{residentId}/payments/{paymentId}/reconcile',
    title: 'Conciliar Pago',
    description: 'Concilia un pago (marca como RECONCILED) y actualiza el estado de insolvencia.',
    generalDescription: 'Marca un pago como conciliado (verificado y válido). Al conciliar, el sistema recalcula automáticamente la deuda del residente y actualiza su estado a solvente o insolvente según corresponda.',
    category: 'Pagos',
    auth: 'session | userApiKey',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums/1/residents/5/payments/1/reconcile?userApiKey=TU_API_KEY"`,
    responseJSON: `{\n  "success": true,\n  "payment": {\n    "id": 1,\n    "status": "RECONCILED"\n  }\n}`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/residents/{residentId}/payments/debt',
    title: 'Ver Deuda por Mes',
    description: 'Retorna el detalle de la deuda por mes/año de un residente.',
    generalDescription: 'Obtiene el historial de deudas (facturas pendientes) de un residente, mostrando el monto facturado, lo pagado y el saldo pendiente por cada período.',
    category: 'Pagos',
    auth: 'session | userApiKey',
    filters: [
      { name: 'year', example: '?year=2026', description: 'Filtrar por año' },
      { name: 'month', example: '?month=3', description: 'Filtrar por mes específico' }
    ],
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/residents/5/payments/debt?userApiKey=TU_API_KEY&year=2026"`,
    responseJSON: `[{\n  "id": 1,\n  "month": 3,\n  "year": 2026,\n  "amount": 1500.00,\n  "paid": 0,\n  "status": "PENDING"\n}]`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/residents/{residentId}/payments/history',
    title: 'Historial de Pagos PDF',
    description: 'Genera un PDF con el historial de pagos de un residente.',
    generalDescription: 'Genera un documento PDF que muestra todo el historial de pagos de un residente específico, incluyendo montos, fechas, estados y comprobantes.',
    category: 'Pagos',
    auth: 'session | userApiKey',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/residents/5/payments/history?userApiKey=TU_API_KEY" \\\n  -H "Accept: application/pdf"`,
    responseJSON: `// Archivo binario PDF (inline)`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/payments/history',
    title: 'Historial General de Pagos PDF',
    description: 'Genera un PDF con el historial de pagos de todos los residentes.',
    generalDescription: 'Genera un documento PDF consolidado con el historial de pagos de todos los residentes del condominio. Útil para reportes generales y auditoría.',
    category: 'Pagos',
    auth: 'session | userApiKey',
    filters: [
      { name: 'year', example: '?year=2026', description: 'Filtrar por año' }
    ],
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/payments/history?userApiKey=TU_API_KEY&year=2026" \\\n  -H "Accept: application/pdf"`,
    responseJSON: `// Archivo binario PDF (inline)`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/metrics/solvent-residents',
    title: 'Métricas de Solvencia',
    description: 'Retorna el porcentaje de residentes solventes vs insolventes.',
    generalDescription: 'Proporciona estadísticas sobre la situación de pago de los residentes: cuántos están al día (solventes) y cuántos tienen deudas pendientes (insolventes), con el porcentaje de morosidad.',
    category: 'Métricas',
    auth: 'session | userApiKey',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/metrics/solvent-residents?userApiKey=TU_API_KEY"`,
    responseJSON: `{\n  "total": 24,\n  "solvent": 18,\n  "insolvent": 6,\n  "percentage": 75.0\n}`
  },
  // Admin
  {
    method: 'GET',
    path: '/api/admin/condominiums/{id}/pending-payments',
    title: 'Listar Pagos Pendientes (Admin)',
    description: 'Retorna todos los pagos pendientes de conciliación del condominio.',
    generalDescription: 'Endpoint administrativo para ver todos los pagos que aún no han sido conciliados. Facilita la gestión de cobranza y conciliación de pagos.',
    category: 'Admin',
    auth: 'session | userApiKey',
    filters: [
      { name: 'status', example: '?status=PENDING', description: 'Filtrar por estado' }
    ],
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/admin/condominiums/1/pending-payments?userApiKey=TU_API_KEY"`,
    responseJSON: `[{\n  "id": 1,\n  "amount": 1500.00,\n  "status": "PENDING",\n  "resident": { "name": "Juan Pérez" }\n}]`
  },
  {
    method: 'POST',
    path: '/api/admin/condominiums/{id}/payments/{paymentId}/reconcile',
    title: 'Conciliar Pago (Admin)',
    description: 'Concilia un pago específico (admin).',
    generalDescription: 'Endpoint administrativo para conciliar un pago desde el panel de administración. Además de marcar como conciliado, actualiza automáticamente el estado de insolvencia del residente.',
    category: 'Admin',
    auth: 'session | userApiKey',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/admin/condominiums/1/payments/1/reconcile?userApiKey=TU_API_KEY"`,
    responseJSON: `{\n  "success": true,\n  "payment": {\n    "id": 1,\n    "status": "RECONCILED"\n  },\n  "residentStatus": "SOLVENTE"\n}`
  }
];

const getMethodColor = (method: string) => {
  switch (method) {
    case 'GET': return 'bg-[#4A8FE7]';
    case 'POST': return 'bg-[#5BB57D]';
    case 'PATCH': return 'bg-[#F18E5E]';
    case 'PUT': return 'bg-[#F18E5E]';
    case 'DELETE': return 'bg-[#E55D5D]';
    default: return 'bg-gray-500';
  }
};

const getMethodBadge = (method: string) => {
  switch (method) {
    case 'GET': return 'text-[#4A8FE7]';
    case 'POST': return 'text-[#5BB57D]';
    case 'PATCH': return 'text-[#F18E5E]';
    case 'PUT': return 'text-[#F18E5E]';
    case 'DELETE': return 'text-[#E55D5D]';
    default: return 'text-gray-500';
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Archivos': return <FileUp className="w-4 h-4" />;
    case 'Contactos': return <Users className="w-4 h-4" />;
    case 'Webhooks': return <MessageSquare className="w-4 h-4" />;
    case 'Mensajes': return <MessageSquare className="w-4 h-4" />;
    case 'Condominios': return <Home className="w-4 h-4" />;
    case 'Residentes': return <Users className="w-4 h-4" />;
    case 'Facturas': return <Receipt className="w-4 h-4" />;
    case 'Transacciones': return <CreditCard className="w-4 h-4" />;
    case 'Registros': return <History className="w-4 h-4" />;
    case 'Métricas': return <FileText className="w-4 h-4" />;
    case 'Pagos': return <CreditCard className="w-4 h-4" />;
    case 'Admin': return <FileText className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

export default function ApiDocsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState<string>('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<number | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState<{ [key: string]: boolean }>({
    'CRM': true,
    'Condominios': true,
    'Pagos': true,
    'Admin': true
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredEndpoints = endpoints.filter(ep => 
    ep.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ep.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ep.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const crmEndpoints = filteredEndpoints.filter(ep => !ep.path.includes('condominiums'));
  const condoEndpoints = filteredEndpoints.filter(ep => ep.path.includes('condominiums'));

  // Group endpoints by method within each category
  const groupEndpointsByMethod = (endpointList: Endpoint[]) => {
    const grouped: { [key: string]: Endpoint[] } = {};
    endpointList.forEach(ep => {
      if (!grouped[ep.method]) grouped[ep.method] = [];
      grouped[ep.method].push(ep);
    });
    return grouped;
  };

  const crmGrouped = groupEndpointsByMethod(crmEndpoints);
  const condoGrouped = groupEndpointsByMethod(condoEndpoints);
  const pagosEndpoints = filteredEndpoints.filter(ep => ep.category === 'Pagos');
  const pagosGrouped = groupEndpointsByMethod(pagosEndpoints);
  const adminEndpoints = filteredEndpoints.filter(ep => ep.category === 'Admin');
  const adminGrouped = groupEndpointsByMethod(adminEndpoints);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    document.querySelectorAll('article[id^="ep-"]').forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, [filteredEndpoints]);

  // Close modal on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedEndpoint(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const renderSidebarSection = (title: string, grouped: { [key: string]: Endpoint[] }, icon: React.ReactNode) => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    
    return (
      <div className="mb-6">
        <button 
          onClick={() => setCategoriesOpen(prev => ({ ...prev, [title]: !prev[title] }))}
          className="flex items-center text-sm font-semibold text-gray-900 mb-3 w-full text-left hover:text-blue-600 transition-colors"
        >
          <svg className={`w-4 h-4 mr-2 text-gray-500 transition-transform ${categoriesOpen[title] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
          {icon}
        </button>
        {categoriesOpen[title] && (
          <div className="space-y-3 pl-2">
            {methods.map(method => {
              if (!grouped[method] || grouped[method].length === 0) return null;
              return (
                <div key={method}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getMethodColor(method)} text-white`}>
                      {method}
                    </span>
                    <span className="text-xs text-gray-400">({grouped[method].length})</span>
                  </div>
                  <ul className="space-y-1 pl-6 border-l border-gray-200 ml-1">
                    {grouped[method].map((ep) => {
                      const originalIndex = endpoints.indexOf(ep);
                      const isActive = activeSection === `ep-${originalIndex}`;
                      return (
                        <li key={originalIndex}>
                          <button 
                            onClick={() => setSelectedEndpoint(originalIndex)}
                            className={`text-sm block truncate py-1.5 px-2 rounded transition-all border-l-2 w-full text-left ${isActive ? 'bg-indigo-50 text-indigo-700 border-indigo-500 font-medium' : 'text-gray-600 hover:text-gray-900 border-transparent hover:bg-gray-100'}`}
                          >
                            {ep.title}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const selectedEp = selectedEndpoint !== null ? endpoints[selectedEndpoint] : null;

  return (
    <div className="min-h-screen bg-[#A9B5CE] p-8 flex items-center justify-center">
      <EscNavHandler />
      
      <div className="w-full max-w-[1300px] h-[800px] bg-white rounded-xl shadow-2xl flex overflow-hidden border border-gray-200">
        
        <aside className="w-[300px] bg-[#f4f6fa] border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="h-20 flex items-center px-6 border-b border-gray-200">
            <Link href="/dashboard" className="mr-3 text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-base font-semibold text-gray-900">API Documentation</h1>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-6 px-4">
            {renderSidebarSection('CRM', crmGrouped, <span>CRM Endpoints</span>)}
            {renderSidebarSection('Condominios', condoGrouped, <span>Condominium Endpoints</span>)}
            {renderSidebarSection('Pagos', pagosGrouped, <span>Pagos</span>)}
            {renderSidebarSection('Admin', adminGrouped, <span>Admin</span>)}
          </nav>
        </aside>

        <main className="flex-1 flex flex-col bg-white overflow-hidden">
          <header className="bg-[#eff3f9] pt-12 pb-16 px-10 flex flex-col items-center justify-center border-b border-gray-100 flex-shrink-0">
            <h2 className="text-[32px] font-bold text-[#0F172A] mb-8">Developer API v1.1</h2>
            
            <div className="w-full max-w-[640px] relative bg-white shadow-md rounded-full flex items-center px-4 py-3.5 border border-gray-100">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input 
                type="text"
                placeholder="Buscar endpoints por nombre, ruta o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 text-[15px] focus:ring-0 p-0 w-full"
              />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-10 bg-white">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              {filteredEndpoints.map((ep, index) => {
                const originalIndex = endpoints.indexOf(ep);
                return (
                  <article 
                    key={index} 
                    id={`ep-${originalIndex}`} 
                    className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow scroll-mt-8 cursor-pointer group"
                    onClick={() => setSelectedEndpoint(originalIndex)}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-2.5 py-1 rounded text-white text-xs font-bold uppercase tracking-wider ${getMethodColor(ep.method)}`}>
                        {ep.method}
                      </span>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                        {getCategoryIcon(ep.category)}
                        {ep.category}
                      </span>
                      <ZoomIn className="w-4 h-4 text-gray-300 ml-auto group-hover:text-indigo-500 transition-colors" />
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{ep.title}</h3>
                    <p className="text-[15px] text-gray-700 leading-relaxed mb-4">{ep.description}</p>
                    <code className="text-sm font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded block mb-4">{ep.path}</code>
                  </article>
                );
              })}
            </div>
          </div>
        </main>

        {/* Modal */}
        {selectedEp && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSelectedEndpoint(null)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded text-white text-xs font-bold uppercase tracking-wider ${getMethodColor(selectedEp.method)}`}>
                    {selectedEp.method}
                  </span>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                    {getCategoryIcon(selectedEp.category)}
                    {selectedEp.category}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedEndpoint(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedEp.title}</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedEp.description}</p>
                </div>

                {selectedEp.generalDescription && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">Acerca de este endpoint</h4>
                    <p className="text-sm text-blue-700">{selectedEp.generalDescription}</p>
                  </div>
                )}

                <code className="text-sm font-mono text-gray-500 bg-gray-50 px-3 py-2 rounded block">{selectedEp.path}</code>

                {selectedEp.auth && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                    <span className="font-medium">Autenticación:</span> {selectedEp.auth}
                  </div>
                )}

                {selectedEp.fields && selectedEp.fields.length > 0 && (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">Campos del Request</span>
                    </div>
                    <div className="p-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="pb-2 font-medium text-gray-600">Campo</th>
                            <th className="pb-2 font-medium text-gray-600">Tipo</th>
                            <th className="pb-2 font-medium text-gray-600">Descripción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedEp.fields.map((field, idx) => (
                            <tr key={idx}>
                              <td className="py-2 pr-4">
                                <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">{field.name}</code>
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </td>
                              <td className="py-2 pr-4 text-gray-500">{field.type}</td>
                              <td className="py-2 text-gray-600">{field.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedEp.filters && selectedEp.filters.length > 0 && (
                  <div className="bg-amber-50 rounded-lg border border-amber-100 overflow-hidden">
                    <div className="bg-amber-100 px-4 py-2 border-b border-amber-200">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                        <Filter className="w-3.5 h-3.5" /> Filtros disponibles
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      {selectedEp.filters.map((filter, fIdx) => (
                        <div key={fIdx} className="text-sm">
                          <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800">{filter.example}</code>
                          <span className="ml-2 text-amber-700">- {filter.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEp.note && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {selectedEp.note}
                  </div>
                )}

                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <div className="bg-[#E2E8F0] px-4 py-2.5 flex justify-between items-center">
                    <span className="text-sm text-gray-700 font-medium">Example Request</span>
                    <button onClick={() => handleCopy(selectedEp.curl, `curl-modal`)} className="text-gray-500 hover:text-gray-700 flex items-center gap-1.5 text-xs font-medium">
                      {copied === `curl-modal` ? <><Check className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                    </button>
                  </div>
                  <div className="bg-[#1A202C] p-4 text-sm font-mono text-gray-300 overflow-x-auto">
                    <pre className="m-0"><code>{selectedEp.curl}</code></pre>
                  </div>
                </div>

                {selectedEp.responseJSON && (
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    <div className="bg-[#E2E8F0] px-4 py-2.5">
                      <span className="text-sm text-gray-700 font-medium">Example Response</span>
                    </div>
                    <div className="bg-[#1A202C] p-4 text-sm font-mono text-gray-300 overflow-x-auto max-h-48">
                      <pre className="m-0"><code>{selectedEp.responseJSON}</code></pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
