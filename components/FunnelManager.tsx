'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash, Edit, Save, X, GripVertical } from 'lucide-react';

interface Stage {
    id: number;
    name: string;
    order: number;
}

interface Funnel {
    id: number;
    name: string;
    stages: Stage[];
}

export default function FunnelManager() {
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [newFunnelName, setNewFunnelName] = useState('');
    const [editingStage, setEditingStage] = useState<{ id: number, name: string } | null>(null);
    const [newStageName, setNewStageName] = useState<{ [funnelId: number]: string }>({});

    useEffect(() => {
        fetchFunnels();
    }, []);

    const fetchFunnels = async () => {
        try {
            const res = await fetch('/api/funnels');
            if (res.ok) {
                const data = await res.json();
                setFunnels(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFunnel = async () => {
        if (!newFunnelName.trim()) return;
        try {
            const res = await fetch('/api/funnels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newFunnelName })
            });
            if (res.ok) {
                setNewFunnelName('');
                fetchFunnels();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddStage = async (funnelId: number) => {
        const name = newStageName[funnelId];
        if (!name?.trim()) return;

        try {
            const res = await fetch(`/api/funnels/${funnelId}/stages?funnelId=${funnelId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, order: 99 }) // Backend handles order better if we send list, simplified for now
            });
            if (res.ok) {
                setNewStageName(prev => ({ ...prev, [funnelId]: '' }));
                fetchFunnels();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteStage = async (stageId: number) => {
        if (!confirm('¿Estás seguro de eliminar esta etapa? Si tiene contactos, no se podrá eliminar.')) return;
        try {
            const res = await fetch(`/api/stages/${stageId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchFunnels();
            } else {
                alert('No se puede eliminar la etapa (posiblemente tiene contactos asignados).');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateStage = async (stageId: number, name: string) => {
        try {
            const res = await fetch(`/api/stages/${stageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                setEditingStage(null);
                fetchFunnels();
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div>Cargando embudos...</div>;

    return (
        <div className="space-y-8">
            {/* Create Funnel */}
            <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                <input
                    type="text"
                    placeholder="Nuevo nombre de embudo..."
                    className="flex-1 p-2 border border-gray-300 rounded focus:border-whatsapp-green outline-none"
                    value={newFunnelName}
                    onChange={(e) => setNewFunnelName(e.target.value)}
                />
                <button
                    onClick={handleCreateFunnel}
                    className="bg-[#008069] text-white px-4 py-2 rounded hover:bg-[#006050] flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" /> Crear Embudo
                </button>
            </div>

            {/* List Funnels */}
            <div className="grid gap-6">
                {funnels.map(funnel => (
                    <div key={funnel.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-100 p-4 font-semibold text-gray-700 border-b border-gray-200 flex justify-between items-center">
                            <h3>{funnel.name}</h3>
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">ID: {funnel.id}</span>
                        </div>
                        <div className="p-4 space-y-3">
                            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Etapas</h4>
                            {funnel.stages.map(stage => (
                                <div key={stage.id} className="flex items-center gap-3 p-2 bg-white border border-gray-100 rounded hover:shadow-sm transition group">
                                    <GripVertical className="h-4 w-4 text-gray-300 cursor-move" />

                                    {editingStage?.id === stage.id ? (
                                        <div className="flex-1 flex items-center gap-2">
                                            <input
                                                autoFocus
                                                type="text"
                                                className="flex-1 border p-1 rounded text-sm"
                                                value={editingStage.name}
                                                onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                                            />
                                            <button onClick={() => handleUpdateStage(stage.id, editingStage.name)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save className="h-4 w-4" /></button>
                                            <button onClick={() => setEditingStage(null)} className="text-gray-500 hover:bg-gray-50 p-1 rounded"><X className="h-4 w-4" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="flex-1 text-gray-700 font-medium">{stage.name}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button onClick={() => setEditingStage({ id: stage.id, name: stage.name })} className="text-blue-500 hover:bg-blue-50 p-1 rounded" title="Editar"><Edit className="h-4 w-4" /></button>
                                                <button onClick={() => handleDeleteStage(stage.id)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Eliminar"><Trash className="h-4 w-4" /></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}

                            {/* Add Stage */}
                            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                <input
                                    type="text"
                                    placeholder="Nueva etapa..."
                                    className="flex-1 text-sm p-2 border border-blue-200 rounded focus:border-blue-500 outline-none"
                                    value={newStageName[funnel.id] || ''}
                                    onChange={(e) => setNewStageName({ ...newStageName, [funnel.id]: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddStage(funnel.id)}
                                />
                                <button
                                    onClick={() => handleAddStage(funnel.id)}
                                    className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded text-sm font-medium flex items-center gap-1"
                                >
                                    <Plus className="h-4 w-4" /> Agregar Etapa
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
