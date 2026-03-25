'use client';

import { useState, useEffect } from 'react';
import { Clock, Filter, Phone, Monitor } from 'lucide-react';

export default function LogsTab({ condoId }: { condoId: number }) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterSource, setFilterSource] = useState<'ALL' | 'CRM' | 'WHATSAPP'>('ALL');

    useEffect(() => {
        fetchLogs();
    }, [condoId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/condominiums/${condoId}/logs`);
            if (res.ok) {
                setLogs(await res.json());
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const filteredLogs = logs.filter(log => filterSource === 'ALL' || log.source === filterSource);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-indigo-600" />
                    Historial de Operaciones
                </h2>

                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                    <Filter className="h-4 w-4 text-gray-500 ml-2" />
                    <select 
                        className="bg-transparent border-none text-sm font-medium text-gray-700 outline-none pr-2"
                        value={filterSource}
                        onChange={(e: any) => setFilterSource(e.target.value)}
                    >
                        <option value="ALL">Todo el Historial</option>
                        <option value="CRM">Operaciones en Panel (CRM)</option>
                        <option value="WHATSAPP">Operaciones vía WhatsApp (API)</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción Realizada</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Medio (Source)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {loading ? (
                            <tr><td colSpan={3} className="text-center p-8 text-gray-500"><div className="animate-spin inline-block h-6 w-6 border-b-2 border-indigo-600 rounded-full"></div></td></tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr><td colSpan={3} className="text-center p-8 text-gray-500">No hay registros para mostrar.</td></tr>
                        ) : filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(log.createdAt).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    {log.action}
                                    {log.details && <p className="text-xs text-gray-500 font-normal mt-0.5">{log.details}</p>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {log.source === 'WHATSAPP' ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <Phone className="h-3.5 w-3.5" /> WhatsApp
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            <Monitor className="h-3.5 w-3.5" /> Web CRM
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
