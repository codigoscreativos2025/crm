'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Upload, Search, Edit2, Trash2, X, Download, FileSpreadsheet, Filter, XCircle, Download as DownloadIcon } from 'lucide-react';

interface FilterState {
    status: string;
    name: string;
}

export default function ResidentsTab({ condoId }: { condoId: number }) {
    const [residents, setResidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        status: '',
        name: ''
    });

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<{ name: string; phone: string; [key: string]: string }>({ name: '', phone: '' });

    // Import
    const [importing, setImporting] = useState(false);
    const [importErrors, setImportErrors] = useState<{row: number, col: number, message: string}[]>([]);
    const [importSuccess, setImportSuccess] = useState(0);

    // Global configured columns from Settings (residentFields)
    const [configuredColumns, setConfiguredColumns] = useState<string[]>([]);

    useEffect(() => {
        fetchResidents();
    }, [condoId]);

    const fetchResidents = async () => {
        setLoading(true);
        try {
            const [res, settingsRes] = await Promise.all([
                fetch(`/api/condominiums/${condoId}/residents`),
                fetch(`/api/condominiums/${condoId}`)
            ]);
            
            if (res.ok) {
                setResidents(await res.json());
            }
            
            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                if (settingsData.residentFields) {
                    try {
                        const fields = JSON.parse(settingsData.residentFields);
                        if (Array.isArray(fields)) setConfiguredColumns(fields);
                    } catch(e) {}
                }
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const hasActiveFilters = useMemo(() => {
        return Object.values(filters).some(v => v !== '');
    }, [filters]);

    const clearFilters = () => {
        setFilters({
            status: '',
            name: ''
        });
    };

    const filtered = useMemo(() => {
        return residents.filter(r => {
            if (filters.status && r.status !== filters.status) return false;
            if (filters.name) {
                const searchLower = filters.name.toLowerCase();
                if (!r.name.toLowerCase().includes(searchLower) && !r.phone.includes(filters.name)) return false;
            }
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                if (!r.name.toLowerCase().includes(searchLower) && !r.phone.includes(searchTerm)) return false;
            }
            return true;
        });
    }, [residents, searchTerm, filters]);

    const handleExportPDF = () => {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.name) params.append('name', filters.name);
        
        window.open(`/api/condominiums/${condoId}/residents/export?${params.toString()}`, '_blank');
    };

    const handleOpenModal = (r?: any) => {
        setImportErrors([]);
        setImportSuccess(0);
        
        // Build form with configured columns
        const baseForm: any = { name: '', phone: '' };
        configuredColumns.forEach(col => { baseForm[col] = ''; });
        
        if (r) {
            setEditingId(r.id);
            baseForm.name = r.name;
            baseForm.phone = r.phone;
            // Populate configured column values from additionalData
            try {
                const parsed = JSON.parse(r.additionalData || '{}');
                configuredColumns.forEach(col => {
                    baseForm[col] = parsed[col] || '';
                });
            } catch(e) {}
        } else {
            setEditingId(null);
        }
        setForm(baseForm);
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Rebuild additionalData from configured columns
            const additionalData: Record<string, string> = {};
            configuredColumns.forEach(col => {
                if (form[col] && form[col].trim() !== '') {
                    additionalData[col] = form[col].trim();
                }
            });

            const payload = {
                name: form.name,
                phone: form.phone,
                additionalData: JSON.stringify(additionalData)
            };

            const method = editingId ? 'PUT' : 'POST';
            const url = editingId 
                ? `/api/condominiums/${condoId}/residents/${editingId}`
                : `/api/condominiums/${condoId}/residents`;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                fetchResidents();
            } else {
                const data = await res.json();
                alert(data.error || 'Error al guardar');
            }
        } catch (e) {
            alert('Error al guardar');
        }
    };

    const handleDelete = async (id: number) => {
        if(!confirm('¿Eliminar residente? Esto eliminará también sus transacciones. (No los contactos del CRM)')) return;
        try {
            await fetch(`/api/condominiums/${condoId}/residents/${id}`, { method: 'DELETE' });
            fetchResidents();
        } catch (e) {}
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportErrors([]);
        setImportSuccess(0);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`/api/condominiums/${condoId}/residents/import`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (res.ok) {
                setImportSuccess(data.count || 0);
                if(data.errors && data.errors.length > 0) {
                    setImportErrors(data.errors);
                }
                fetchResidents();
            } else {
                alert(data.error || 'Error importando archivo');
            }
        } catch(err) {
            alert('Error subiendo archivo');
        } finally {
            setImporting(false);
            e.target.value = ''; // Reset
        }
    };

    const statusCounts = useMemo(() => {
        return {
            all: residents.length,
            ACTIVO: residents.filter(r => r.status === 'ACTIVO').length,
            INACTIVO: residents.filter(r => r.status === 'INACTIVO').length,
            INSOLVENTE: residents.filter(r => r.status === 'INSOLVENTE').length
        };
    }, [residents]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex-1 flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar residente por nombre o teléfono..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-md focus:border-indigo-500 outline-none transition"
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
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <DownloadIcon className="h-4 w-4" />
                        Exportar PDF
                    </button>

                    <a 
                        href={`/api/condominiums/${condoId}/residents/template`}
                        target="_blank"
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 font-medium rounded-md shadow-sm transition-colors"
                    >
                        <Download className="h-4 w-4" /> Plantilla
                    </a>
                    
                    <div className="relative overflow-hidden w-full md:w-auto">
                        <input 
                            type="file" 
                            id="import-excel" 
                            accept=".xlsx, .xls, .csv" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            onChange={handleImportFile}
                            disabled={importing}
                        />
                        <label htmlFor="import-excel" className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-indigo-700 bg-indigo-50 border border-indigo-200 font-medium rounded-md shadow-sm transition-colors cursor-pointer ${importing ? 'opacity-70' : 'hover:bg-indigo-100'}`}>
                            {importing ? <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div> : <FileSpreadsheet className="h-4 w-4" />}
                            {importing ? 'Procesando...' : 'Importar Excel'}
                        </label>
                    </div>

                    <button 
                        onClick={() => handleOpenModal()}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm transition-colors"
                    >
                        <Plus className="h-4 w-4" /> 
                        Nuevo Residente
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-700">Filtros de Residentes</h3>
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                            <select 
                                value={filters.status}
                                onChange={e => setFilters({...filters, status: e.target.value})}
                                className="w-full border rounded-md text-sm p-2"
                            >
                                <option value="">Todos ({statusCounts.all})</option>
                                <option value="ACTIVO">Activos ({statusCounts.ACTIVO})</option>
                                <option value="INACTIVO">Inactivos ({statusCounts.INACTIVO})</option>
                                <option value="INSOLVENTE">Insolventes ({statusCounts.INSOLVENTE})</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Buscar por Nombre</label>
                            <input 
                                type="text"
                                placeholder="Nombre del residente"
                                value={filters.name}
                                onChange={e => setFilters({...filters, name: e.target.value})}
                                className="w-full border rounded-md text-sm p-2"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Status Summary */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="text-2xl font-bold text-gray-800">{statusCounts.all}</div>
                    <div className="text-sm text-gray-500">Total Residentes</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                    <div className="text-2xl font-bold text-emerald-700">{statusCounts.ACTIVO}</div>
                    <div className="text-sm text-emerald-600">Activos</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-gray-600">{statusCounts.INACTIVO}</div>
                    <div className="text-sm text-gray-500">Inactivos</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-700">{statusCounts.INSOLVENTE}</div>
                    <div className="text-sm text-red-600">Insolventes</div>
                </div>
            </div>

            {/* Alertas de Importación */}
            {importSuccess > 0 && (
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg flex items-start gap-3 border border-emerald-100">
                    <div className="flex-1">
                        <p className="font-semibold text-sm">✅ Importación exitosa</p>
                        <p className="text-sm mt-1">{importSuccess} residentes fueron insertados correctamente.</p>
                    </div>
                </div>
            )}

            {importErrors.length > 0 && (
                <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-100">
                    <p className="font-bold text-sm mb-2 flex items-center gap-2">⚠️ Advertencias durante la importación:</p>
                    <ul className="text-sm list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                        {importErrors.map((err, i) => (
                            <li key={i}>Línea {err.row}: {err.message}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Modal de CRUD Manual — Usa campos globales configurados */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                            <h2 className="font-bold text-gray-800 text-lg">{editingId ? 'Editar Residente' : 'Nuevo Residente'}</h2>
                            <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5"/></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="resident-form" onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                    <input required type="text" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full border p-2 rounded outline-none focus:border-indigo-500" placeholder="Ej: Juan Pérez" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (Mismo formato que Whatsapp)</label>
                                    <input required type="text" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full border p-2 rounded outline-none focus:border-indigo-500" placeholder="Ej: +52123456789" />
                                    <p className="text-xs text-gray-500 mt-1">Este será el identificador único del residente.</p>
                                </div>

                                {configuredColumns.length > 0 && (
                                    <div className="pt-4 border-t mt-4">
                                        <h3 className="text-sm font-bold text-gray-800 mb-3">Campos Configurados</h3>
                                        <div className="space-y-3">
                                            {configuredColumns.map((col, idx) => (
                                                <div key={idx}>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">{col}</label>
                                                    <input 
                                                        type="text" 
                                                        value={form[col] || ''} 
                                                        onChange={e => setForm({...form, [col]: e.target.value})} 
                                                        className="w-full border p-2 text-sm rounded outline-none focus:border-indigo-500" 
                                                        placeholder={`Ingresa ${col}...`} 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded text-gray-700 text-sm font-medium hover:bg-gray-100">Cancelar</button>
                            <button type="submit" form="resident-form" className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium transition-colors">Guardar Residente</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabla Dinámica */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Teléfono</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Contacto CRM</th>
                                {configuredColumns.map(col => (
                                    <th key={col} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                        {col}
                                    </th>
                                ))}
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={10} className="text-center p-8 text-gray-500"><div className="animate-spin inline-block h-6 w-6 border-b-2 border-indigo-600 rounded-full"></div></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={10} className="text-center p-8 text-gray-500">No hay residentes registrados.</td></tr>
                            ) : filtered.map(r => {
                                let parsedJson: any = {};
                                try {
                                    parsedJson = JSON.parse(r.additionalData || '{}');
                                } catch(e){}

                                const statusColor = r.status === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 
                                                   r.status === 'INSOLVENTE' ? 'bg-red-100 text-red-800' : 
                                                   'bg-gray-100 text-gray-800';

                                return (
                                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-semibold text-gray-900 text-sm">{r.name}</div>
                                            <div className="text-xs text-gray-500">ID: {r.id}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {r.phone}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
                                                {r.status === 'ACTIVO' ? 'Activo' : r.status === 'INSOLVENTE' ? 'Insolvente' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {r.contactId ? (
                                                <a href={`/dashboard/chat/${r.contactId}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 hover:underline transition-colors" title="Ir al chat">
                                                    Sí (ID: {r.contactId})
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">No enlazado</span>
                                            )}
                                        </td>
                                        
                                        {/* Dynamic columns rendering */}
                                        {configuredColumns.map(col => (
                                            <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {parsedJson[col] || '-'}
                                            </td>
                                        ))}

                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleOpenModal(r)} className="text-indigo-600 hover:text-indigo-900 mx-2 p-1 group relative">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-600 p-1 group relative transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
