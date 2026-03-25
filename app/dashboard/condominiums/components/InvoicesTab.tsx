'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Plus, Trash2, Search, Eye, Calendar } from 'lucide-react';

export default function InvoicesTab({ condoId }: { condoId: number }) {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Generate form
    const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [generating, setGenerating] = useState(false);

    // Editor
    const [editingInvoice, setEditingInvoice] = useState<any>(null);

    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    useEffect(() => {
        fetchInvoices();
    }, [condoId]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/condominiums/${condoId}/invoices`);
            if (res.ok) setInvoices(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm(`¿Generar la factura del mes ${monthNames[month-1]} ${year}? Se calculará automáticamente a partir de los egresos registrados y costos fijos.`)) return;
        
        setGenerating(true);
        try {
            const res = await fetch(`/api/condominiums/${condoId}/invoices/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month, year })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Factura generada. Total: $${data.invoice.amount.toFixed(2)}`);
                fetchInvoices();
            } else {
                alert(data.error || 'Error generando factura.');
            }
        } catch (error) {
            alert('Error al conectar con el servidor.');
        }
        setGenerating(false);
    };

    const handleDelete = async (invoiceId: number) => {
        if (!confirm('¿Eliminar esta factura? Podrá regenerarla después.')) return;
        try {
            const res = await fetch(`/api/condominiums/${condoId}/invoices?invoiceId=${invoiceId}`, { method: 'DELETE' });
            if (res.ok) fetchInvoices();
        } catch (e) { console.error(e); }
    };

    const openEditor = async (inv: any) => {
        try {
            const res = await fetch(`/api/condominiums/${condoId}/invoices/${inv.id}`);
            if (res.ok) {
                const data = await res.json();
                setEditingInvoice(data);
            }
        } catch(e) { console.error(e); }
    };

    if (editingInvoice) {
        return <InvoiceEditor
            invoice={editingInvoice}
            condoId={condoId}
            onClose={() => { setEditingInvoice(null); fetchInvoices(); }}
        />;
    }

    return (
        <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl flex flex-col md:flex-row gap-6 justify-between items-center">
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                        <FileText className="h-6 w-6 text-indigo-600" /> Factura Mensual
                    </h2>
                    <p className="text-sm text-indigo-700 mt-1">
                        Genera una factura mensual basada en los egresos registrados y costos fijos configurados. Solo se permite una factura por mes.
                    </p>
                </div>
                
                <form onSubmit={handleGenerate} className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100 flex flex-wrap gap-3 items-end w-full md:w-auto">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Mes</label>
                        <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="border rounded p-1.5 text-sm outline-none focus:border-indigo-500">
                            {monthNames.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Año</label>
                        <input required type="number" min="2020" value={year} onChange={e=>setYear(Number(e.target.value))} className="w-20 border rounded p-1.5 text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <button disabled={generating} type="submit" className={`px-4 py-1.5 bg-indigo-600 text-white font-medium rounded text-sm hover:bg-indigo-700 transition-colors ${generating ? 'opacity-50 pointer-events-none' : ''}`}>
                        {generating ? 'Generando...' : 'Generar Factura'}
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" /> Facturas Generadas
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Periodo</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Conceptos</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center p-8 text-gray-500"><div className="animate-spin inline-block h-6 w-6 border-b-2 border-indigo-600 rounded-full"></div></td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={6} className="text-center p-8 text-gray-500">No hay facturas generadas.</td></tr>
                            ) : invoices.map((inv) => {
                                let itemCount = 0;
                                try { itemCount = JSON.parse(inv.lineItems || '[]').length; } catch(e){}
                                return (
                                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            #{inv.id.toString().padStart(6, '0')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {monthNames[inv.month - 1]} {inv.year}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                            ${inv.amount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {itemCount} conceptos
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(inv.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => openEditor(inv)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded transition-colors">
                                                    <Eye className="h-4 w-4" /> Ver
                                                </button>
                                                <a 
                                                    href={`/api/condominiums/${condoId}/invoices/${inv.id}/pdf`}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition-colors"
                                                >
                                                    <Download className="h-4 w-4" /> PDF
                                                </a>
                                                <a 
                                                    href={`/api/condominiums/${condoId}/invoices/${inv.id}/template`}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded transition-colors"
                                                >
                                                    <FileText className="h-4 w-4" /> Plantilla
                                                </a>
                                                <button onClick={() => handleDelete(inv.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   INVOICE EDITOR — WYSIWYG-style with drag-and-drop + font controls
   ═══════════════════════════════════════════════════════════ */

interface LineItem {
    concept: string;
    amount: number;
}

interface TemplateConfig {
    headerTitle: string;
    headerFont: string;
    headerSize: number;
    bodyFont: string;
    bodySize: number;
    footerText: string;
    footerSize: number;
}

function InvoiceEditor({ invoice, condoId, onClose }: { invoice: any; condoId: number; onClose: () => void }) {
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    const [template, setTemplate] = useState<TemplateConfig>({
        headerTitle: 'ESTADO DE CUENTA',
        headerFont: 'Helvetica',
        headerSize: 18,
        bodyFont: 'Helvetica',
        bodySize: 11,
        footerText: 'Gracias por su puntualidad.',
        footerSize: 10
    });

    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const fontOptions = ['Helvetica', 'Times', 'Courier'];
    const sizeOptions = [8,9,10,11,12,14,16,18,20,22,24];

    useEffect(() => {
        // Parse line items
        if (invoice.lineItems) {
            try { setLineItems(JSON.parse(invoice.lineItems)); } catch(e) {}
        }
        setNotes(invoice.notes || '');

        // Parse template from condominium
        if (invoice.condominium?.invoiceTemplate) {
            try {
                const t = JSON.parse(invoice.condominium.invoiceTemplate);
                setTemplate(prev => ({ ...prev, ...t }));
            } catch(e) {}
        }
    }, [invoice]);

    const total = lineItems.reduce((s, i) => s + i.amount, 0);

    // --- Drag & Drop ---
    const handleDragStart = (idx: number) => { setDragIdx(idx); };
    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === idx) return;
        const newItems = [...lineItems];
        const [dragged] = newItems.splice(dragIdx, 1);
        newItems.splice(idx, 0, dragged);
        setLineItems(newItems);
        setDragIdx(idx);
    };
    const handleDragEnd = () => { setDragIdx(null); };

    const handleSaveInvoice = async () => {
        setSaving(true);
        try {
            await fetch(`/api/condominiums/${condoId}/invoices/${invoice.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes, lineItems: JSON.stringify(lineItems) })
            });
            alert('Factura actualizada.');
        } catch(e) { alert('Error guardando.'); }
        setSaving(false);
    };

    const handleSaveTemplate = async () => {
        setSavingTemplate(true);
        try {
            await fetch(`/api/condominiums/${condoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceTemplate: JSON.stringify(template) })
            });
            alert('Plantilla de factura guardada. Se aplicará a todas las facturas nuevas.');
        } catch(e) { alert('Error guardando plantilla.'); }
        setSavingTemplate(false);
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex justify-between items-center">
                <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1">
                    ← Volver a Facturas
                </button>
                <div className="flex gap-2">
                    <button onClick={handleSaveInvoice} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
                        {saving ? 'Guardando...' : '💾 Guardar Factura'}
                    </button>
                    <button onClick={handleSaveTemplate} disabled={savingTemplate} className="px-4 py-2 bg-gray-700 text-white rounded text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
                        {savingTemplate ? 'Guardando...' : '🎨 Guardar Plantilla'}
                    </button>
                    <a
                        href={`/api/condominiums/${condoId}/invoices/${invoice.id}/pdf`}
                        target="_blank"
                        className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 transition-colors inline-flex items-center gap-1"
                    >
                        <Download className="h-4 w-4" /> Descargar PDF
                    </a>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Font Controls */}
                <div className="space-y-4">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 border-b pb-2">🎨 Estilo de Encabezado</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Fuente</label>
                                <select value={template.headerFont} onChange={e => setTemplate({...template, headerFont: e.target.value})} className="w-full border rounded p-1.5 text-sm">
                                    {fontOptions.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Tamaño</label>
                                <select value={template.headerSize} onChange={e => setTemplate({...template, headerSize: Number(e.target.value)})} className="w-full border rounded p-1.5 text-sm">
                                    {sizeOptions.map(s => <option key={s} value={s}>{s}pt</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 border-b pb-2">📝 Estilo del Cuerpo</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Fuente</label>
                                <select value={template.bodyFont} onChange={e => setTemplate({...template, bodyFont: e.target.value})} className="w-full border rounded p-1.5 text-sm">
                                    {fontOptions.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Tamaño</label>
                                <select value={template.bodySize} onChange={e => setTemplate({...template, bodySize: Number(e.target.value)})} className="w-full border rounded p-1.5 text-sm">
                                    {sizeOptions.map(s => <option key={s} value={s}>{s}pt</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 border-b pb-2">📎 Pie de Página</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Tamaño</label>
                                <select value={template.footerSize} onChange={e => setTemplate({...template, footerSize: Number(e.target.value)})} className="w-full border rounded p-1.5 text-sm">
                                    {sizeOptions.map(s => <option key={s} value={s}>{s}pt</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 border-b pb-2">📝 Notas</h3>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Notas adicionales para la factura..."
                            className="w-full border rounded p-2 text-sm outline-none focus:border-indigo-500 min-h-[80px]"
                        />
                    </div>
                </div>

                {/* RIGHT: Live Preview */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gray-100 px-6 py-3 border-b flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500 uppercase">Vista Previa — Factura #{invoice.id.toString().padStart(6,'0')}</span>
                            <span className="text-xs text-gray-400">Los cambios se reflejan en tiempo real</span>
                        </div>

                        <div className="p-8" style={{ fontFamily: getFontFamily(template.bodyFont) }}>
                            {/* Header */}
                            <div className="text-center mb-4">
                                <input
                                    type="text"
                                    value={template.headerTitle}
                                    onChange={e => setTemplate({...template, headerTitle: e.target.value})}
                                    className="text-center font-bold outline-none border-b-2 border-transparent hover:border-indigo-300 focus:border-indigo-500 transition-colors bg-transparent w-full"
                                    style={{ fontFamily: getFontFamily(template.headerFont), fontSize: `${template.headerSize}px` }}
                                />
                            </div>

                            <div className="font-bold mb-1" style={{ fontFamily: getFontFamily(template.headerFont), fontSize: `${template.headerSize - 4}px` }}>
                                {invoice.condominium?.name?.toUpperCase() || 'CONDOMINIO'}
                            </div>

                            <div className="text-gray-600 mb-1" style={{ fontSize: `${template.bodySize}px` }}>
                                Periodo: {monthNames[invoice.month - 1]} {invoice.year}
                            </div>

                            <div className="flex justify-between mb-6 text-gray-600" style={{ fontSize: `${template.bodySize}px` }}>
                                <div>
                                    <span className="font-bold">Factura N°:</span> {invoice.id.toString().padStart(6, '0')}<br/>
                                    <span className="font-bold">Fecha:</span> {new Date(invoice.createdAt).toLocaleDateString()}<br/>
                                    <span className="font-bold">Estatus:</span> {invoice.status === 'PAID' ? 'PAGADA' : 'GENERADA'}
                                </div>
                            </div>

                            {/* Line Items Table — Draggable */}
                            <div className="border rounded-lg overflow-hidden mb-6">
                                <table className="w-full" style={{ fontSize: `${template.bodySize}px` }}>
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="px-4 py-2 text-left font-bold text-gray-700" style={{ fontSize: `${template.bodySize}px` }}>CONCEPTO</th>
                                            <th className="px-4 py-2 text-right font-bold text-gray-700" style={{ fontSize: `${template.bodySize}px` }}>IMPORTE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lineItems.map((item, idx) => (
                                            <tr
                                                key={idx}
                                                draggable
                                                onDragStart={() => handleDragStart(idx)}
                                                onDragOver={(e) => handleDragOver(e, idx)}
                                                onDragEnd={handleDragEnd}
                                                className={`border-t cursor-grab active:cursor-grabbing transition-colors ${dragIdx === idx ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                                            >
                                                <td className="px-4 py-2.5 text-gray-800 flex items-center gap-2">
                                                    <span className="text-gray-300 text-xs select-none">⠿</span>
                                                    {item.concept}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-gray-800 font-medium">
                                                    ${item.amount.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="border-t-2 border-gray-300 bg-gray-50">
                                            <td className="px-4 py-3 text-right font-bold text-gray-900" style={{ fontSize: `${template.bodySize + 1}px` }}>
                                                TOTAL:
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-900" style={{ fontSize: `${template.bodySize + 1}px` }}>
                                                ${total.toFixed(2)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Notes */}
                            {notes && (
                                <div className="italic text-gray-600 mb-4" style={{ fontSize: `${template.bodySize}px` }}>
                                    Notas: {notes}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="text-center mt-8">
                                <input
                                    type="text"
                                    value={template.footerText}
                                    onChange={e => setTemplate({...template, footerText: e.target.value})}
                                    className="text-center italic text-gray-500 outline-none border-b-2 border-transparent hover:border-gray-300 focus:border-indigo-500 transition-colors bg-transparent w-full"
                                    style={{ fontSize: `${template.footerSize}px` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getFontFamily(font: string): string {
    switch(font) {
        case 'Times': return '"Times New Roman", Times, serif';
        case 'Courier': return '"Courier New", Courier, monospace';
        default: return 'Helvetica, Arial, sans-serif';
    }
}
