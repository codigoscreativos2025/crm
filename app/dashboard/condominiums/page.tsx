'use client';

import { useState, useEffect } from 'react';
import { Building, Home, Users, ArrowUpCircle, ArrowDownCircle, BarChart3, Plus, Settings, FileText, Clock } from 'lucide-react';
import MetricsTab from './components/MetricsTab';
import ResidentsTab from './components/ResidentsTab';
import TransactionsTab from './components/TransactionsTab';
import LogsTab from './components/LogsTab';
import InvoicesTab from './components/InvoicesTab';
import SettingsTab from './components/SettingsTab';

export default function CondominiumsPage() {
    const [loading, setLoading] = useState(true);
    const [isEnabled, setIsEnabled] = useState(false);
    const [condoData, setCondoData] = useState<any>(null);

    // Form setup
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [setupForm, setSetupForm] = useState({ name: '', type: 'APARTAMENTO' });
    const [setupError, setSetupError] = useState('');

    // Tabs
    const [activeTab, setActiveTab] = useState('metrics'); // metrics, residents, incomes, expenses

    useEffect(() => {
        const init = async () => {
            try {
                // 1. Check Profile for isCondoEnabled
                const profRes = await fetch('/api/auth/profile');
                if (profRes.ok) {
                    const { user } = await profRes.json();
                    if (!user.isCondoEnabled) {
                        setLoading(false);
                        return;
                    }
                    setIsEnabled(true);
                }

                // 2. Fetch config
                await fetchCondo();
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        init();
    }, []);

    const fetchCondo = async () => {
        const res = await fetch('/api/condominiums');
        if (res.ok) {
            const data = await res.json();
            if (data.exists) {
                setCondoData(data.data);
            }
        }
    };

    const handleCreateCondo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSetupError('');
        try {
            const res = await fetch('/api/condominiums', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(setupForm)
            });
            if (res.ok) {
                await fetchCondo();
            } else {
                const errData = await res.json();
                setSetupError(errData.error || 'Error creando condominio');
            }
        } catch (err) {
            setSetupError('Error de red');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
    }

    if (!isEnabled) {
        return (
            <div className="p-8 max-w-2xl mx-auto text-center mt-20">
                <Building className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Módulo de Condominios Desactivado</h1>
                <p className="text-gray-500">Este módulo avanzado no está habilitado para tu cuenta. Contacta al administrador para solicitar acceso.</p>
            </div>
        );
    }

    // Setup Flow
    if (!condoData) {
        return (
            <div className="p-8 max-w-xl mx-auto mt-10">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <div className="flex items-center gap-3 mb-6 border-b pb-4">
                        <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                            <Building className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Configurar Condominio</h1>
                            <p className="text-sm text-gray-500">Inicia tu gestor de propiedades</p>
                        </div>
                    </div>

                    {setupError && <div className="p-3 bg-red-100 text-red-700 text-sm rounded mb-4">{setupError}</div>}

                    <form onSubmit={handleCreateCondo} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Condominio / Edificio</label>
                            <input
                                required
                                type="text"
                                className="w-full border p-2.5 rounded-md outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Ej: Residencial Los Alpes"
                                value={setupForm.name}
                                onChange={e => setSetupForm({ ...setupForm, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Propiedad Principal</label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className={`border rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-all ${setupForm.type === 'APARTAMENTO' ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                    <input type="radio" className="sr-only" name="type" onClick={() => setSetupForm({ ...setupForm, type: 'APARTAMENTO' })} />
                                    <Building className={`h-6 w-6 ${setupForm.type === 'APARTAMENTO' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    <span className={`text-sm font-medium ${setupForm.type === 'APARTAMENTO' ? 'text-indigo-700' : 'text-gray-600'}`}>Torres / Apartamentos</span>
                                </label>
                                <label className={`border rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-all ${setupForm.type === 'CASA' ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                    <input type="radio" className="sr-only" name="type" onClick={() => setSetupForm({ ...setupForm, type: 'CASA' })} />
                                    <Home className={`h-6 w-6 ${setupForm.type === 'CASA' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    <span className={`text-sm font-medium ${setupForm.type === 'CASA' ? 'text-indigo-700' : 'text-gray-600'}`}>Casas / Villas</span>
                                </label>
                            </div>
                        </div>
                        <button disabled={isSubmitting} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-md transition-colors disabled:opacity-70 mt-4 flex justify-center">
                            {isSubmitting ? 'Guardando...' : 'Crear Condominio'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Main Dashboard
    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        {condoData.type === 'CASA' ? <Home className="h-5 w-5" /> : <Building className="h-5 w-5" />}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">{condoData.name}</h1>
                        <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">Módulo de Administración</p>
                    </div>
                </div>
                <button 
                    onClick={() => setActiveTab('settings')}
                    className={`text-gray-400 hover:text-gray-600 p-2 rounded-full transition ${activeTab === 'settings' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'}`}
                    title="Ajustes de Condominio"
                >
                    <Settings className="h-5 w-5" />
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 border-b border-gray-200 bg-white overflow-x-auto">
                <nav className="flex gap-6 min-w-max">
                    <button
                        onClick={() => setActiveTab('metrics')}
                        className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'metrics' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <BarChart3 className="h-4 w-4" /> Métricas e Informes
                    </button>
                    <button
                        onClick={() => setActiveTab('residents')}
                        className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'residents' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <Users className="h-4 w-4" /> Residentes <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{condoData._count?.residents || 0}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('incomes')}
                        className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'incomes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <ArrowDownCircle className="h-4 w-4" /> Ingresos / Pagos
                    </button>
                    <button
                        onClick={() => setActiveTab('expenses')}
                        className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'expenses' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <ArrowUpCircle className="h-4 w-4" /> Egresos / Gastos
                    </button>
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'invoices' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <FileText className="h-4 w-4" /> Facturas Emisión
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'logs' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <Clock className="h-4 w-4" /> Historial
                    </button>
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-7xl mx-auto h-full">
                    {activeTab === 'metrics' && <MetricsTab condoId={condoData.id} />}
                    {activeTab === 'residents' && <ResidentsTab condoId={condoData.id} />}
                    {activeTab === 'incomes' && <TransactionsTab condoId={condoData.id} type="INCOME" />}
                    {activeTab === 'expenses' && <TransactionsTab condoId={condoData.id} type="EXPENSE" />}
                    {activeTab === 'invoices' && <InvoicesTab condoId={condoData.id} />}
                    {activeTab === 'logs' && <LogsTab condoId={condoData.id} />}
                    {activeTab === 'settings' && <SettingsTab condoId={condoData.id} />}
                </div>
            </div>
        </div>
    );
}
