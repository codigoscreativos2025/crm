'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserCircle, LogOut, Filter, X, Settings } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface Stage {
    id: number;
    name: string;
    color?: string;
    funnelId: number;
}

interface Funnel {
    id: number;
    name: string;
    stages: Stage[];
}

interface Contact {
    id: number;
    phone: string;
    name: string | null;
    stageId: number | null;
    stage: Stage | null;
    messages: {
        body: string;
        timestamp: string;
    }[];
}

export default function Sidebar() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedFunnel, setSelectedFunnel] = useState<number | 'all'>('all');
    const [selectedStage, setSelectedStage] = useState<number | 'all'>('all');

    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Contacts
                const resContacts = await fetch('/api/contacts');
                if (resContacts.ok) {
                    setContacts(await resContacts.json());
                }
                // Fetch Funnels for Filter
                const resFunnels = await fetch('/api/funnels');
                if (resFunnels.ok) {
                    setFunnels(await resFunnels.json());
                }
            } catch (error) {
                console.error('Error al obtener datos', error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/login' });
    };

    // Filtros
    const filteredContacts = contacts.filter(c => {
        // Texto
        const matchesSearch = (c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm));

        // Embudo
        if (selectedFunnel !== 'all') {
            // Si el contacto no tiene stage, o su stage no pertenece al funnel seleccionado
            if (!c.stage) return false;
            if (c.stage.funnelId !== selectedFunnel) return false;
        }

        // Etapa
        if (selectedStage !== 'all') {
            if (c.stageId !== selectedStage) return false;
        }

        return matchesSearch;
    });

    const activeStages = selectedFunnel !== 'all'
        ? funnels.find(f => f.id === selectedFunnel)?.stages || []
        : [];

    return (
        <aside className="flex h-full w-full flex-col border-r border-gray-200 bg-white md:w-96">
            {/* Encabezado */}
            <div className="flex items-center justify-between bg-[#f0f2f5] p-3 px-4">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/profile" className="h-10 w-10 rounded-full bg-gray-300 cursor-pointer overflow-hidden relative group" title="Perfil">
                        <UserCircle className="h-full w-full text-gray-500" />
                    </Link>
                    <Link href="/dashboard/funnels" className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition" title="Gestionar Embudos">
                        <Settings className="h-5 w-5" />
                    </Link>
                </div>
                <div className="flex gap-4 text-gray-500">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        title="Filtrar"
                        className={`hover:text-whatsapp-teal ${showFilters ? 'text-whatsapp-teal' : ''}`}
                    >
                        <Filter className="h-5 w-5" />
                    </button>
                    <button onClick={handleLogout} title="Cerrar Sesión" className="hover:text-red-500">
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Panel de Filtros */}
            {showFilters && (
                <div className="bg-gray-50 p-2 border-b border-gray-200 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500">FILTROS</span>
                        <button onClick={() => {
                            setShowFilters(false);
                            setSelectedFunnel('all');
                            setSelectedStage('all');
                        }}><X className="h-4 w-4 text-gray-400" /></button>
                    </div>

                    <select
                        className="w-full p-1 text-sm border rounded text-gray-700"
                        value={selectedFunnel}
                        onChange={(e) => {
                            setSelectedFunnel(e.target.value === 'all' ? 'all' : Number(e.target.value));
                            setSelectedStage('all');
                        }}
                    >
                        <option value="all">Todos los Embudos</option>
                        {funnels.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>

                    {selectedFunnel !== 'all' && (
                        <select
                            className="w-full p-1 text-sm border rounded text-gray-700"
                            value={selectedStage}
                            onChange={(e) => setSelectedStage(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        >
                            <option value="all">Todas las Etapas</option>
                            {activeStages.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            {/* Barra de Búsqueda */}
            <div className="border-b border-gray-200 bg-white p-2">
                <div className="flex items-center rounded-lg bg-[#f0f2f5] px-2 py-1">
                    <input
                        type="text"
                        placeholder="Buscar o iniciar nuevo chat"
                        className="w-full bg-transparent px-2 py-1 text-sm outline-none text-gray-700 placeholder-gray-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Lista de Contactos */}
            <div className="flex-1 overflow-y-auto">
                {filteredContacts.map((contact) => (
                    <Link
                        key={contact.id}
                        href={`/dashboard/chat/${contact.id}`}
                        className="group flex cursor-pointer items-center border-b border-gray-100 p-3 hover:bg-[#f5f6f6]"
                    >
                        <div className="mr-4 h-12 w-12 flex-shrink-0 rounded-full bg-gray-300">
                            <div className="flex h-full w-full items-center justify-center text-white font-bold bg-whatsapp-teal rounded-full">
                                {contact.name ? contact.name.substring(0, 1).toUpperCase() : '#'}
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden border-b border-gray-100 pb-3 pr-3 group-hover:border-none">
                            <div className="flex justify-between">
                                <span className="truncate text-base font-normal text-gray-900">
                                    {contact.name || contact.phone}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {contact.messages[0] ? new Date(contact.messages[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <p className="truncate text-sm text-gray-500 max-w-[140px]">
                                    {contact.messages[0]?.body || 'Inicia una conversación'}
                                </p>
                                {contact.stage && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">
                                        {contact.stage.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
                {filteredContacts.length === 0 && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        No se encontraron contactos.
                    </div>
                )}
            </div>
        </aside>
    );
}
