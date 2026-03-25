'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Info, DollarSign } from 'lucide-react';

interface FixedCost {
    name: string;
    amount: number;
}

export default function SettingsTab({ condoId }: { condoId: number }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [type, setType] = useState('CASA');
    const [invoiceDay, setInvoiceDay] = useState(1);
    
    // Arrays for dynamic fields
    const [residentFields, setResidentFields] = useState<string[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<string[]>(['Pago de Mantenimiento', 'Cuota Extraordinaria', 'Otro']);
    const [expenseCategories, setExpenseCategories] = useState<string[]>(['Agua', 'Luz', 'Servicios', 'Limpieza', 'Seguridad', 'Mantenimiento Elevador', 'Otro']);
    const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);

    useEffect(() => {
        fetchSettings();
    }, [condoId]);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`/api/condominiums/${condoId}`);
            if (res.ok) {
                const data = await res.json();
                setName(data.name || '');
                setType(data.type || 'CASA');
                setInvoiceDay(data.invoiceDay || 1);
                
                if (data.residentFields) {
                    try { setResidentFields(JSON.parse(data.residentFields)); } catch(e){}
                }
                if (data.incomeCategories) {
                    try { setIncomeCategories(JSON.parse(data.incomeCategories)); } catch(e){}
                }
                if (data.expenseCategories) {
                    try { setExpenseCategories(JSON.parse(data.expenseCategories)); } catch(e){}
                }
                if (data.fixedCosts) {
                    try { setFixedCosts(JSON.parse(data.fixedCosts)); } catch(e){}
                }
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const cleanResidents = residentFields.filter(f => f.trim() !== '');
            const cleanIncome = incomeCategories.filter(c => c.trim() !== '');
            const cleanExpense = expenseCategories.filter(c => c.trim() !== '');
            const cleanFixed = fixedCosts.filter(fc => fc.name.trim() !== '');

            const payload = {
                name,
                type,
                invoiceDay,
                residentFields: JSON.stringify(cleanResidents),
                incomeCategories: JSON.stringify(cleanIncome),
                expenseCategories: JSON.stringify(cleanExpense),
                fixedCosts: JSON.stringify(cleanFixed)
            };

            const res = await fetch(`/api/condominiums/${condoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Configuración guardada exitosamente.');
                fetchSettings();
            } else {
                alert('Error al guardar configuración.');
            }
        } catch (error) {
            alert('Error de red');
        }
        setSaving(false);
    };

    const renderDynamicList = (title: string, items: string[], setter: (val: string[]) => void, placeholder: string) => {
        return (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
                    <button type="button" onClick={() => setter([...items, ''])} className="text-xs flex items-center gap-1 text-indigo-600 font-medium hover:text-indigo-800">
                        <Plus className="h-3 w-3" /> Añadir
                    </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input
                                required
                                type="text"
                                placeholder={placeholder}
                                value={item}
                                onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[idx] = e.target.value;
                                    setter(newItems);
                                }}
                                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const newItems = [...items];
                                    newItems.splice(idx, 1);
                                    setter(newItems);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 border rounded bg-white transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    {items.length === 0 && <p className="text-xs text-gray-400 italic">No hay elementos configurados.</p>}
                </div>
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;

    return (
        <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto">
            {/* Detalles Principales */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Ajustes Generales del Condominio</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Propiedad</label>
                        <input required type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:border-indigo-500 outline-none transition" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Propiedad</label>
                        <select value={type} onChange={e=>setType(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:border-indigo-500 outline-none transition bg-white">
                            <option value="CASA">Casas Privadas</option>
                            <option value="APARTAMENTO">Torre de Apartamentos</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Día de Generación de Facturas Mensuales</label>
                        <input required type="number" min="1" max="28" value={invoiceDay} onChange={e=>setInvoiceDay(Number(e.target.value))} className="w-full px-3 py-2 border rounded-md focus:border-indigo-500 outline-none transition" />
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info className="h-3 w-3"/> Las facturas de mantenimiento se crearán este día del mes.</p>
                    </div>
                </div>
            </div>

            {/* Costos Fijos */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" /> Costos Fijos Mensuales
                    </h2>
                    <button type="button" onClick={() => setFixedCosts([...fixedCosts, { name: '', amount: 0 }])} className="text-sm flex items-center gap-1 text-green-600 font-medium hover:text-green-800">
                        <Plus className="h-4 w-4" /> Añadir Costo Fijo
                    </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">Estos costos se añadirán automáticamente al balance de cada factura mensual generada.</p>
                <div className="space-y-3">
                    {fixedCosts.map((fc, idx) => (
                        <div key={idx} className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <input
                                required
                                type="text"
                                placeholder="Nombre (Ej: Vigilancia)"
                                value={fc.name}
                                onChange={(e) => {
                                    const updated = [...fixedCosts];
                                    updated[idx] = { ...updated[idx], name: e.target.value };
                                    setFixedCosts(updated);
                                }}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:border-green-500 outline-none"
                            />
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Monto"
                                    value={fc.amount || ''}
                                    onChange={(e) => {
                                        const updated = [...fixedCosts];
                                        updated[idx] = { ...updated[idx], amount: parseFloat(e.target.value) || 0 };
                                        setFixedCosts(updated);
                                    }}
                                    className="w-32 pl-7 pr-3 py-2 text-sm border border-gray-300 rounded focus:border-green-500 outline-none"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const updated = [...fixedCosts];
                                    updated.splice(idx, 1);
                                    setFixedCosts(updated);
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 border rounded bg-white transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    {fixedCosts.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">No hay costos fijos configurados. Los costos fijos se sumarán automáticamente a cada factura mensual.</p>}
                    {fixedCosts.length > 0 && (
                        <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-100">
                            <span className="text-sm font-medium text-gray-600">Total Mensual Fijo:</span>
                            <span className="text-lg font-bold text-green-700">${fixedCosts.reduce((s, fc) => s + (fc.amount || 0), 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Configuración Dinámica */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Personalización de Registros</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {renderDynamicList(
                        "Columnas Extra para Residentes",
                        residentFields,
                        setResidentFields,
                        "Ej: Casa, Torre, Correo..."
                    )}
                    
                    {renderDynamicList(
                        "Conceptos de Ingreso (Pagos)",
                        incomeCategories,
                        setIncomeCategories,
                        "Ej: Cuota Fija, Multa..."
                    )}

                    {renderDynamicList(
                        "Conceptos de Egreso (Gastos)",
                        expenseCategories,
                        setExpenseCategories,
                        "Ej: Limpieza, Luz..."
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="submit" disabled={saving} className={`flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors ${saving ? 'opacity-70 pointer-events-none' : ''}`}>
                    {saving ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Save className="h-5 w-5" />}
                    Guardar Cambios
                </button>
            </div>
        </form>
    );
}
