'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Info, CreditCard } from 'lucide-react';

interface PaymentMethod {
    id: number;
    name: string;
    fields: string;
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

    // Payment methods state
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loadingMethods, setLoadingMethods] = useState(false);
    const [newMethodName, setNewMethodName] = useState('');
    const [newMethodFields, setNewMethodFields] = useState<{ key: string; value: string }[]>([]);
    const [savingMethod, setSavingMethod] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchPaymentMethods();
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
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const fetchPaymentMethods = async () => {
        setLoadingMethods(true);
        try {
            const res = await fetch(`/api/condominiums/${condoId}/payment-methods`);
            if (res.ok) {
                setPaymentMethods(await res.json());
            }
        } catch (error) {
            console.error(error);
        }
        setLoadingMethods(false);
    };

    const handleAddPaymentMethod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMethodName.trim()) return;

        setSavingMethod(true);
        try {
            // Convertir el array de campos a formato JSON
            const fields = newMethodFields
                .filter(f => f.key.trim() !== '')
                .map(f => ({ key: f.key.trim(), label: f.value.trim() }));

            const res = await fetch(`/api/condominiums/${condoId}/payment-methods`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newMethodName.trim(), fields })
            });

            if (res.ok) {
                setNewMethodName('');
                setNewMethodFields([]);
                fetchPaymentMethods();
            } else {
                const data = await res.json();
                alert(data.error || 'Error al crear método de pago');
            }
        } catch (error) {
            console.error(error);
        }
        setSavingMethod(false);
    };

    const handleAddField = () => {
        setNewMethodFields([...newMethodFields, { key: '', value: '' }]);
    };

    const handleRemoveField = (index: number) => {
        setNewMethodFields(newMethodFields.filter((_, i) => i !== index));
    };

    const handleFieldChange = (index: number, field: 'key' | 'value', value: string) => {
        const newFields = [...newMethodFields];
        newFields[index][field] = value;
        setNewMethodFields(newFields);
    };

    const handleDeletePaymentMethod = async (methodId: number) => {
        if (!confirm('¿Eliminar este método de pago?')) return;

        try {
            const res = await fetch(`/api/condominiums/${condoId}/payment-methods/${methodId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchPaymentMethods();
            } else {
                const data = await res.json();
                alert(data.error || 'No se pudo eliminar');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const cleanResidents = residentFields.filter(f => f.trim() !== '');
            const cleanIncome = incomeCategories.filter(c => c.trim() !== '');
            const cleanExpense = expenseCategories.filter(c => c.trim() !== '');

            const payload = {
                name,
                type,
                invoiceDay,
                residentFields: JSON.stringify(cleanResidents),
                incomeCategories: JSON.stringify(cleanIncome),
                expenseCategories: JSON.stringify(cleanExpense)
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

            {/* Métodos de Pago */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-bold text-gray-800">Métodos de Pago</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">Gestiona los métodos de pago disponibles para registrar transacciones.</p>

                {/* Lista de métodos existentes */}
                <div className="space-y-2 mb-4">
                    {loadingMethods ? (
                        <div className="text-center py-4 text-gray-500">Cargando...</div>
                    ) : paymentMethods.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">No hay métodos de pago configurados</div>
                    ) : (
                        paymentMethods.map((method) => (
                            <div key={method.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <span className="font-medium text-gray-800">{method.name}</span>
                                    {method.fields && method.fields !== '[]' && (
                                        <span className="ml-2 text-xs text-gray-500">
                                            ({JSON.parse(method.fields).length} campos)
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDeletePaymentMethod(method.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Formulario para agregar */}
                <form onSubmit={handleAddPaymentMethod} className="border-t pt-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Nombre del método (ej: Transferencia, Pago Móvil)"
                                value={newMethodName}
                                onChange={(e) => setNewMethodName(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={savingMethod}
                            className={`flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors ${savingMethod ? 'opacity-70' : ''}`}
                        >
                            {savingMethod ? '...' : <><Plus className="h-4 w-4" /> Agregar</>}
                        </button>
                    </div>

                    {/* Campos dinámicos */}
                    <div className="mt-3 space-y-2">
                        {newMethodFields.map((field, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    placeholder="Nombre del campo (ej: cedula)"
                                    value={field.key}
                                    onChange={(e) => handleFieldChange(index, 'key', e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                                />
                                <span className="text-gray-400">:</span>
                                <input
                                    type="text"
                                    placeholder="Valor (ej: 31099537)"
                                    value={field.value}
                                    onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveField(index)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={handleAddField}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                        >
                            <Plus className="h-3 w-3" /> Agregar campo
                        </button>
                    </div>
                </form>
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
