'use client';

import { useState } from 'react';
import { Search, Eye, MessageSquare } from 'lucide-react';

interface Contact {
    id: number;
    name: string | null;
    phone: string;
    stage: { name: string; funnel: { name: string } } | null;
    user: { email: string };
    _count: { messages: number };
}

interface AdminContactListProps {
    initialContacts: Contact[];
}

export default function AdminContactList({ initialContacts }: AdminContactListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [loadingChat, setLoadingChat] = useState(false);

    const filteredContacts = initialContacts.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleViewChat = async (contact: Contact) => {
        setSelectedContact(contact);
        setLoadingChat(true);
        try {
            // We need a special admin endpoint or reuse existing if secured
            // For now, let's assume we can fetch by contactId if we are admin
            // But standard /api/messages checks session user owner.
            // We need a Server Action or new Admin API.
            // Let's use a new Admin API endpoint: /api/admin/messages?contactId=...
            const res = await fetch(`/api/admin/messages?contactId=${contact.id}`);
            if (res.ok) {
                const data = await res.json();
                setChatHistory(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingChat(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Gestión de Leads (Global)</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono o dueño..."
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 uppercase font-medium">
                        <tr>
                            <th className="px-6 py-3">Dueño</th>
                            <th className="px-6 py-3">Contacto</th>
                            <th className="px-6 py-3">Embudo / Etapa</th>
                            <th className="px-6 py-3">Mensajes</th>
                            <th className="px-6 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredContacts.map((contact) => (
                            <tr key={contact.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 font-medium text-gray-900">{contact.user.email}</td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{contact.name || "Sin Nombre"}</div>
                                    <div className="text-xs text-gray-500">{contact.phone}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {contact.stage ? (
                                        <div>
                                            <span className="block text-xs text-gray-500">{contact.stage.funnel.name}</span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                {contact.stage.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">Sin etapa</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {contact._count.messages}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleViewChat(contact)}
                                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1 text-xs font-medium bg-blue-50 px-2 py-1 rounded"
                                    >
                                        <Eye className="h-4 w-4" /> Ver Chat
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredContacts.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No se encontraron contactos.</div>
                )}
            </div>

            {/* Chat Viewer Modal */}
            {selectedContact && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <div>
                                <h3 className="font-bold text-gray-800">Historial de Chat</h3>
                                <p className="text-sm text-gray-500">Con: {selectedContact.name} ({selectedContact.phone})</p>
                            </div>
                            <button onClick={() => setSelectedContact(null)} className="text-gray-500 hover:text-gray-700 font-bold text-xl">&times;</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-[#efeae2] space-y-3">
                            {loadingChat ? (
                                <div className="text-center p-4">Cargando mensajes...</div>
                            ) : chatHistory.length > 0 ? (
                                chatHistory.map((msg: any) => (
                                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm text-sm ${msg.direction === 'outbound' ? 'bg-[#d9fdd3]' : 'bg-white'
                                            }`}>
                                            <p className="text-gray-900">{msg.body}</p>
                                            <div className="text-[10px] text-gray-500 text-right mt-1">
                                                {new Date(msg.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-500 italic">No hay mensajes registrados.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
