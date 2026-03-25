'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, AlertCircle, PieChart as PieChartIcon, BarChart3, Calendar } from 'lucide-react';

export default function MetricsTab({ condoId }: { condoId: number }) {
    const [loading, setLoading] = useState(true);
    const [incExpData, setIncExpData] = useState([]);
    const [delinquencyData, setDelinquencyData] = useState([]);
    const [categoryData, setCategoryData] = useState<{ingresos: any[], egresos: any[]}>({ingresos: [], egresos: []});
    const [months, setMonths] = useState(6);

    const fetchAll = async (m: number) => {
        setLoading(true);
        try {
            const [res1, res2, res3] = await Promise.all([
                fetch(`/api/condominiums/${condoId}/metrics/income-vs-expense?months=${m}`),
                fetch(`/api/condominiums/${condoId}/metrics/delinquency`),
                fetch(`/api/condominiums/${condoId}/metrics/category-percentages`)
            ]);

            if (res1.ok) setIncExpData(await res1.json());
            if (res2.ok) setDelinquencyData(await res2.json());
            if (res3.ok) setCategoryData(await res3.json());
            
        } catch(e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAll(months);
    }, [condoId]);

    const handleMonthsChange = (m: number) => {
        setMonths(m);
        fetchAll(m);
    };

    const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                    Resumen Financiero del Condominio
                </h2>
                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <select 
                        value={months} 
                        onChange={e => handleMonthsChange(Number(e.target.value))}
                        className="text-sm border-none outline-none bg-transparent font-medium text-gray-700"
                    >
                        <option value={3}>Últimos 3 meses</option>
                        <option value={6}>Últimos 6 meses</option>
                        <option value={9}>Últimos 9 meses</option>
                        <option value={12}>Último año</option>
                        <option value={24}>Últimos 2 años</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center p-10 text-gray-500">Cargando métricas...</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Ingresos vs Egresos */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                            Ingresos vs Egresos
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={incExpData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} tickFormatter={value => `$${value/1000}k`} />
                                    <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} cursor={{fill: '#F3F4F6'}} />
                                    <Legend wrapperStyle={{fontSize: '12px'}} />
                                    <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} barSize={32} />
                                    <Bar dataKey="egresos" name="Egresos" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Morosidad */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            Estado de Morosidad (Mes Actual)
                        </h3>
                        <div className="h-64 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={delinquencyData} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={60} 
                                        outerRadius={90} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                    >
                                        {delinquencyData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '12px'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    {/* Categorías de Gasto */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <PieChartIcon className="h-4 w-4 text-purple-500" />
                            Desglose por Categoría (Mes Actual)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase text-center mb-2">Ingresos</h4>
                                <div className="h-56">
                                    {categoryData.ingresos.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={categoryData.ingresos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, percent}: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                                                    {categoryData.ingresos.map((entry: any, index: number) => (
                                                        <Cell key={`cell-i-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(val: number | undefined) => formatCurrency(val || 0)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-center text-sm text-gray-400 mt-20">Sin ingresos conciliados este mes</p>}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase text-center mb-2">Egresos</h4>
                                <div className="h-56">
                                {categoryData.egresos.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={categoryData.egresos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, percent}: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                                                    {categoryData.egresos.map((entry: any, index: number) => (
                                                        <Cell key={`cell-e-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(val: number | undefined) => formatCurrency(val || 0)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-center text-sm text-gray-400 mt-20">Sin egresos conciliados este mes</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
