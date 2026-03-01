'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Stage {
    id: number;
    name: string;
}

interface Funnel {
    id: number;
    name: string;
    stages: Stage[];
}

export default function FunnelSelector({ contactId, currentStageId }: { contactId: number; currentStageId: number | null }) {
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [selectedStageId, setSelectedStageId] = useState<number | null>(currentStageId);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchFunnels = async () => {
            try {
                const res = await fetch('/api/funnels');
                if (res.ok) {
                    const data = await res.json();
                    setFunnels(data);
                }
            } catch (error) {
                console.error('Error al obtener embudos', error);
            } finally {
                setLoading(false);
            }
        };
        fetchFunnels();
    }, []);

    const handleStageChange = async (stageId: number) => {
        try {
            const res = await fetch(`/api/contacts/${contactId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stageId }),
            });

            if (res.ok) {
                setSelectedStageId(stageId);
                setIsOpen(false);
            }
        } catch (error) {
            console.error('Error actualizando etapa', error);
        }
    };

    const currentStageName = funnels
        .flatMap(f => f.stages)
        .find(s => s.id === selectedStageId)?.name || 'Sin Etapa';

    if (loading) return <div className="text-xs text-gray-400">Cargando...</div>;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-sm bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 text-gray-700"
            >
                <span>{currentStageName}</span>
                <ChevronDown className="h-4 w-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                        {funnels.map((funnel) => (
                            <div key={funnel.id}>
                                <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                                    {funnel.name}
                                </div>
                                {funnel.stages.map((stage) => (
                                    <button
                                        key={stage.id}
                                        onClick={() => handleStageChange(stage.id)}
                                        className={`block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${selectedStageId === stage.id ? 'bg-green-50 text-green-700 font-medium' : ''
                                            }`}
                                    >
                                        {stage.name}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
