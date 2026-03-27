'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, Search, FileUp, Users, MessageSquare, Home, Receipt, CreditCard, FileText, History, Filter } from 'lucide-react';
import EscNavHandler from '@/components/EscNavHandler';

const endpoints = [
  // CRM Endpoints
  {
    method: 'POST',
    path: '/api/upload',
    title: 'Subir Archivo',
    description: 'Sube un archivo al CRM y retorna la URL para usar en mensajes. El archivo se guarda localmente y se elimina automáticamente después de 30 días.',
    category: 'Archivos',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/upload" -F "file=@/ruta/a/imagen.jpg"`,
    responseJSON: `{\n  "success": true,\n  "url": "/api/files/uuid-imagen.jpg",\n  "name": "imagen.jpg"\n}`
  },
  {
    method: 'GET',
    path: '/api/v1/contacts',
    title: 'Listar Contactos',
    description: 'Recupera la lista de leads vinculados a tu cuenta.',
    category: 'Contactos',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/v1/contacts?userApiKey=TU_API_KEY"`,
    responseJSON: `[\n  {\n    "id": 12,\n    "phone": "5212345678",\n    "name": "Juan Perez"\n  }\n]`
  },
  {
    method: 'PATCH',
    path: '/api/v1/contacts?phone={phone}',
    title: 'Actualizar Contacto',
    description: 'Actualiza propiedades de un Lead desde integradores externos.',
    category: 'Contactos',
    curl: `curl -X PATCH "https://crm.pivotsoluciones.com/api/v1/contacts?phone=5212345678&userApiKey=TU_API_KEY" \\\n  -d '{"stageId": 4, "disableAI": true}'`,
    responseJSON: `{\n  "id": 12,\n  "phone": "5212345678",\n  "stageId": 4\n}`
  },
  {
    method: 'POST',
    path: '/api/v1/webhook/incoming',
    title: 'Recibir Mensaje Entrante',
    description: 'Recibe mensajes entrantes (texto o imagen) desde n8n.',
    category: 'Webhooks',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/v1/webhook/incoming" \\\n  -H "Content-Type: application/json" \\\n  -d '{"userApiKey": "TU_API_KEY", "contactPhone": "521234567890", "message": "Hola"}'`,
    responseJSON: `{\n  "success": true,\n  "messageId": 1025\n}`
  },
  {
    method: 'POST',
    path: '/api/v1/webhook/outgoing',
    title: 'Enviar Mensaje Saliente',
    description: 'Recibe mensajes salientes generados por la IA desde n8n.',
    category: 'Webhooks',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/v1/webhook/outgoing" \\\n  -H "Content-Type: application/json" \\\n  -d '{"userApiKey": "TU_API_KEY", "contactPhone": "521234567890", "message": "Te envío la cotización"}'`,
    responseJSON: `{\n  "success": true,\n  "messageId": 1026\n}`
  },
  {
    method: 'POST',
    path: '/api/messages',
    title: 'Registrar Mensaje Manual',
    description: 'Registra un mensaje enviado desde el CRM y dispara el Webhook hacia n8n.',
    category: 'Mensajes',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/messages" \\\n  -H "Content-Type: application/json" \\\n  -d '{"contactId": 12, "body": "Hola Juan", "direction": "outbound"}'`,
    responseJSON: `{\n  "id": 1024,\n  "contactId": 12,\n  "body": "Hola Juan"\n}`
  },
  // Condo Endpoints - with API Key protection
  {
    method: 'GET',
    path: '/api/condominiums',
    title: 'Obtener Mi Condominio',
    description: 'Devuelve el condominio vinculado al usuario (relación 1:1).',
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
    category: 'Condominios',
    auth: 'session | userApiKey',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums?userApiKey=TU_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Torres del Sol", "type": "APARTAMENTO"}'`,
    responseJSON: `{\n  "id": 1,\n  "name": "Torres del Sol"\n}`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}',
    title: 'Obtener Condominio por ID',
    description: 'Devuelve los datos de un condominio específico.',
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
    category: 'Condominios',
    auth: 'session | userApiKey',
    curl: `curl -X PUT "https://crm.pivotsoluciones.com/api/condominiums/1?userApiKey=TU_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Nuevo Nombre"}'`,
    responseJSON: `{\n  "id": 1,\n  "name": "Nuevo Nombre"\n}`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/residents',
    title: 'Listar Residentes',
    description: 'Retorna todos los residentes del condominio.',
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
    category: 'Residentes',
    auth: 'session | userApiKey',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums/1/residents?userApiKey=TU_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Ana García", "phone": "+521112223333"}'`,
    responseJSON: `{\n  "id": 2,\n  "name": "Ana García",\n  "phone": "+521112223333"\n}`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/residents/template',
    title: 'Descargar Plantilla Excel',
    description: 'Descarga una plantilla Excel para importar residentes.',
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
    category: 'Residentes',
    auth: 'session | userApiKey',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums/1/residents/import?userApiKey=TU_API_KEY" \\\n  -F "file=@plantilla.xlsx"`,
    responseJSON: `{\n  "success": true,\n  "count": 15,\n  "errors": []\n}`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/transactions',
    title: 'Listar Transacciones',
    description: 'Retorna las transacciones del condominio con filtros opcionales.',
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
    category: 'Transacciones',
    auth: 'session | userApiKey',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums/1/transactions?userApiKey=TU_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"type": "EXPENSE", "category": "Limpieza", "amount": 500, "isFixed": false}'`,
    responseJSON: `{\n  "id": 1,\n  "type": "EXPENSE",\n  "amount": 500\n}`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/invoices',
    title: 'Listar Facturas',
    description: 'Retorna las facturas del condominio.',
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
    category: 'Facturas',
    auth: 'session | userApiKey',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums/1/invoices/generate?userApiKey=TU_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"month": 3, "year": 2026}'`,
    responseJSON: `{\n  "success": true,\n  "invoice": {\n    "id": 1,\n    "month": 3,\n    "year": 2026,\n    "amount": 15000.00\n  }\n}`
  },
  {
    method: 'GET',
    path: '/api/condominiums/{id}/invoices/{invoiceId}/pdf',
    title: 'Descargar Factura PDF',
    description: 'Genera y descarga el PDF de una factura específica.',
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
    category: 'Métricas',
    auth: 'session | userApiKey',
    filters: [
      { name: 'months', example: '?months=6', description: 'Cantidad de meses a graficar (3,6,9,12,24)' }
    ],
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/metrics/income-vs-expense?userApiKey=TU_API_KEY&months=6"`,
    responseJSON: `[{\n  "month": "2026-03",\n  "income": 15000,\n  "expense": 8000\n}]`
  },
  // Pagos - Resident Payments
  {
    method: 'GET',
    path: '/api/condominiums/{id}/residents/{residentId}/payments',
    title: 'Listar Pagos de Residente',
    description: 'Retorna todos los pagos de un residente específico.',
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
    category: 'Pagos',
    auth: 'session | userApiKey',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums/1/residents/5/payments?userApiKey=TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1500, "date": "2026-03-15", "month": 3, "year": 2026}'`,
    note: 'IMPORTANTE: Los valores numéricos deben ir SIN comillas (no como strings)',
    responseJSON: `{
  "id": 1,
  "amount": 1500.00,
  "date": "2026-03-15T00:00:00.000Z",
  "status": "PENDING",
  "source": "api"
}`
  },
  {
    method: 'POST',
    path: '/api/condominiums/{id}/residents/{residentId}/payments/{paymentId}/receipt',
    title: 'Subir Comprobante de Pago',
    description: 'Sube un archivo de comprobante (imagen/PDF) para un pago.',
    category: 'Pagos',
    auth: 'session | userApiKey',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/condominiums/1/residents/5/payments/1/receipt?userApiKey=TU_API_KEY" \\\n  -F "file=@comprobante.jpg"`,
    responseJSON: `{\n  "success": true,\n  "receiptUrl": "/api/files/comprobante.jpg"\n}`
  },
  {
    method: 'POST',
    path: '/api/condominiums/{id}/residents/{residentId}/payments/{paymentId}/reconcile',
    title: 'Conciliar Pago',
    description: 'Concilia un pago (marca como RECONCILED) y actualiza el estado de insolvencia.',
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
    description: 'Genera un PDF con el historial de pagos de un residente (se abre en navegador).',
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
    category: 'Métricas',
    auth: 'session | userApiKey',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/condominiums/1/metrics/solvent-residents?userApiKey=TU_API_KEY"`,
    responseJSON: `{\n  "total": 24,\n  "solvent": 18,\n  "insolvent": 6,\n  "percentage": 75.0\n}`
  },
  // Admin Endpoints
  {
    method: 'GET',
    path: '/api/admin/condominiums/{id}/pending-payments',
    title: 'Listar Pagos Pendientes (Admin)',
    description: 'Retorna todos los pagos pendientes de conciliación del condominio.',
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
    description: 'Concilia un pago específico (admin). Actualiza automáticamente el estado de insolvencia.',
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

  return (
    <div className="min-h-screen bg-[#A9B5CE] p-8 flex items-center justify-center">
      <EscNavHandler />
      
      <div className="w-full max-w-[1300px] h-[800px] bg-white rounded-xl shadow-2xl flex overflow-hidden border border-gray-200">
        
        <aside className="w-[280px] bg-[#f4f6fa] border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="h-20 flex items-center px-6 border-b border-gray-200">
            <Link href="/dashboard" className="mr-3 text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-base font-semibold text-gray-900">API Documentation</h1>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-6 px-4">
            <div className="mb-6">
              <button 
                onClick={() => setCategoriesOpen(prev => ({ ...prev, 'CRM': !prev['CRM'] }))}
                className="flex items-center text-sm font-semibold text-gray-900 mb-3 w-full text-left hover:text-blue-600 transition-colors"
              >
                <svg className={`w-4 h-4 mr-2 text-gray-500 transition-transform ${categoriesOpen['CRM'] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                CRM Endpoints
              </button>
              {categoriesOpen['CRM'] && (
                <ul className="space-y-1 pl-6">
                  {crmEndpoints.map((ep, idx) => {
                    const originalIndex = endpoints.indexOf(ep);
                    const isActive = activeSection === `ep-${originalIndex}`;
                    return (
                      <li key={idx}>
                        <a href={`#ep-${originalIndex}`} className={`text-sm block truncate py-1.5 px-2 rounded transition-all border-l-2 ${isActive ? 'bg-indigo-50 text-indigo-700 border-indigo-500 font-medium' : 'text-gray-600 hover:text-gray-900 border-transparent hover:bg-gray-100'}`}>
                          <span className={`text-[10px] font-bold mr-1.5 ${getMethodColor(ep.method).replace('bg-[', 'text-[')}`}>{ep.method}</span>
                          {ep.title}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            
            <div>
              <button 
                onClick={() => setCategoriesOpen(prev => ({ ...prev, 'Condominios': !prev['Condominios'] }))}
                className="flex items-center text-sm font-semibold text-gray-900 mb-3 w-full text-left hover:text-blue-600 transition-colors"
              >
                <svg className={`w-4 h-4 mr-2 text-gray-500 transition-transform ${categoriesOpen['Condominios'] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                Condominium Endpoints
              </button>
              {categoriesOpen['Condominios'] && (
                <ul className="space-y-1 pl-6">
                  {condoEndpoints.map((ep, idx) => {
                    const originalIndex = endpoints.indexOf(ep);
                    const isActive = activeSection === `ep-${originalIndex}`;
                    return (
                      <li key={idx}>
                        <a href={`#ep-${originalIndex}`} className={`text-sm block truncate py-1.5 px-2 rounded transition-all border-l-2 ${isActive ? 'bg-indigo-50 text-indigo-700 border-indigo-500 font-medium' : 'text-gray-600 hover:text-gray-900 border-transparent hover:bg-gray-100'}`}>
                          <span className={`text-[10px] font-bold mr-1.5 ${getMethodColor(ep.method).replace('bg-[', 'text-[')}`}>{ep.method}</span>
                          {ep.title}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            
            <div>
              <button 
                onClick={() => setCategoriesOpen(prev => ({ ...prev, 'Pagos': !prev['Pagos'] }))}
                className="flex items-center text-sm font-semibold text-gray-900 mb-3 w-full text-left hover:text-blue-600 transition-colors"
              >
                <svg className={`w-4 h-4 mr-2 text-gray-500 transition-transform ${categoriesOpen['Pagos'] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                Pagos
              </button>
              {categoriesOpen['Pagos'] && (
                <ul className="space-y-1 pl-6">
                  {filteredEndpoints.filter(ep => ep.category === 'Pagos').map((ep, idx) => {
                    const originalIndex = endpoints.indexOf(ep);
                    const isActive = activeSection === `ep-${originalIndex}`;
                    return (
                      <li key={idx}>
                        <a href={`#ep-${originalIndex}`} className={`text-sm block truncate py-1.5 px-2 rounded transition-all border-l-2 ${isActive ? 'bg-indigo-50 text-indigo-700 border-indigo-500 font-medium' : 'text-gray-600 hover:text-gray-900 border-transparent hover:bg-gray-100'}`}>
                          <span className={`text-[10px] font-bold mr-1.5 ${getMethodColor(ep.method).replace('bg-[', 'text-[')}`}>{ep.method}</span>
                          {ep.title}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <button 
                onClick={() => setCategoriesOpen(prev => ({ ...prev, 'Admin': !prev['Admin'] }))}
                className="flex items-center text-sm font-semibold text-gray-900 mb-3 w-full text-left hover:text-blue-600 transition-colors"
              >
                <svg className={`w-4 h-4 mr-2 text-gray-500 transition-transform ${categoriesOpen['Admin'] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                Admin
              </button>
              {categoriesOpen['Admin'] && (
                <ul className="space-y-1 pl-6">
                  {filteredEndpoints.filter(ep => ep.category === 'Admin').map((ep, idx) => {
                    const originalIndex = endpoints.indexOf(ep);
                    const isActive = activeSection === `ep-${originalIndex}`;
                    return (
                      <li key={idx}>
                        <a href={`#ep-${originalIndex}`} className={`text-sm block truncate py-1.5 px-2 rounded transition-all border-l-2 ${isActive ? 'bg-indigo-50 text-indigo-700 border-indigo-500 font-medium' : 'text-gray-600 hover:text-gray-900 border-transparent hover:bg-gray-100'}`}>
                          <span className={`text-[10px] font-bold mr-1.5 ${getMethodColor(ep.method).replace('bg-[', 'text-[')}`}>{ep.method}</span>
                          {ep.title}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
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
                  <article key={index} id={`ep-${originalIndex}`} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow scroll-mt-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-2.5 py-1 rounded text-white text-xs font-bold uppercase tracking-wider ${getMethodColor(ep.method)}`}>
                        {ep.method}
                      </span>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                        {getCategoryIcon(ep.category)}
                        {ep.category}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{ep.title}</h3>
                    <p className="text-[15px] text-gray-700 leading-relaxed mb-4">{ep.description}</p>
                    <code className="text-sm font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded block mb-4">{ep.path}</code>

                    {ep.auth && (
                      <div className="flex items-center gap-2 mb-4 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                        <span className="font-medium">Autenticación:</span> {ep.auth}
                      </div>
                    )}

                    {ep.filters && ep.filters.length > 0 && (
                      <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 mb-2">
                          <Filter className="w-3.5 h-3.5" /> Filtros disponibles
                        </div>
                        <div className="space-y-1">
                          {ep.filters.map((filter, fIdx) => (
                            <div key={fIdx} className="text-xs text-amber-700">
                              <code className="bg-amber-100 px-1 rounded">{filter.example}</code>
                              <span className="ml-2 text-amber-600">- {filter.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl overflow-hidden border border-gray-200">
                      <div className="bg-[#E2E8F0] px-4 py-2.5 flex justify-between items-center">
                        <span className="text-sm text-gray-700 font-medium">Example Request</span>
                        <button onClick={() => handleCopy(ep.curl, `curl-${originalIndex}`)} className="text-gray-500 hover:text-gray-700 flex items-center gap-1.5 text-xs font-medium">
                          {copied === `curl-${originalIndex}` ? <><Check className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                        </button>
                      </div>
                      <div className="bg-[#1A202C] p-4 text-sm font-mono text-gray-300 overflow-x-auto">
                        <pre className="m-0"><code>{ep.curl}</code></pre>
                      </div>
                    </div>

                    {ep.responseJSON && (
                      <div className="rounded-xl overflow-hidden border border-gray-200 mt-4">
                        <div className="bg-[#E2E8F0] px-4 py-2.5">
                          <span className="text-sm text-gray-700 font-medium">Example Response</span>
                        </div>
                        <div className="bg-[#1A202C] p-4 text-sm font-mono text-gray-300 overflow-x-auto max-h-48">
                          <pre className="m-0"><code>{ep.responseJSON}</code></pre>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}