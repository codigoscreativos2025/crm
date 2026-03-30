'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, AlertCircle, HelpCircle, CheckCircle, Clock, XCircle, Send } from 'lucide-react';

interface SuggestionItem {
    id: number;
    type: string;
    description: string;
    status: string;
    adminNote: string | null;
    createdAt: string;
    resident: { id: number; name: string; phone: string };
}

export default function SuggestionsTab({ condoId }: { condoId: number }) {
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');
    const [editingNote, setEditingNote] = useState<{ id: number; note: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, [condoId, filterStatus, filterType]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = `/api/condominiums/${condoId}/suggestions`;
            const params = new URLSearchParams();
            if (filterStatus) params.append('status', filterStatus);
            if (filterType) params.append('type', filterType);
            if (params.toString()) url += `?${params.toString()}`;

            const res = await fetch(url);
            if (res.ok) {
                setSuggestions(await res.json());
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const updateStatus = async (id: number, status: string, note?: string) => {
        try {
            await fetch(`/api/condominiums/${condoId}/suggestions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, adminNote: note })
            });
            fetchData();
            setEditingNote(null);
        } catch (e) {
            alert('Error actualizando');
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'SUGERENCIA': return <MessageCircle className="h-4 w-4 text-blue-500" />;
            case 'RECLAMO': return <AlertCircle className="h-4 w-4 text-red-500" />;
            default: return <HelpCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDIENTE': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3" /> Pendiente</span>;
            case 'EN_PROCESO': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="h-3 w-3" /> En Proceso</span>;
            case 'ATENDIDA': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" /> Atendida</span>;
            case 'RECHAZADA': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="h-3 w-3" /> Rechazada</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Sugerencias, Reclamos y Otros</h2>
                    <p className="text-sm text-gray-500 mt-1">Gestiona las solicitudes de los residentes</p>
                </div>
                <div className="flex gap-2">
                    <select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">Todos los estados</option>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="EN_PROCESO">En Proceso</option>
                        <option value="ATENDIDA">Atendida</option>
                        <option value="RECHAZADA">Rechazada</option>
                    </select>
                    <select 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">Todos los tipos</option>
                        <option value="SUGERENCIA">Sugerencia</option>
                        <option value="RECLAMO">Reclamo</option>
                        <option value="OTRO">Otro</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="text-center p-8"><div className="animate-spin inline-block h-6 w-6 border-b-2 border-indigo-600 rounded-full"></div></div>
                ) : suggestions.length === 0 ? (
                    <div className="text-center p-10 text-gray-500">No hay sugerencias para mostrar</div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {suggestions.map((s) => (
                            <div key={s.id} className="p-4 hover:bg-gray-50">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        {getTypeIcon(s.type)}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">{s.resident.name}</span>
                                                <span className="text-sm text-gray-500">({s.resident.phone})</span>
                                            </div>
                                            <p className="text-sm text-gray-700 mt-1">{s.description}</p>
                                            <p className="text-xs text-gray-400 mt-1">{new Date(s.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {getStatusBadge(s.status)}
                                    </div>
                                </div>
                                
                                {s.adminNote && (
                                    <div className="mt-3 ml-7 bg-gray-50 p-2 rounded text-sm text-gray-600">
                                        <strong>Nota:</strong> {s.adminNote}
                                    </div>
                                )}

                                <div className="mt-3 ml-7 flex flex-wrap gap-2">
                                    {s.status === 'PENDIENTE' && (
                                        <>
                                            <button onClick={() => updateStatus(s.id, 'EN_PROCESO')} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Marcar En Proceso</button>
                                            <button onClick={() => { setEditingNote({ id: s.id, note: '' }); updateStatus(s.id, 'ATENDIDA', ''); }} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Marcar Atendida</button>
                                            <button onClick={() => { setEditingNote({ id: s.id, note: '' }); updateStatus(s.id, 'RECHAZADA', ''); }} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Rechazar</button>
                                        </>
                                    )}
                                    {s.status === 'EN_PROCESO' && (
                                        <>
                                            <button onClick={() => { setEditingNote({ id: s.id, note: '' }); updateStatus(s.id, 'ATENDIDA', ''); }} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Marcar Atendida</button>
                                            <button onClick={() => { setEditingNote({ id: s.id, note: '' }); updateStatus(s.id, 'RECHAZADA', ''); }} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Rechazar</button>
                                        </>
                                    )}
                                </div>

                                {editingNote?.id === s.id && (
                                    <div className="mt-3 ml-7 flex gap-2">
                                        <input 
                                            type="text" 
                                            value={editingNote.note}
                                            onChange={(e) => setEditingNote({ ...editingNote, note: e.target.value })}
                                            placeholder="Agregar nota (opcional)"
                                            className="flex-1 border rounded px-3 py-1 text-sm"
                                        />
                                        <button 
                                            onClick={() => updateStatus(s.id, s.status, editingNote.note)}
                                            className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                                        >
                                            Guardar
                                        </button>
                                        <button 
                                            onClick={() => setEditingNote(null)}
                                            className="px-3 py-1 border text-sm rounded hover:bg-gray-50"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
