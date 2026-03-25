'use client';

import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, FileText, Upload, Trash2, Edit, ChevronDown, Calendar, Pin, Save, X } from 'lucide-react';

export default function TransactionsTab({ condoId, type }: { condoId: number, type: 'INCOME' | 'EXPENSE' }) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [residents, setResidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<string[]>([]);

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ category: '', amount: '', description: '', residentId: '', status: 'PENDING', date: new Date().toISOString().substring(0, 10), isFixed: false });

    const [uploadingReceipt, setUploadingReceipt] = useState<number | null>(null);

    // Month filter
    const [filterMonth, setFilterMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    // Inline editing
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editAmount, setEditAmount] = useState('');

    useEffect(() => {
        fetchData();
    }, [type, condoId, filterMonth]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Parse filterMonth to get date range
            const [year, month] = filterMonth.split('-').map(Number);
            const startDate = new Date(year, month - 1, 1).toISOString();
            const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

            const [tRes, rRes, settingsRes] = await Promise.all([
                fetch(`/api/condominiums/${condoId}/transactions?type=${type}&startDate=${startDate}&endDate=${endDate}`),
                type === 'INCOME' ? fetch(`/api/condominiums/${condoId}/residents`) : Promise.resolve(null),
                fetch(`/api/condominiums/${condoId}`)
            ]);

            if (tRes.ok) setTransactions(await tRes.json());
            if (rRes && rRes.ok) setResidents(await rRes.json());
            if (settingsRes.ok) {
                const data = await settingsRes.json();
                const catKey = type === 'INCOME' ? 'incomeCategories' : 'expenseCategories';
                if (data[catKey]) {
                    try { 
                        const parsed = JSON.parse(data[catKey]);
                        if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
                    } catch(e) {}
                }
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { ...form, type };
            if (type === 'INCOME' && form.residentId) {
                payload.residentId = form.residentId;
            } else {
                delete payload.residentId;
            }
            if (type === 'EXPENSE') {
                payload.isFixed = form.isFixed;
            }

            const res = await fetch(`/api/condominiums/${condoId}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                setForm({ category: '', amount: '', description: '', residentId: '', status: 'PENDING', date: new Date().toISOString().substring(0, 10), isFixed: false });
                fetchData();
            }
        } catch (e) {}
    };

    const handleStatusToggle = async (tId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'PENDING' ? 'RECONCILED' : 'PENDING';
        try {
            await fetch(`/api/condominiums/${condoId}/transactions/${tId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            fetchData();
        } catch (e) {}
    };

    const handleDelete = async (tId: number) => {
        if(!confirm('¿Eliminar transacción de forma permanente?')) return;
        try {
            await fetch(`/api/condominiums/${condoId}/transactions/${tId}`, { method: 'DELETE' });
            fetchData();
        } catch (e) {}
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tId: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingReceipt(tId);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`/api/condominiums/${condoId}/transactions/${tId}/receipt`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                fetchData();
            }
        } catch(e) {
            alert('Error subiendo archivo');
        } finally {
            setUploadingReceipt(null);
            e.target.value = '';
        }
    };

    const handleStartEdit = (t: any) => {
        setEditingId(t.id);
        setEditAmount(t.amount.toString());
    };

    const handleSaveAmount = async (tId: number) => {
        try {
            await fetch(`/api/condominiums/${condoId}/transactions/${tId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: parseFloat(editAmount) })
            });
            setEditingId(null);
            fetchData();
        } catch(e) { alert('Error guardando.'); }
    };

    const formatCurrency = (val: number) => `$ ${val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}`;
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

    const bgColor = type === 'INCOME' ? 'bg-emerald-50' : 'bg-red-50';
    const textColor = type === 'INCOME' ? 'text-emerald-700' : 'text-red-700';
    const btnColor = type === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700';

    const pendingCount = transactions.filter(t => t.status === 'PENDING').length;
    const total = transactions.reduce((s: number, t: any) => s + t.amount, 0);

    // Default categories if none configured
    const defaultIncome = ['Cuota Mensual', 'Cuota Especial', 'Multa', 'Reserva', 'Otro Ingreso'];
    const defaultExpense = ['Servicios', 'Mantenimiento', 'Jardineria', 'Administracion', 'Seguridad', 'Gastos Bancarios', 'Otro Gasto'];
    const catOptions = categories.length > 0 ? categories : (type === 'INCOME' ? defaultIncome : defaultExpense);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">
                        {type === 'INCOME' ? 'Ingresos y Pagos' : 'Egresos y Gastos'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {pendingCount} por conciliar de {transactions.length} registros. Total: <span className="font-bold">{formatCurrency(total)}</span>
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    {/* Month Picker */}
                    <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <input 
                            type="month" 
                            value={filterMonth} 
                            onChange={e => setFilterMonth(e.target.value)}
                            className="text-sm outline-none bg-transparent font-medium text-gray-700"
                        />
                    </div>
                    <button 
                        onClick={() => setShowModal(true)}
                        className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-md shadow-sm transition-colors ${btnColor}`}
                    >
                        <Plus className="h-4 w-4" /> 
                        Nuevo {type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                    </button>
                </div>
            </div>

            {/* Modal de Creación */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className={`px-6 py-4 border-b ${bgColor}`}>
                            <h2 className={`font-bold ${textColor}`}>Registrar Nuevo {type === 'INCOME'? 'Ingreso':'Gasto'}</h2>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                                <input required type="number" step="0.01" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} className="w-full border p-2 rounded outline-none focus:border-indigo-500" placeholder="0.00" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                <select required value={form.category} onChange={e=>setForm({...form, category: e.target.value})} className="w-full border p-2 rounded outline-none focus:border-indigo-500">
                                    <option value="">Seleccione Categoría</option>
                                    {catOptions.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {type === 'INCOME' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Residente Asociado (Opcional)</label>
                                    <select value={form.residentId} onChange={e=>setForm({...form, residentId: e.target.value})} className="w-full border p-2 rounded outline-none focus:border-indigo-500">
                                        <option value="">Ninguno</option>
                                        {residents.map(r => (
                                            <option key={r.id} value={r.id}>{r.name} - {r.phone}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {type === 'EXPENSE' && (
                                <div className="flex items-center gap-3 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                    <input 
                                        type="checkbox" 
                                        id="isFixed" 
                                        checked={form.isFixed} 
                                        onChange={e => setForm({...form, isFixed: e.target.checked})}
                                        className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                                    />
                                    <label htmlFor="isFixed" className="text-sm text-amber-800 flex items-center gap-1.5">
                                        <Pin className="h-4 w-4" /> <strong>Gasto Fijo</strong> — Se replicará automáticamente cada mes
                                    </label>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                <input required type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="w-full border p-2 rounded outline-none focus:border-indigo-500"/>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto / Descripción Corta</label>
                                <input type="text" value={form.description} onChange={e=>setForm({...form, description: e.target.value})} className="w-full border p-2 rounded outline-none focus:border-indigo-500" placeholder="Referencia del pago..." />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded text-gray-700 text-sm hover:bg-gray-50">Cancelar</button>
                                <button type="submit" className={`px-4 py-2 text-white rounded text-sm ${btnColor}`}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Listado */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Detalle</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Soporte/Boucher</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={7} className="text-center p-8 text-gray-500"><div className="animate-spin inline-block h-6 w-6 border-b-2 border-indigo-600 rounded-full"></div></td></tr>
                        ) : transactions.length === 0 ? (
                            <tr><td colSpan={7} className="text-center p-10 text-gray-500">No hay registros para este mes.</td></tr>
                        ) : transactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-900">{formatDate(t.date)}</td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                                        {t.isFixed && <span title="Gasto Fijo"><Pin className="h-3.5 w-3.5 text-amber-500" /></span>}
                                        {t.description || 'Sin concepto'}
                                    </div>
                                    {t.resident && <div className="text-xs text-indigo-600 mt-1 font-medium bg-indigo-50 inline-block px-2 py-0.5 rounded-full">{t.resident.name}</div>}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{t.category}</td>
                                <td className={`px-6 py-4 text-sm font-bold text-right ${textColor}`}>
                                    {editingId === t.id ? (
                                        <div className="flex items-center gap-1 justify-end">
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                value={editAmount} 
                                                onChange={e => setEditAmount(e.target.value)}
                                                className="w-24 border rounded p-1 text-sm text-right outline-none focus:border-indigo-500"
                                                autoFocus
                                            />
                                            <button onClick={() => handleSaveAmount(t.id)} className="text-green-600 hover:text-green-800 p-1"><Save className="h-4 w-4" /></button>
                                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 p-1"><X className="h-4 w-4" /></button>
                                        </div>
                                    ) : (
                                        <span 
                                            className="cursor-pointer hover:underline"
                                            onClick={() => handleStartEdit(t)} 
                                            title="Click para editar monto"
                                        >
                                            {type==='EXPENSE'?'-':''}{formatCurrency(t.amount)}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {t.receiptUrl ? (
                                        <a href={t.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex flex-col items-center justify-center text-xs">
                                            <FileText className="h-5 w-5 mb-0.5" />
                                            Ver
                                        </a>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <input type="file" id={`upload-${t.id}`} className="hidden" onChange={(e) => handleFileUpload(e, t.id)} />
                                            <label htmlFor={`upload-${t.id}`} className="cursor-pointer text-gray-400 hover:text-indigo-600 flex flex-col items-center justify-center text-xs">
                                                {uploadingReceipt === t.id ? (
                                                    <div className="h-4 w-4 rounded-full border-b-2 border-indigo-600 animate-spin mb-1"></div>
                                                ) : (
                                                    <Upload className="h-4 w-4 mb-0.5" />
                                                )}
                                                Subir
                                            </label>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleStatusToggle(t.id, t.status)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${t.status === 'RECONCILED' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                                    >
                                        {t.status === 'RECONCILED' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                        {t.status === 'RECONCILED' ? 'Conciliado' : 'Por Conciliar'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right text-sm">
                                    <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
