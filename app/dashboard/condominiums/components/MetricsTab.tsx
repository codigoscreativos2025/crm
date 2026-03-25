'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, AlertCircle, PieChart as PieChartIcon } from 'lucide-react';

export default function MetricsTab({ condoId }: { condoId: number }) {
    const [loading, setLoading] = useState(true);
    const [incExpData, setIncExpData] = useState([]);
    const [delinquencyData, setDelinquencyData] = useState([]);
    const [categoryData, setCategoryData] = useState<{ingresos: any[], egresos: any[]}>({ingresos: [], egresos: []});

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [res1, res2, res3] = await Promise.all([
                    fetch(`/api/condominiums/${condoId}/metrics/income-vs-expense`),
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
        fetchAll();
    }, [condoId]);

    if (loading) return <div className="text-center p-10 text-gray-500">Cargando métricas...</div>;

    const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                Resumen Financiero del Condominio
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ingresos vs Egresos */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        Ingresos vs Egresos (Últimos 6 Meses)
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
        </div>
    );
}

// Para solucionar la importacion de lucide react (no estaba BarChart3 en el de lineas arriba)
import { BarChart3 } from 'lucide-react';
