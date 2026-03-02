'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Terminal, Copy, Check } from 'lucide-react';

const endpoints = [
  {
    method: 'GET',
    path: '/api/v1/contacts',
    title: 'Obtener Contactos',
    description: 'Recupera la lista de leads vinculados a tu cuenta. Retorna información, estado de validación de nombre, y si la IA está pausada.',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/v1/contacts?userApiKey=TU_API_KEY" \\
  -H "Accept: application/json"`
  },
  {
    method: 'GET',
    path: '/api/v1/contacts?phone=521...',
    title: 'Buscar Contacto por Teléfono',
    description: 'Busca un contacto específico mediante su número. Útil dentro del flujo de n8n para verificar registros existentes.',
    curl: `curl -X GET "https://crm.pivotsoluciones.com/api/v1/contacts?userApiKey=TU_API_KEY&phone=5212345678" \\
  -H "Accept: application/json"`
  },
  {
    method: 'POST',
    path: '/api/webhook/whatsapp',
    title: 'Webhook Entrada de WhatsApp',
    description: 'Endpoint hacia el cual debe dirigirse el webhook de Evolution API o WABA para notificar nuevos mensajes de los contactos.',
    curl: `curl -X POST "https://crm.pivotsoluciones.com/api/webhook/whatsapp" \\
  -H "Content-Type: application/json" \\
  -d '{
    "data": {
       "key": { "remoteJid": "5212345678@s.whatsapp.net", "fromMe": false },
       "pushName": "John Doe",
       "message": { "conversation": "Hola, necesito información" }
    }
  }'`
  }
];

export default function ApiDocsPage() {
  const [copied, setCopied] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 bg-white shadow-sm p-2 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Terminal className="h-6 w-6 text-purple-600" /> Documentación API & Endpoints
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Referencia de integración técnica y cURLS para conexiones externas.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {endpoints.map((ep, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${ep.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {ep.method}
              </span>
              <code className="text-sm font-mono text-gray-700">{ep.path}</code>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{ep.title}</h3>
              <p className="text-gray-600 mb-6">{ep.description}</p>

              <div className="relative group">
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => handleCopy(ep.curl, index)}
                    className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                    title="Copiar código"
                  >
                    {copied === index ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <pre className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-sm font-mono leading-relaxed">
                  <code>{ep.curl}</code>
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
