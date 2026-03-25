'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, CopyCheck, Search } from 'lucide-react';

export default function InvoicesTab({ condoId }: { condoId: number }) {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Generador form
    const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [amount, setAmount] = useState<string>('');
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, [condoId]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/condominiums/${condoId}/invoices`);
            if (res.ok) {
                setInvoices(await res.json());
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!confirm(`¿Generar facturas masivas para todos los residentes para el mes ${month}/${year}?`)) return;
        
        setGenerating(true);
        try {
            const res = await fetch(`/api/condominiums/${condoId}/invoices/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month, year, amount })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Se generaron ${data.generated} facturas exitosamente.`);
                fetchInvoices();
            } else {
                alert(data.error || 'Error generando facturas.');
            }
        } catch (error) {
            alert('Error al conectar con el servidor.');
        }
        setGenerating(false);
    };

    const filtered = invoices.filter(inv => {
        return inv.resident?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
               inv.resident?.phone?.includes(searchTerm);
    });

    return (
        <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl flex flex-col md:flex-row gap-6 justify-between items-center">
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                        <FileText className="h-6 w-6 text-indigo-600" /> Generador Masivo de Facturas
                    </h2>
                    <p className="text-sm text-indigo-700 mt-1">
                        Ejecuta este proceso una vez al mes. Creará automáticamente una factura en PDF para cada residente listado activo en este condominio.
                    </p>
                </div>
                
                <form onSubmit={handleGenerate} className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100 flex flex-wrap gap-3 items-end w-full md:w-auto">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Mes</label>
                        <input required type="number" min="1" max="12" value={month} onChange={e=>setMonth(Number(e.target.value))} className="w-16 border rounded p-1.5 text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Año</label>
                        <input required type="number" min="2020" value={year} onChange={e=>setYear(Number(e.target.value))} className="w-20 border rounded p-1.5 text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Importe ($)</label>
                        <input required type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="w-24 border rounded p-1.5 text-sm outline-none focus:border-indigo-500" placeholder="Ej: 1000" />
                    </div>
                    <button disabled={generating} type="submit" className={`px-4 py-1.5 bg-indigo-600 text-white font-medium rounded text-sm hover:bg-indigo-700 transition-colors ${generating ? 'opacity-50 pointer-events-none' : ''}`}>
                        {generating ? 'Generando...' : 'Generar Lote'}
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Facturas Emitidas</h3>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar residente..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded focus:border-indigo-500 outline-none transition"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Factura ID</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Residente</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Periodo</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Importe</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estatus</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Documento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center p-8 text-gray-500"><div className="animate-spin inline-block h-6 w-6 border-b-2 border-indigo-600 rounded-full"></div></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="text-center p-8 text-gray-500">No hay facturas emitidas.</td></tr>
                            ) : filtered.map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        #{inv.id.toString().padStart(6, '0')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-semibold text-gray-900">{inv.resident?.name}</div>
                                        <div className="text-xs text-gray-500">{inv.resident?.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {inv.month.toString().padStart(2, '0')} / {inv.year}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        ${inv.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {inv.status === 'PENDING' ? (
                                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Pendiente</span>
                                        ) : (
                                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 gap-1 items-center"><CopyCheck className="w-3 h-3"/> Pagada</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <a 
                                            href={`/api/condominiums/${condoId}/invoices/${inv.id}/pdf`}
                                            target="_blank"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition-colors"
                                        >
                                            <Download className="h-4 w-4" /> PDF
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
