'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Terminal, Copy, Check, Code, Server, Database } from 'lucide-react';
import EscNavHandler from '@/components/EscNavHandler';

const endpoints = [
  {
    method: 'GET',
    path: '/api/v1/contacts',
    title: 'Obtener Contactos',
    description: 'Recupera la lista de leads vinculados a tu cuenta. Retorna información, estado de validación de nombre, y si la IA está pausada.',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/v1/contacts?userApiKey=TU_API_KEY" \\
  -H "Accept: application/json"`,
    responseJSON: `[
  {
    "id": 12,
    "phone": "5212345678",
    "name": "Juan Perez",
    "nameConfirmed": true,
    "aiDisabledUntil": null,
    "stageId": 3,
    "createdAt": "2024-03-01T12:00:00.000Z"
  }
]`
  },
  {
    method: 'GET',
    path: '/api/v1/contacts?phone={phone}',
    title: 'Buscar Contacto por Teléfono',
    description: 'Busca un contacto específico mediante su número. Útil dentro del flujo de n8n para verificar registros existentes de leads.',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/v1/contacts?userApiKey=TU_API_KEY&phone=5212345678" \\
  -H "Accept: application/json"`,
    responseJSON: `{
  "id": 12,
  "phone": "5212345678",
  "name": "Juan Perez",
  "nameConfirmed": true,
  "aiDisabledUntil": "2024-03-01T13:00:00.000Z",
  "stage": {
    "id": 3,
    "name": "Negociación"
  }
}`
  },
  {
    method: 'PATCH',
    path: '/api/contacts/{id}',
    title: 'Actualizar Lead (Etapa, Embudo, Nombre, Pausar IA)',
    description: 'Actualiza propiedades vitales de un Lead. Puedes moverlo de etapa, confirmar su nombre, o deshabilitar/habilitar temporalmente las respuestas de la IA.',
    curl: `curl -X PATCH "https://crm.pivotsoluciones.com/api/contacts/12" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Juan Perez Confirmado",
    "stageId": 4,
    "disableAI": true
  }'`,
    requestJSON: `{
  "name": "Juan Perez Confirmado", // Opcional: Actualiza y confirma el nombre
  "stageId": 4,                    // Opcional: ID de la nueva etapa
  "disableAI": true                // Opcional: true pausa la IA según config., false la reactiva
}`,
    responseJSON: `{
  "id": 12,
  "phone": "5212345678",
  "name": "Juan Perez Confirmado",
  "nameConfirmed": true,
  "aiDisabledUntil": "2024-03-01T13:00:00.000Z",
  "stageId": 4
}`
  },
  {
    method: 'POST',
    path: '/api/messages',
    title: 'Enviar Mensaje (API Interna)',
    description: 'Registra un mensaje enviado desde el CRM y dispara el Webhook hacia n8n para su entrega física por WhatsApp.',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/messages" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contactId": 12,
    "body": "Hola Juan, te envío la cotización adjunta.",
    "direction": "outbound",
    "status": "sent"
  }'`,
    requestJSON: `{
  "contactId": 12,                  // ID Interno del Contacto
  "body": "Texto del mensaje...", // Contenido del mensaje
  "direction": "outbound",
  "status": "sent"
}`,
    responseJSON: `{
  "id": 1024,
  "contactId": 12,
  "body": "Hola Juan, te envío la cotización adjunta.",
  "direction": "outbound",
  "status": "sent",
  "isReadByAgent": true,
  "timestamp": "2024-03-01T12:05:00.000Z"
}`
  },
  {
    method: 'POST',
    path: '/api/webhook/whatsapp',
    title: 'Recibir Mensaje (Webhook Evolution API / Meta)',
    description: 'Endpoint destinado para recibir payloads de plataformas de WhatsApp (WABA / Evolution API). Registra los mensajes entrantes en el CRM.',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/webhook/whatsapp" \\
  -H "Content-Type: application/json" \\
  -d '{
    "data": {
       "key": { "remoteJid": "5212345678@s.whatsapp.net", "fromMe": false },
       "pushName": "Juan Perez",
       "message": { "conversation": "Hola, necesito más información." }
    }
  }'`,
    requestJSON: `// Ver documentación de Evolution API para objetos complejos
{
  "data": {
     "key": { "remoteJid": "NUMERO@s.whatsapp.net", "fromMe": false },
     "pushName": "Nombre Whatsapp",
     "message": { "conversation": "Texto del mensaje" }
  }
}`
  }
];

export default function ApiDocsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'POST': return 'bg-whatsapp-green/20 text-whatsapp-green border-whatsapp-green/30';
      case 'PATCH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full overflow-y-auto">
      <EscNavHandler />

      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 bg-white shadow-sm border border-gray-200 p-2.5 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            Developer API <span className="text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded-full font-medium border border-gray-200">v1.0</span>
          </h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Documentación integral estilo Swagger/Kommo para integrar el CRM con n8n, Evolution API, y sistemas externos.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* Sidebar Nav (Optional/Desktop) */}
        <div className="hidden lg:block w-64 shrink-0 sticky top-8">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Endpoints Registrados</h3>
          <ul className="space-y-1 border-l-2 border-gray-100">
            {endpoints.map((ep, idx) => (
              <li key={idx}>
                <a href={`#ep-${idx}`} className="flex items-center block py-2 px-4 text-sm text-gray-600 hover:text-whatsapp-green hover:bg-whatsapp-green/5 border-l-2 border-transparent hover:border-whatsapp-green -ml-[2px] transition-all">
                  <span className={`text-[10px] font-bold w-10 ${ep.method === 'GET' ? 'text-blue-600' : ep.method === 'POST' ? 'text-whatsapp-green' : 'text-orange-600'}`}>{ep.method}</span>
                  <span className="truncate">{ep.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-12 pb-20 w-full">
          {endpoints.map((ep, index) => (
            <div id={`ep-${index}`} key={index} className="scroll-mt-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col xl:flex-row">

                {/* Left Side: Info & Params */}
                <div className="p-6 xl:w-5/12 border-b xl:border-b-0 xl:border-r border-gray-100 flex flex-col justify-between bg-gray-50/30">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-md border ${getMethodColor(ep.method)}`}>
                        {ep.method}
                      </span>
                      <code className="text-sm font-bold text-gray-800 break-all">{ep.path}</code>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-3">{ep.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-6">{ep.description}</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400 font-medium">
                    <Server className="w-4 h-4" /> crm.pivotsoluciones.com
                  </div>
                </div>

                {/* Right Side: Code Blocks */}
                <div className="p-6 xl:w-7/12 bg-[#0F111A] text-gray-300 w-full">

                  {/* cURL Block */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Example Request (cURL)</span>
                      <button
                        onClick={() => handleCopy(ep.curl, `curl-${index}`)}
                        className="text-gray-500 hover:text-white transition-colors flex items-center gap-1 text-xs font-medium"
                      >
                        {copied === `curl-${index}` ? <><Check className="h-3 w-3 text-whatsapp-green" /> Copiado</> : <><Copy className="h-3 w-3" /> Copiar</>}
                      </button>
                    </div>
                    <pre className="bg-[#1A1D27] p-4 rounded-xl overflow-x-auto text-sm font-mono text-green-400 border border-gray-800">
                      <code>{ep.curl}</code>
                    </pre>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Request Body JSON */}
                    {ep.requestJSON && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payload Body</span>
                          <button onClick={() => handleCopy(ep.requestJSON!, `req-${index}`)} className="text-gray-500 hover:text-white transition-colors">
                            {copied === `req-${index}` ? <Check className="h-3 w-3 text-whatsapp-green" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                        <pre className="bg-[#1A1D27] p-4 rounded-xl overflow-x-auto text-xs font-mono text-blue-300 border border-gray-800 h-48">
                          <code>{ep.requestJSON}</code>
                        </pre>
                      </div>
                    )}

                    {/* Response JSON */}
                    {ep.responseJSON && (
                      <div className={ep.requestJSON ? "" : "md:col-span-2"}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-whatsapp-green"></div> Response (200 OK)</span>
                          <button onClick={() => handleCopy(ep.responseJSON, `res-${index}`)} className="text-gray-500 hover:text-white transition-colors">
                            {copied === `res-${index}` ? <Check className="h-3 w-3 text-whatsapp-green" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                        <pre className="bg-[#1A1D27] p-4 rounded-xl overflow-x-auto text-xs font-mono text-yellow-300 border border-gray-800 h-48">
                          <code>{ep.responseJSON}</code>
                        </pre>
                      </div>
                    )
                    }
                  </div >

                </div >
              </div >
            </div >
          ))}
        </div >
      </div >
    </div >
  );
}

