'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, CheckCircle, Clock, FileText, Upload, Trash2, Edit, ChevronDown, Calendar, Pin, Save, X, ExternalLink, Filter, Download, XCircle } from 'lucide-react';

interface TransactionItem {
    id: number;
    type: 'transaction' | 'payment';
    date: string;
    description: string | null;
    category?: string;
    amount: number;
    status: string;
    receiptUrl: string | null;
    receiptType?: string | null;
    resident?: { id: number; name: string; phone: string } | null;
    source?: string;
    month?: number | null;
    year?: number | null;
    isFixed?: boolean;
    residentId?: number;
    rejectionReason?: string | null;
    reference?: string | null;
    paymentMethodId?: number | null;
}

interface FilterState {
    residentId: string;
    category: string;
    source: string;
    status: string;
    dateFrom: string;
    dateTo: string;
    minAmount: string;
    maxAmount: string;
}

export default function TransactionsTab({ condoId, type }: { condoId: number, type: 'INCOME' | 'EXPENSE' }) {
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [residents, setResidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<string[]>([]);

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ category: '', amount: '', description: '', residentId: '', status: 'PENDING', date: new Date().toISOString().substring(0, 10), isFixed: false });

    const [uploadingReceipt, setUploadingReceipt] = useState<number | null>(null);

    // Month filter (main filter)
    const [filterMonth, setFilterMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    // Advanced filters
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        residentId: '',
        category: '',
        source: '',
        status: '',
        dateFrom: '',
        dateTo: '',
        minAmount: '',
        maxAmount: ''
    });

    // Inline editing
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingType, setEditingType] = useState<'transaction' | 'payment' | null>(null);
    const [editAmount, setEditAmount] = useState('');

    // Image modal
    const [imageModal, setImageModal] = useState<{ open: boolean; url: string; type: string }>({ open: false, url: '', type: '' });

    // Reconciliation modal
    const [reconcileModal, setReconcileModal] = useState<{ open: boolean; transactionId: number | null; residentId: number | null }>({ open: false, transactionId: null, residentId: null });
    const [rejectModal, setRejectModal] = useState<{ open: boolean; transactionId: number | null; residentId: number | null; reason: string }>({ open: false, transactionId: null, residentId: null, reason: '' });

    const getReceiptUrl = (receiptUrl: string | null): string => {
        if (!receiptUrl) return '';
        if (receiptUrl.startsWith('/api/files/')) return receiptUrl;
        if (receiptUrl.startsWith('/uploads/')) return receiptUrl;
        if (receiptUrl.startsWith('uploads/')) return `/${receiptUrl}`;
        return receiptUrl;
    };

    useEffect(() => {
        fetchData();
    }, [type, condoId, filterMonth]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [year, month] = filterMonth.split('-').map(Number);
            const startDate = new Date(year, month - 1, 1).toISOString();
            const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

            const [tRes, settingsRes] = await Promise.all([
                fetch(`/api/condominiums/${condoId}/transactions?type=${type}&startDate=${startDate}&endDate=${endDate}`),
                fetch(`/api/condominiums/${condoId}`)
            ]);

            const tData = tRes.ok ? await tRes.json() : [];
            const settingsData = settingsRes.ok ? await settingsRes.json() : {};
            
            const combinedData: TransactionItem[] = tData.map((t: any) => ({
                ...t,
                type: 'transaction' as const,
                source: t.source || 'web'
            }));

            setTransactions(combinedData);

            if (type === 'INCOME') {
                const rRes = await fetch(`/api/condominiums/${condoId}/residents`);
                if (rRes.ok) setResidents(await rRes.json());
            }

            const catKey = type === 'INCOME' ? 'incomeCategories' : 'expenseCategories';
            if (settingsData[catKey]) {
                try { 
                    const parsed = JSON.parse(settingsData[catKey]);
                    if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
                } catch(e) {}
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const getMonthName = (month: number) => {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return months[month - 1] || '';
    };

    // Apply filters
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (filters.residentId && t.residentId !== parseInt(filters.residentId)) return false;
            if (filters.category && t.category !== filters.category) return false;
            if (filters.source && t.source !== filters.source) return false;
            if (filters.status && t.status !== filters.status) return false;
            
            if (filters.dateFrom) {
                const itemDate = new Date(t.date);
                const fromDate = new Date(filters.dateFrom);
                if (itemDate < fromDate) return false;
            }
            
            if (filters.dateTo) {
                const itemDate = new Date(t.date);
                const toDate = new Date(filters.dateTo);
                toDate.setHours(23, 59, 59);
                if (itemDate > toDate) return false;
            }
            
            if (filters.minAmount && t.amount < parseFloat(filters.minAmount)) return false;
            if (filters.maxAmount && t.amount > parseFloat(filters.maxAmount)) return false;
            
            return true;
        });
    }, [transactions, filters]);

    const hasActiveFilters = useMemo(() => {
        return Object.values(filters).some(v => v !== '');
    }, [filters]);

    const clearFilters = () => {
        setFilters({
            residentId: '',
            category: '',
            source: '',
            status: '',
            dateFrom: '',
            dateTo: '',
            minAmount: '',
            maxAmount: ''
        });
    };

    const handleExportPDF = () => {
        const params = new URLSearchParams();
        params.append('type', type);
        
        const [year, month] = filterMonth.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
        
        if (filters.residentId) params.append('residentId', filters.residentId);
        if (filters.category) params.append('category', filters.category);
        if (filters.source) params.append('source', filters.source);
        if (filters.status) params.append('status', filters.status);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.minAmount) params.append('minAmount', filters.minAmount);
        if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);
        
        window.open(`/api/condominiums/${condoId}/transactions/export?${params.toString()}`, '_blank');
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

    const handleStatusToggle = async (tId: number, currentStatus: string, itemType: 'transaction' | 'payment', residentId?: number) => {
        // Open confirmation modal instead of directly reconciling
        if (currentStatus === 'PENDING' && itemType === 'transaction') {
            setReconcileModal({ open: true, transactionId: tId, residentId: residentId || null });
        } else {
            // For reversing reconciliation or other cases, proceed directly
            try {
                const newStatus = currentStatus === 'PENDING' ? 'RECONCILED' : 'PENDING';
                await fetch(`/api/condominiums/${condoId}/transactions/${tId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                fetchData();
            } catch (e) {}
        }
    };

    const handleReconcile = async () => {
        if (!reconcileModal.transactionId) return;
        try {
            await fetch(`/api/condominiums/${condoId}/transactions/${reconcileModal.transactionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'RECONCILED' })
            });
            setReconcileModal({ open: false, transactionId: null, residentId: null });
            fetchData();
        } catch (e) {
            alert('Error al conciliar');
        }
    };

    const handleOpenReject = (tId: number, residentId?: number) => {
        setRejectModal({ open: true, transactionId: tId, residentId: residentId || null, reason: '' });
    };

    const handleReject = async () => {
        if (!rejectModal.transactionId) return;
        if (rejectModal.reason.length < 10) {
            alert('El motivo del rechazo debe tener al menos 10 caracteres');
            return;
        }
        try {
            await fetch(`/api/condominiums/${condoId}/transactions/${rejectModal.transactionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'RECONCILED', rejectionReason: rejectModal.reason })
            });
            setRejectModal({ open: false, transactionId: null, residentId: null, reason: '' });
            fetchData();
        } catch (e) {
            alert('Error al rechazar');
        }
    };

    const handleDelete = async (tId: number, itemType: 'transaction' | 'payment', residentId?: number) => {
        if(!confirm('¿Eliminar transacción de forma permanente?')) return;
        try {
            if (itemType === 'transaction') {
                await fetch(`/api/condominiums/${condoId}/transactions/${tId}`, { method: 'DELETE' });
            } else if (itemType === 'payment' && residentId) {
                await fetch(`/api/condominiums/${condoId}/residents/${residentId}/payments/${tId}`, { method: 'DELETE' });
            }
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

    const handleStartEdit = (t: TransactionItem) => {
        setEditingId(t.id);
        setEditingType(t.type);
        setEditAmount(t.amount.toString());
    };

    const handleSaveAmount = async (tId: number, itemType: 'transaction' | 'payment') => {
        try {
            if (itemType === 'transaction') {
                await fetch(`/api/condominiums/${condoId}/transactions/${tId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: parseFloat(editAmount) })
                });
            }
            setEditingId(null);
            setEditingType(null);
            fetchData();
        } catch(e) { alert('Error guardando.'); }
    };

    const formatCurrency = (val: number) => `$ ${val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}`;
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

    const bgColor = type === 'INCOME' ? 'bg-emerald-50' : 'bg-red-50';
    const textColor = type === 'INCOME' ? 'text-emerald-700' : 'text-red-700';
    const btnColor = type === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700';

    const pendingCount = filteredTransactions.filter(t => t.status === 'PENDING').length;
    const total = filteredTransactions.reduce((s: number, t: any) => s + t.amount, 0);

    const defaultIncome = ['Cuota Mensual', 'Cuota Especial', 'Multa', 'Reserva', 'Otro Ingreso'];
    const defaultExpense = ['Servicios', 'Mantenimiento', 'Jardineria', 'Administracion', 'Seguridad', 'Gastos Bancarios', 'Otro Gasto'];
    const catOptions = categories.length > 0 ? categories : (type === 'INCOME' ? defaultIncome : defaultExpense);

    const allCategories = type === 'INCOME' 
        ? ['Pago de Residente', ...catOptions.filter(c => c !== 'Pago de Residente')]
        : catOptions;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">
                        {type === 'INCOME' ? 'Ingresos y Pagos' : 'Egresos y Gastos'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {pendingCount} por conciliar de {filteredTransactions.length} registros. Total: <span className="font-bold">{formatCurrency(total)}</span>
                    </p>
                </div>
                <div className="flex gap-3 items-center flex-wrap">
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
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${hasActiveFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Filter className="h-4 w-4" />
                        Filtros
                        {hasActiveFilters && <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5">✓</span>}
                    </button>

                    <button 
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Exportar PDF
                    </button>

                    <button 
                        onClick={() => setShowModal(true)}
                        className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-md shadow-sm transition-colors ${btnColor}`}
                    >
                        <Plus className="h-4 w-4" /> 
                        Nuevo {type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                    </button>
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-700">Filtros Avanzados</h3>
                        {hasActiveFilters && (
                            <button 
                                onClick={clearFilters}
                                className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                            >
                                <XCircle className="h-4 w-4" />
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {type === 'INCOME' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Residente</label>
                                <select 
                                    value={filters.residentId}
                                    onChange={e => setFilters({...filters, residentId: e.target.value})}
                                    className="w-full border rounded-md text-sm p-2"
                                >
                                    <option value="">Todos</option>
                                    {residents.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                            <select 
                                value={filters.category}
                                onChange={e => setFilters({...filters, category: e.target.value})}
                                className="w-full border rounded-md text-sm p-2"
                            >
                                <option value="">Todas</option>
                                {allCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {type === 'INCOME' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Origen</label>
                                <select 
                                    value={filters.source}
                                    onChange={e => setFilters({...filters, source: e.target.value})}
                                    className="w-full border rounded-md text-sm p-2"
                                >
                                    <option value="">Todos</option>
                                    <option value="api">API</option>
                                    <option value="web">Web</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                            <select 
                                value={filters.status}
                                onChange={e => setFilters({...filters, status: e.target.value})}
                                className="w-full border rounded-md text-sm p-2"
                            >
                                <option value="">Todos</option>
                                <option value="PENDING">Por Conciliar</option>
                                <option value="RECONCILED">Conciliado</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Desde</label>
                            <input 
                                type="date"
                                value={filters.dateFrom}
                                onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                                className="w-full border rounded-md text-sm p-2"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Hasta</label>
                            <input 
                                type="date"
                                value={filters.dateTo}
                                onChange={e => setFilters({...filters, dateTo: e.target.value})}
                                className="w-full border rounded-md text-sm p-2"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Monto Mín.</label>
                            <input 
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={filters.minAmount}
                                onChange={e => setFilters({...filters, minAmount: e.target.value})}
                                className="w-full border rounded-md text-sm p-2"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Monto Máx.</label>
                            <input 
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={filters.maxAmount}
                                onChange={e => setFilters({...filters, maxAmount: e.target.value})}
                                className="w-full border rounded-md text-sm p-2"
                            />
                        </div>
                    </div>
                </div>
            )}

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
                                <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border p-2 rounded outline-none focus:border-indigo-500"/>
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

            {/* Modal de Conciliación */}
            {reconcileModal.open && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b bg-emerald-50">
                            <h2 className="font-bold text-emerald-800">Confirmar Conciliación</h2>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4">¿Está seguro de que desea conciliar este pago?</p>
                            <p className="text-sm text-gray-500">Esta acción marcará el pago como conciliado.</p>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                            <button onClick={() => setReconcileModal({ open: false, transactionId: null, residentId: null })} className="px-4 py-2 border rounded text-gray-700 text-sm hover:bg-gray-100">Cancelar</button>
                            <button onClick={handleReconcile} className="px-4 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700">Conciliar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Rechazo */}
            {rejectModal.open && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b bg-red-50">
                            <h2 className="font-bold text-red-800">Rechazar Pago</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del rechazo (mínimo 10 caracteres)</label>
                                <textarea 
                                    value={rejectModal.reason}
                                    onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                                    className="w-full border p-2 rounded outline-none focus:border-indigo-500"
                                    rows={3}
                                    placeholder="Ingrese el motivo del rechazo..."
                                />
                                <p className="text-xs text-gray-500 mt-1">{rejectModal.reason.length}/10 caracteres</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                            <button onClick={() => setRejectModal({ open: false, transactionId: null, residentId: null, reason: '' })} className="px-4 py-2 border rounded text-gray-700 text-sm hover:bg-gray-100">Cancelar</button>
                            <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">Rechazar</button>
                        </div>
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
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Soporte</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Origen</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={8} className="text-center p-8 text-gray-500"><div className="animate-spin inline-block h-6 w-6 border-b-2 border-indigo-600 rounded-full"></div></td></tr>
                        ) : filteredTransactions.length === 0 ? (
                            <tr><td colSpan={8} className="text-center p-10 text-gray-500">No hay registros para este mes.</td></tr>
                        ) : filteredTransactions.map((t) => (
                            <tr key={`${t.type}-${t.id}`} className="hover:bg-gray-50">
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
                                    {editingId === t.id && editingType === t.type ? (
                                        <div className="flex items-center gap-1 justify-end">
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                value={editAmount} 
                                                onChange={e => setEditAmount(e.target.value)}
                                                className="w-24 border rounded p-1 text-sm text-right outline-none focus:border-indigo-500"
                                                autoFocus
                                            />
                                            <button onClick={() => handleSaveAmount(t.id, t.type)} className="text-green-600 hover:text-green-800 p-1"><Save className="h-4 w-4" /></button>
                                            <button onClick={() => { setEditingId(null); setEditingType(null); }} className="text-gray-400 hover:text-gray-600 p-1"><X className="h-4 w-4" /></button>
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
                                        <button 
                                            onClick={() => setImageModal({ open: true, url: getReceiptUrl(t.receiptUrl), type: t.receiptType || 'image/jpeg' })}
                                            className="text-blue-600 hover:text-blue-800 flex flex-col items-center justify-center text-xs"
                                        >
                                            <FileText className="h-5 w-5 mb-0.5" />
                                            Ver
                                        </button>
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
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${t.source === 'api' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {t.source === 'api' ? <ExternalLink className="h-3 w-3" /> : null}
                                        {t.source === 'api' ? 'API' : 'Web'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button 
                                            onClick={() => handleStatusToggle(t.id, t.status, t.type, t.residentId)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${t.status === 'RECONCILED' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                                        >
                                            {t.status === 'RECONCILED' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                            {t.status === 'RECONCILED' ? 'Conciliado' : 'Por Conciliar'}
                                        </button>
                                        {t.status === 'PENDING' && (
                                            <button 
                                                onClick={() => handleOpenReject(t.id, t.residentId)}
                                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold cursor-pointer bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                                                title="Rechazar pago"
                                            >
                                                <XCircle className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                    {t.rejectionReason && (
                                        <p className="text-xs text-red-600 mt-1" title={`Motivo: ${t.rejectionReason}`}>Rechazado</p>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right text-sm">
                                    <button onClick={() => handleDelete(t.id, t.type, t.residentId)} className="text-gray-400 hover:text-red-600 transition-colors p-1">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Image Modal */}
            {imageModal.open && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setImageModal({ open: false, url: '', type: '' })}
                >
                    <div 
                        className="relative max-w-4xl max-h-[90vh] w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setImageModal({ open: false, url: '', type: '' })}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
                        >
                            <X className="h-8 w-8" />
                        </button>
                        {imageModal.type && imageModal.type.includes('pdf') ? (
                            <iframe 
                                src={imageModal.url} 
                                className="w-full h-[80vh] rounded-lg"
                                title="Receipt PDF"
                            />
                        ) : (
                            <img 
                                src={imageModal.url} 
                                alt="Receipt" 
                                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
