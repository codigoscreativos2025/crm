'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowLeft, MessageSquare, Clock, AlertTriangle, ArrowUpRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EscNavHandler from '@/components/EscNavHandler';

export default function MetricsDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const res = await fetch('/api/metrics');
                if (res.status === 401 || res.status === 403) {
                    router.push('/dashboard');
                    return;
                }
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error("Error fetching metrics", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [router]);

    if (loading || !data) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-whatsapp-green border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto h-full overflow-y-auto space-y-6">
            <EscNavHandler />
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center">
                        <Link href="/dashboard" className="mr-3 text-gray-500 hover:text-gray-700 bg-white p-2 border border-gray-200 shadow-sm rounded-full transition-colors flex items-center justify-center">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview Dashboard</h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.open('/api/metrics/export?format=excel', '_blank')} className="bg-white border text-sm text-whatsapp-green font-medium border-gray-200 px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-gray-50 transition">
                        Exportar Excel
                    </button>
                    <button onClick={() => window.open('/api/metrics/export?format=pdf', '_blank')} className="bg-white border text-sm text-red-500 font-medium border-gray-200 px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-gray-50 transition">
                        Exportar PDF
                    </button>
                    <button className="bg-white border text-sm text-gray-600 border-gray-200 px-4 py-2 rounded-lg flex items-center shadow-sm">
                        Últimos 30 Días
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Leads</span>
                        <div className="p-1.5 bg-green-50 text-green-600 rounded-md">
                            <ArrowUpRight className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-4xl font-bold text-gray-900">{data.kpis.totalLeads.toLocaleString()}</h3>
                            <span className="text-sm font-semibold text-whatsapp-green">+{data.kpis.newLeadsToday} hoy</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{data.kpis.leadsThisMonth} creados este mes</p>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Diálogos Activos</span>
                        <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                            <MessageSquare className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-4xl font-bold text-purple-600">{data.kpis.messagesThisMonth.toLocaleString()}</h3>
                        <p className="text-xs text-green-500 font-medium mt-1">+{data.kpis.messagesThisMonth} vs mes pasado</p>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Chats sin respuesta</span>
                        <div className="p-1.5 bg-red-50 text-red-500 rounded-md">
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-4xl font-bold text-gray-900">{data.kpis.unrepliedMessages.toLocaleString()}</h3>
                        <p className="text-xs text-red-400 font-medium mt-1">Atención requerida</p>
                    </div>
                </div>

                {/* Card 4 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tiempo de Resp. Promedio</span>
                        <div className="p-1.5 bg-blue-50 text-blue-500 rounded-md">
                            <Clock className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-4xl font-bold text-green-500">2m 14s</h3>
                        <p className="text-xs text-gray-400 mt-1">Aceptable</p>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Channel & Trend */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Performance & Trends */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Rendimiento y Tendencia de Canales</h3>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 bg-whatsapp-green text-white text-xs font-bold rounded-full">Mes</button>
                            </div>
                        </div>

                        {/* Channel Bars */}
                        <div className="space-y-4 mb-8">
                            {data.channelPerformance.map((channel: any, idx: number) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: channel.color }}></div>
                                            <span className="text-gray-700 font-medium">{channel.name}</span>
                                        </div>
                                        <span className="font-bold text-gray-900" style={{ color: channel.color }}>{channel.value.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min((channel.value / data.kpis.totalLeads) * 100, 100)}%`, backgroundColor: channel.color }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="h-64 mt-4 relative">
                            <div className="absolute top-2 left-2 z-10">
                                <span className="text-sm text-gray-500">Crecimiento de Leads</span>
                                <h4 className="text-xl font-bold">+12.5%</h4>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.leadsTrend}>
                                    <defs>
                                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#25D366" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="leads" stroke="#25D366" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Right Column: Donut Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                    <h3 className="text-lg font-bold text-gray-800 w-full text-left mb-4">Fuentes de Leads</h3>
                    <div className="flex-1 flex flex-col justify-center items-center w-full relative">
                        <div className="h-[250px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.leadSources}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={95}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={4}
                                    >
                                        {data.leadSources.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-gray-900">API</span>
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Primaria</span>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="w-full mt-6 space-y-3 px-4">
                            {data.leadSources.map((source: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: source.color }}></div>
                                        {source.name}
                                    </div>
                                    <span className="font-bold text-gray-800 text-sm">
                                        {Math.round((source.value / data.kpis.totalLeads) * 100)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Funnels & Table */}
            <div className="space-y-6 mb-10">

                {/* Funnel Stats */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Distribución por Embudos</h3>

                    {data.funnelStats && data.funnelStats.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {data.funnelStats.map((funnel: any, idx: number) => (
                                <div key={idx} className="border border-gray-100 p-4 rounded-xl bg-gray-50/50">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-gray-800">{funnel.name}</h4>
                                        <span className="bg-whatsapp-green text-white text-xs px-2 py-1 rounded-full font-bold">
                                            {funnel.totalLeads} Leads
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {funnel.stages.map((stage: any, sIdx: number) => (
                                            <div key={sIdx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex flex-col">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                                                    <span className="text-sm font-bold text-gray-900">{stage.count}</span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1 flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Promedio: {stage.avgDaysRes} {stage.avgDaysRes === 1 ? 'hora' : 'horas'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 text-sm">No hay embudos configurados o con datos.</div>
                    )}
                </div>
            </div>

            {/* Bottom Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-10">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Mensajes Entrantes Recientes</h3>
                    <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Buscar contacto..." className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-whatsapp-green/20" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4">Fragmento de Mensaje</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Fuente</th>
                                <th className="px-6 py-4 text-right">Hora</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.recentMessages.map((msg: any) => (
                                <tr key={msg.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{msg.contactName}</td>
                                    <td className="px-6 py-4 text-gray-500 truncate max-w-[250px]">{msg.snippet}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${msg.status === 'Nuevo' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                            {msg.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{msg.source}</td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900">{msg.time}</td>
                                </tr>
                            ))}
                            {data.recentMessages.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No hay mensajes recientes</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="h-8"></div> {/* Spacer */}
        </div>
    );
}
