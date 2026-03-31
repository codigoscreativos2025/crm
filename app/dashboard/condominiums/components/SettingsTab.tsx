'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Info, CreditCard, FileText, Check, Loader2, Home, Settings, CreditCard as CardIcon, FileType } from 'lucide-react';
import PDFTemplateEditor from './PDFTemplateEditor';

interface PaymentMethod {
    id: number;
    name: string;
    fields: string | Record<string, string>;
}

type TabType = 'general' | 'fields' | 'methods' | 'templates';

export default function SettingsTab({ condoId }: { condoId: number }) {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [name, setName] = useState('');
    const [type, setType] = useState('CASA');
    const [invoiceDay, setInvoiceDay] = useState(1);
    
    const [residentFields, setResidentFields] = useState<string[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<string[]>(['Pago de Mantenimiento', 'Cuota Extraordinaria', 'Otro']);
    const [expenseCategories, setExpenseCategories] = useState<string[]>(['Agua', 'Luz', 'Servicios', 'Limpieza', 'Seguridad', 'Mantenimiento Elevador', 'Otro']);

    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loadingMethods, setLoadingMethods] = useState(false);
    const [newMethodName, setNewMethodName] = useState('');
    const [newMethodFields, setNewMethodFields] = useState<{ key: string; value: string }[]>([]);
    const [savingMethod, setSavingMethod] = useState(false);

    const [showTemplateEditor, setShowTemplateEditor] = useState(false);

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

    const autoSave = useCallback(async (data: any) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        
        setSaveStatus('saving');
        
        saveTimeoutRef.current = setTimeout(async () => {
            setSaving(true);
            try {
                const res = await fetch(`/api/condominiums/${condoId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (res.ok) {
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                } else {
                    setSaveStatus('idle');
                }
            } catch (error) {
                setSaveStatus('idle');
            }
            setSaving(false);
        }, 1000);
    }, [condoId]);

    const handleFieldChange = (setter: (val: any) => void, value: any, fieldName: string) => {
        setter(value);
        
        let allData: any = {};
        if (fieldName === 'name') allData = { name: value, type, invoiceDay };
        else if (fieldName === 'type') allData = { name, type: value, invoiceDay };
        else if (fieldName === 'invoiceDay') allData = { name, type, invoiceDay: value };
        else if (fieldName === 'residentFields') allData = { residentFields: JSON.stringify(value.filter((f: string) => f.trim() !== '')) };
        else if (fieldName === 'incomeCategories') allData = { incomeCategories: JSON.stringify(value.filter((c: string) => c.trim() !== '')) };
        else if (fieldName === 'expenseCategories') allData = { expenseCategories: JSON.stringify(value.filter((c: string) => c.trim() !== '')) };
        
        if (Object.keys(allData).length > 0) {
            autoSave(allData);
        }
    };

    const handleAddPaymentMethod = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const methodName = newMethodName.trim();
        if (!methodName) {
            alert('El nombre del método de pago es requerido');
            return;
        }

        setSavingMethod(true);
        try {
            const fields = newMethodFields
                .filter(f => f.key.trim() !== '')
                .map(f => ({ key: f.key.trim(), label: f.value.trim() }));

            const response = await fetch(`/api/condominiums/${condoId}/payment-methods`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: methodName, fields })
            });

            const data = await response.json();
            
            if (response.ok) {
                setNewMethodName('');
                setNewMethodFields([]);
                fetchPaymentMethods();
            } else {
                alert(data.error || 'Error al crear método de pago');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al crear método de pago');
        }
        setSavingMethod(false);
    };

    const handleAddField = () => {
        setNewMethodFields([...newMethodFields, { key: '', value: '' }]);
    };

    const handleRemoveField = (index: number) => {
        setNewMethodFields(newMethodFields.filter((_, i) => i !== index));
    };

    const handleFieldChangeMethod = (index: number, field: 'key' | 'value', value: string) => {
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

    const renderDynamicList = (title: string, items: string[], setter: (val: string[]) => void, placeholder: string, fieldName: string) => {
        return (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
                    <button type="button" onClick={() => handleFieldChange(setter, [...items, ''], fieldName)} className="text-xs flex items-center gap-1 text-indigo-600 font-medium hover:text-indigo-800">
                        <Plus className="h-3 w-3" /> Añadir
                    </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input
                                type="text"
                                placeholder={placeholder}
                                value={item}
                                onChange={(e) => handleFieldChange(setter, items.map((i, iidx) => iidx === idx ? e.target.value : i), fieldName)}
                                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => handleFieldChange(setter, items.filter((_, i) => i !== idx), fieldName)}
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

    const tabs = [
        { id: 'general' as TabType, label: 'General', icon: Home },
        { id: 'fields' as TabType, label: 'Campos', icon: Settings },
        { id: 'methods' as TabType, label: 'Métodos', icon: CardIcon },
        { id: 'templates' as TabType, label: 'Plantillas', icon: FileType },
    ];

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header con tabs */}
            <div className="bg-white rounded-t-xl border border-b-0 border-gray-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Configuración del Condominio</h2>
                    <div className="flex items-center gap-2">
                        {saveStatus === 'saving' && (
                            <span className="flex items-center gap-1.5 text-sm text-amber-600">
                                <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                            </span>
                        )}
                        {saveStatus === 'saved' && (
                            <span className="flex items-center gap-1.5 text-sm text-green-600">
                                <Check className="h-4 w-4" /> Guardado
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-1 px-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                                    activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Contenido del tab */}
            <div className="bg-white rounded-b-xl border border-gray-200 p-6">
                {/* Tab General */}
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4">Información Principal</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Propiedad</label>
                                    <input 
                                        type="text" 
                                        value={name} 
                                        onChange={(e) => handleFieldChange(setName, e.target.value, 'name')} 
                                        className="w-full px-3 py-2 border rounded-md focus:border-indigo-500 outline-none transition" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Propiedad</label>
                                    <select 
                                        value={type} 
                                        onChange={(e) => handleFieldChange(setType, e.target.value, 'type')} 
                                        className="w-full px-3 py-2 border rounded-md focus:border-indigo-500 outline-none transition bg-white"
                                    >
                                        <option value="CASA">Casas Privadas</option>
                                        <option value="APARTAMENTO">Torre de Apartamentos</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Día de Generación de Facturas Mensuales</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="28" 
                                        value={invoiceDay} 
                                        onChange={(e) => handleFieldChange(setInvoiceDay, Number(e.target.value), 'invoiceDay')} 
                                        className="w-full px-3 py-2 border rounded-md focus:border-indigo-500 outline-none transition" 
                                    />
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info className="h-3 w-3"/> Las facturas de mantenimiento se crearán este día del mes.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Campos */}
                {activeTab === 'fields' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4">Personalización de Registros</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {renderDynamicList(
                                    "Columnas Extra para Residentes",
                                    residentFields,
                                    setResidentFields,
                                    "Ej: Casa, Torre, Correo...",
                                    'residentFields'
                                )}
                                
                                {renderDynamicList(
                                    "Conceptos de Ingreso (Pagos)",
                                    incomeCategories,
                                    setIncomeCategories,
                                    "Ej: Cuota Fija, Multa...",
                                    'incomeCategories'
                                )}

                                {renderDynamicList(
                                    "Conceptos de Egreso (Gastos)",
                                    expenseCategories,
                                    setExpenseCategories,
                                    "Ej: Limpieza, Luz...",
                                    'expenseCategories'
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Métodos */}
                {activeTab === 'methods' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="h-5 w-5 text-indigo-600" />
                                <h3 className="font-bold text-gray-800">Métodos de Pago</h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">Gestiona los métodos de pago disponibles para registrar transacciones.</p>

                            <div className="space-y-2 mb-4">
                                {loadingMethods ? (
                                    <div className="text-center py-4 text-gray-500">Cargando...</div>
                                ) : paymentMethods.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">No hay métodos de pago configurados</div>
                                ) : (
                                    paymentMethods.map((method) => {
                                        let fieldsObj: Record<string, string> = {};
                                        let fieldCount = 0;
                                        
                                        if (typeof method.fields === 'string') {
                                            try {
                                                const parsed = JSON.parse(method.fields);
                                                if (Array.isArray(parsed)) {
                                                    parsed.forEach((f: { key: string; label: string }) => {
                                                        if (f.key) fieldsObj[f.key] = f.label || '';
                                                    });
                                                    fieldCount = parsed.length;
                                                } else {
                                                    fieldsObj = parsed;
                                                    fieldCount = Object.keys(parsed).length;
                                                }
                                            } catch (e) {}
                                        } else if (typeof method.fields === 'object' && method.fields !== null) {
                                            fieldsObj = method.fields as Record<string, string>;
                                            fieldCount = Object.keys(fieldsObj).length;
                                        }
                                        
                                        return (
                                        <div key={method.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <span className="font-medium text-gray-800">{method.name}</span>
                                                {fieldCount > 0 && (
                                                    <span className="ml-2 text-xs text-gray-500">
                                                        ({fieldCount} campos)
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
                                        );
                                    })
                                )}
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex flex-col md:flex-row gap-3">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Nombre del método (ej: Transferencia, Pago Móvil)"
                                            value={newMethodName}
                                            onChange={(e) => setNewMethodName(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddPaymentMethod}
                                        disabled={savingMethod}
                                        className={`flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors ${savingMethod ? 'opacity-70' : ''}`}
                                    >
                                        {savingMethod ? '...' : <><Plus className="h-4 w-4" /> Agregar</>}
                                    </button>
                                </div>

                                <div className="mt-3 space-y-2">
                                    {newMethodFields.map((field, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                placeholder="Nombre del campo (ej: cedula)"
                                                value={field.key}
                                                onChange={(e) => handleFieldChangeMethod(index, 'key', e.target.value)}
                                                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                                            />
                                            <span className="text-gray-400">:</span>
                                            <input
                                                type="text"
                                                placeholder="Valor (ej: 31099537)"
                                                value={field.value}
                                                onChange={(e) => handleFieldChangeMethod(index, 'value', e.target.value)}
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
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Plantillas */}
                {activeTab === 'templates' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-5 w-5 text-indigo-600" />
                                <h3 className="font-bold text-gray-800">Plantillas PDF</h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">Personaliza el diseño de los documentos PDF generados por el sistema.</p>
                            
                            <button 
                                type="button" 
                                onClick={() => setShowTemplateEditor(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-sm transition-all"
                            >
                                <FileText className="h-5 w-5" />
                                Abrir Editor de Plantillas
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal del Editor de Plantillas con fondo difuminado */}
            {showTemplateEditor && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-auto">
                    <div className="min-h-screen p-4">
                        <PDFTemplateEditor 
                            condoId={condoId} 
                            onClose={() => setShowTemplateEditor(false)} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
