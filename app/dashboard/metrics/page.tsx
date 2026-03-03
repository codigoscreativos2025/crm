'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, FunnelChart, Funnel as RechartsFunnel, LabelList } from 'recharts';
import { ArrowLeft, MessageSquare, Clock, AlertTriangle, ArrowUpRight, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EscNavHandler from '@/components/EscNavHandler';

export default function MetricsDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedStage, setSelectedStage] = useState<{ id: number; name: string; peakHours: any[] } | null>(null);
    const [stageLeads, setStageLeads] = useState<any[]>([]);
    const [stageLoading, setStageLoading] = useState(false);
    const [stageSearch, setStageSearch] = useState('');
    const [showUnrepliedLeads, setShowUnrepliedLeads] = useState(false);
    const [selectedFunnel, setSelectedFunnel] = useState<{ name: string, peakHours: any[] } | null>(null);
    const [showWeeklyPeak, setShowWeeklyPeak] = useState(false);
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
        const intervalId = setInterval(fetchMetrics, 10000);
        return () => clearInterval(intervalId);
    }, [router]);

    const handleStageClick = async (stageId: number, stageName: string, peakHoursMap: any[]) => {
        setSelectedStage({ id: stageId, name: stageName, peakHours: peakHoursMap });
        setStageLoading(true);
        try {
            const res = await fetch(`/api/contacts`);
            const allContacts = await res.json();
            const filtered = allContacts.filter((c: any) => c.stageId === stageId);
            setStageLeads(filtered);
        } catch (err) {
            console.error("Error fetching stage leads", err);
        } finally {
            setStageLoading(false);
        }
    };

    const handleExport = async (format: 'pdf' | 'excel') => {
        try {
            const res = await fetch(`/api/metrics/export?format=${format}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kpis: data.kpis,
                    funnelStats: data.funnelStats,
                    tagsDensity: data.tagsDensity,
                    projections: data.projections
                })
            });
            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Reporte_Leads_CRM_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error al exportar:", error);
            // Replace native alert later if user wants
            alert("Hubo un problema exportando los datos.");
        }
    };

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

            {/* Derived Data for Advanced Charts */}
            {(() => {
                const funnelTotalsData = data.funnelStats?.map((f: any) => ({
                    name: f.name.length > 15 ? f.name.substring(0, 15) + '...' : f.name,
                    leads: f.totalLeads,
                    unanswered: f.totalUnanswered
                })) || [];

                const stageResponseData = data.funnelStats?.flatMap((f: any) =>
                    f.stages.map((s: any) => ({
                        name: `${s.name}`,
                        funnel: f.name,
                        responseTime: s.avgResponseTimeMins,
                        retention: s.avgTimeInStageDays
                    }))
                ).filter((s: any) => s.responseTime > 0 || s.retention > 0) || [];

                const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8B5CF6', '#EC4899'];

                // Colors for Density mapping
                const mappedFunnelTotals = funnelTotalsData.map((f: any, idx: number) => ({
                    ...f,
                    fill: COLORS[idx % COLORS.length]
                }));

                const flatStagesForFunnel = data.funnelStats?.flatMap((f: any) =>
                    f.stages.map((s: any) => ({
                        name: s.name,
                        value: s.count,
                        fill: COLORS[f.id % COLORS.length]
                    }))
                ).sort((a: any, b: any) => b.value - a.value) || [];

                return (
                    <>
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
                                <button onClick={() => handleExport('excel')} className="bg-white border text-sm text-whatsapp-green font-medium border-gray-200 px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-gray-50 transition">
                                    Exportar Excel
                                </button>
                                <button onClick={() => handleExport('pdf')} className="bg-white border text-sm text-red-500 font-medium border-gray-200 px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-gray-50 transition">
                                    Exportar PDF
                                </button>
                                <button className="bg-white border text-sm text-gray-600 border-gray-200 px-4 py-2 rounded-lg flex items-center shadow-sm">
                                    Últimos 30 Días
                                </button>
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 justify-items-stretch w-full sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* Card 1 */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Total Leads</span>
                                    <div className="text-whatsapp-green font-bold text-sm bg-green-50 px-2 py-1 rounded">
                                        +{data.kpis.newLeadsToday} hoy
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-4xl font-bold text-gray-900">{data.kpis.totalLeads.toLocaleString()}</h3>
                                    <p className="text-[12px] text-gray-400 font-medium mt-1">
                                        <ArrowUpRight className="h-3 w-3 inline text-whatsapp-green" />  {data.kpis.leadsThisMonth} este mes
                                    </p>
                                </div>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Active Dialogs</span>
                                    <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                                        <MessageSquare className="h-4 w-4" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-4xl font-bold text-gray-900">{data.kpis.activeDialogsCount.toLocaleString()}</h3>
                                    <p className="text-[12px] text-gray-400 font-medium mt-1">Conversaciones &lt; 15 mins</p>
                                </div>
                            </div>

                            {/* Card 3 */}
                            <div
                                onClick={() => setShowUnrepliedLeads(true)}
                                className="bg-red-50 p-5 rounded-2xl shadow-[0_0_0_1px_rgba(239,68,68,0.2)] cursor-pointer flex flex-col justify-between h-36 transition"
                            >
                                <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-red-700 uppercase tracking-tight">Unanswered Chats</span>
                                    <div className="p-1 bg-white text-red-500 rounded-md shadow-sm">
                                        <AlertTriangle className="h-3 w-3" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-4xl font-bold text-gray-900">{data.kpis.unrepliedMessages.toLocaleString()}</h3>
                                    <p className="text-[12px] text-red-600 font-medium mt-1">Action Required (Click ver)</p>
                                </div>
                            </div>

                            {/* Card 4 - Respuestas IA / Humano combinada para Dashboard Ejecutivo */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Avg Response Time</span>
                                    <div className="p-1.5 bg-blue-50 text-blue-500 rounded-md">
                                        <Clock className="h-4 w-4" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-4xl font-bold text-gray-900">{data.kpis.globalAvgResTimeIA}m / {data.kpis.globalAvgResTimeHuman}m</h3>
                                    <p className="text-[12px] text-gray-400 mt-1 font-medium">IA vs. Human Speed</p>
                                </div>
                            </div>

                            {/* Card 5 - Projections and Conversion */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Projected Growth</span>
                                    <div className="text-whatsapp-green font-bold text-sm">
                                        <ArrowUpRight className="h-4 w-4 inline" /> {data.projections.projectedGrowth}%
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-4xl font-bold text-gray-900">{data.projections.estimatedLeadsThisMonth.toLocaleString()}</h3>
                                    <p className="text-[12px] text-gray-400 mt-1 font-medium">Estimación leads (Fin de Mes)</p>
                                </div>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Left Column: Flow vs Time AreaChart */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold text-gray-800">
                                            Lead Inflow vs. Time
                                        </h3>
                                        <select
                                            className="text-sm border-gray-200 rounded-lg p-2 bg-gray-50 outline-none hover:bg-gray-100 transition"
                                            value={showWeeklyPeak ? 'weekly' : 'daily'}
                                            onChange={(e) => setShowWeeklyPeak(e.target.value === 'weekly')}
                                        >
                                            <option value="daily">Daily (Last 30 Days)</option>
                                            <option value="weekly">Hourly Peak (Overall)</option>
                                        </select>
                                    </div>

                                    <div className="h-[280px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            {showWeeklyPeak ? (
                                                <AreaChart data={data.peakHours}>
                                                    <defs>
                                                        <linearGradient id="colorPeak2" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                    <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPeak2)" />
                                                </AreaChart>
                                            ) : (
                                                <AreaChart data={data.leadInflow}>
                                                    <defs>
                                                        <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                    <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorInflow)" />
                                                </AreaChart>
                                            )}
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Donut Chart - Lead Sources / Funnel Density */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-800 w-full text-left mb-4">Densidad de Embudos</h3>
                                <div className="flex-1 flex flex-col justify-center items-center w-full relative">
                                    <div className="h-[200px] w-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={mappedFunnelTotals}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={85}
                                                    paddingAngle={2}
                                                    dataKey="leads"
                                                    stroke="none"
                                                    cornerRadius={4}
                                                >
                                                    {mappedFunnelTotals.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-2xl font-bold text-gray-900">{data.funnelStats?.length || 0}</span>
                                            <span className="text-[10px] text-gray-400 border-t uppercase font-bold tracking-wider mt-1 pt-1">Embudos</span>
                                        </div>
                                    </div>

                                    {/* Legend */}
                                    <div className="w-full mt-4 space-y-2 px-2 overflow-y-auto max-h-32">
                                        {mappedFunnelTotals.map((source: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: source.fill }}></div>
                                                    <span className="truncate max-w-[120px]" title={source.name}>{source.name}</span>
                                                </div>
                                                <span className="font-bold text-gray-800 text-sm">
                                                    {data.kpis.totalLeads > 0 ? Math.round((source.leads / data.kpis.totalLeads) * 100) : 0}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Extended Analytics Row 1: Funnel Chart & Velocity */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Funnel Chart - Leads By Stage */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Leads by Stage (Global Conversion Flow)</h3>
                                <p className="text-xs text-gray-400 mb-6">Flujo general de retención de prospectos combinando sub-etapas.</p>
                                <div className="h-[280px] w-full bg-gray-50/50 rounded-xl relative flex justify-center items-center overflow-visible">
                                    <ResponsiveContainer width="90%" height="90%">
                                        <FunnelChart>
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <RechartsFunnel
                                                dataKey="value"
                                                data={flatStagesForFunnel}
                                                isAnimationActive
                                            >
                                                <LabelList position="right" fill="#4b5563" stroke="none" dataKey="name" fontSize={12} />
                                                <LabelList position="center" fill="#ffffff" stroke="none" dataKey="value" fontSize={14} fontWeight="bold" />
                                            </RechartsFunnel>
                                        </FunnelChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Velocidad de Respuesta */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-6">Velocidad Promedio por Etapa (Minutos)</h3>
                                <div className="h-[280px] w-full">
                                    {stageResponseData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart layout="vertical" data={stageResponseData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4b5563' }} />
                                                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Bar dataKey="responseTime" name="Mins. Respuesta" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={30} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">Insuficientes datos de respuesta para graficar.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Extended Analytics Row 2: Tags & ... */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Tags Density */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-6">Densidad por Etiquetas (Intereses)</h3>
                                <div className="h-[280px] w-full">
                                    {data.tagsDensity && data.tagsDensity.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={data.tagsDensity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                                <XAxis dataKey="tag" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Bar dataKey="count" name="Frecuencia" fill="#EC4899" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sin etiquetas registradas en este periodo.</div>
                                    )}
                                </div>
                            </div>

                            {/* Predictive Projections */}
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-center items-center text-center">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Proyecciones (Fin de Mes)</h3>
                                <p className="text-sm text-gray-500 mb-8 max-w-sm">
                                    Basado en los últimos 30 días, este es el estimado de crecimiento para el cierre del mes.
                                </p>

                                <div className="grid grid-cols-2 gap-4 w-full px-4">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <div className="text-3xl font-black text-blue-600 mb-1">{data.projections?.estimatedLeadsThisMonth.toLocaleString()}</div>
                                        <div className="text-xs font-bold text-gray-400 uppercase">Leads Proyectados</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <div className="text-3xl font-black text-indigo-600 mb-1">{data.projections?.estimatedMessagesThisMonth.toLocaleString()}</div>
                                        <div className="text-xs font-bold text-gray-400 uppercase">Msgs Proyectados</div>
                                    </div>
                                    <div className="col-span-2 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mt-2">
                                        <div className="text-4xl font-black text-whatsapp-green mb-1">+{data.projections?.projectedGrowth}%</div>
                                        <div className="text-xs font-bold text-gray-400 uppercase">Crecimiento Estimado (vs Mes Anterior)</div>
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
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-bold text-gray-800">
                                                            {funnel.name}
                                                        </h4>
                                                        <button
                                                            onClick={() => {
                                                                const agg = new Array(24).fill(0);
                                                                funnel.stages.forEach((s: any) => {
                                                                    s.stagePeakHours.forEach((ph: any) => {
                                                                        const hrIdx = parseInt(ph.hour.split(':')[0]);
                                                                        agg[hrIdx] += ph.count;
                                                                    });
                                                                });
                                                                const peakAgg = agg.map((c, hr) => ({ hour: `${hr.toString().padStart(2, '0')}:00`, count: c }));
                                                                setSelectedFunnel({ name: funnel.name, peakHours: peakAgg });
                                                            }}
                                                            className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold hover:bg-gray-200 transition"
                                                        >
                                                            Ver Gráfica
                                                        </button>
                                                    </div>
                                                    <span className="bg-whatsapp-green text-white text-xs px-2 py-1 rounded-full font-bold">
                                                        {funnel.totalLeads} Leads
                                                    </span>
                                                </div>
                                                <div className="space-y-3">
                                                    {funnel.stages.map((stage: any, sIdx: number) => (
                                                        <div
                                                            key={sIdx}
                                                            onClick={() => handleStageClick(stage.id, stage.name, stage.stagePeakHours)}
                                                            className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex flex-col cursor-pointer hover:border-whatsapp-green transition-colors"
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                                                                <span className="text-sm font-bold text-gray-900">{stage.count}</span>
                                                            </div>
                                                            <div className="text-xs text-gray-400 mt-2 flex justify-between items-center border-t border-gray-50 pt-2">
                                                                <div className="flex flex-col gap-1">
                                                                    <span title="Días atrapados en esta etapa">
                                                                        <Clock className="w-3 h-3 inline mr-1 text-blue-400" />
                                                                        {stage.avgTimeInStageDays}d prom.
                                                                    </span>
                                                                    <span title="Leads sin contestar">
                                                                        <AlertTriangle className="w-3 h-3 inline mr-1 text-red-400" />
                                                                        {stage.unansweredCount} esperando
                                                                    </span>
                                                                </div>
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

                        {/* Modal de Leads por Etapa */}
                        {selectedStage && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
                                <div className="bg-white max-w-4xl w-full m-4 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Leads en: {selectedStage.name}</h2>
                                            <p className="text-sm text-gray-500 mt-1">Total: {stageLeads.length} contactos</p>
                                        </div>
                                        <button onClick={() => setSelectedStage(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div className="relative w-full md:w-1/3">
                                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar por nombre o teléfono..."
                                                className="pl-9 pr-4 py-2 w-full bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-whatsapp-green transition"
                                                value={stageSearch}
                                                onChange={(e) => setStageSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="w-full md:w-2/3 h-[70px] flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Actividad:</span>
                                            <div className="flex-1 h-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={selectedStage.peakHours}>
                                                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '4px', border: 'none', fontSize: '12px', padding: '4px 8px' }} />
                                                        <Bar dataKey="count" name="Msgs" fill="#8b5cf6" radius={[2, 2, 0, 0]} maxBarSize={15} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto p-0 flex-1">
                                        {stageLoading ? (
                                            <div className="p-12 text-center text-gray-500">Cargando leads...</div>
                                        ) : (
                                            <table className="w-full text-left text-sm text-gray-600">
                                                <thead className="bg-gray-50 sticky top-0 text-xs uppercase tracking-wider text-gray-500 z-10 shadow-sm border-b border-gray-100">
                                                    <tr>
                                                        <th className="p-4 font-semibold">Contacto</th>
                                                        <th className="p-4 font-semibold">Teléfono</th>
                                                        <th className="p-4 font-semibold">Estado AI</th>
                                                        <th className="p-4 font-semibold text-right">Creado/Modificado</th>
                                                        <th className="p-4 font-semibold text-center">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {stageLeads.filter(l => (l.name || l.phone).toLowerCase().includes(stageSearch.toLowerCase())).map(lead => (
                                                        <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="p-4 font-medium text-gray-900">
                                                                {lead.name || 'Sin Nombre'}
                                                                {lead.unreadCount > 0 && <span className="ml-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{lead.unreadCount} in</span>}
                                                            </td>
                                                            <td className="p-4">{lead.phone}</td>
                                                            <td className="p-4">
                                                                {lead.aiDisabledUntil && new Date(lead.aiDisabledUntil).getTime() > Date.now()
                                                                    ? <span className="text-red-500 bg-red-50 px-2 py-1 rounded text-xs font-semibold">Pausada</span>
                                                                    : <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-semibold">Activa</span>
                                                                }
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <div className="text-gray-900">{new Date(lead.createdAt).toLocaleDateString()}</div>
                                                                <div className="text-xs text-gray-400">{new Date(lead.updatedAt).toLocaleDateString()}</div>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <Link href={`/dashboard/chat/${lead.id}`} className="text-whatsapp-green font-medium hover:underline text-sm flex justify-center items-center gap-1">
                                                                    <MessageSquare className="h-3 w-3" /> Chat
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {stageLeads.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="p-8 text-center text-gray-500">No hay leads en esta etapa o con esa búsqueda.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Modal para Horas Pico a nivel Embudo */}
                        {selectedFunnel && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <div className="bg-white max-w-2xl w-full rounded-xl shadow-xl overflow-hidden flex flex-col">
                                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Horas de Mayor Actividad</h2>
                                            <p className="text-sm text-gray-500 mt-1">Embudo: {selectedFunnel.name}</p>
                                        </div>
                                        <button onClick={() => setSelectedFunnel(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="p-6 h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={selectedFunnel.peakHours}>
                                                <defs>
                                                    <linearGradient id="colorFunnelPeak" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#003366" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#003366" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Area type="monotone" dataKey="count" stroke="#003366" strokeWidth={3} fillOpacity={1} fill="url(#colorFunnelPeak)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Modal Leads Sin Respuesta */}
                        {showUnrepliedLeads && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 overflow-y-auto">
                                <div className="bg-white max-w-4xl w-full m-4 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 text-red-600 flex items-center gap-2">
                                                <AlertTriangle className="h-6 w-6" /> Leads Sin Respuesta
                                            </h2>
                                            <p className="text-sm text-gray-500 mt-1">Total: {data.unrepliedLeadsList?.length || 0} contactos esperando acción</p>
                                        </div>
                                        <button onClick={() => setShowUnrepliedLeads(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row items-center gap-4">
                                        <div className="relative w-full md:w-1/3">
                                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Filtrar por nombre, embudo o etapa..."
                                                className="pl-9 pr-4 py-2 w-full bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 transition"
                                                value={stageSearch}
                                                onChange={(e) => setStageSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="w-full md:w-2/3 h-[90px] flex items-center gap-2">
                                            <div className="flex-1 h-full bg-white border border-red-100 rounded-lg p-2">
                                                <div className="text-[10px] font-bold text-red-500 mb-1 ml-1 uppercase tracking-wider">Acumulación de Horas de Chats Ignorados</div>
                                                <ResponsiveContainer width="100%" height="80%">
                                                    <AreaChart data={data.unrepliedPeakHours || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#ef4444' }} />
                                                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '4px', border: 'none', fontSize: '11px', padding: '4px 8px' }} />
                                                        <Area type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} fillOpacity={0.2} fill="#ef4444" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto p-0 flex-1">
                                        <table className="w-full text-left text-sm text-gray-600">
                                            <thead className="bg-gray-50 sticky top-0 text-xs uppercase tracking-wider text-gray-500 z-10 shadow-sm border-b border-gray-100">
                                                <tr>
                                                    <th className="p-4 font-semibold">Contacto</th>
                                                    <th className="p-4 font-semibold">Embudo / Etapa</th>
                                                    <th className="p-4 font-semibold text-center">Espera</th>
                                                    <th className="p-4 font-semibold text-center">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {(data.unrepliedLeadsList || [])
                                                    .filter((l: any) => (l.name || l.phone || l.funnelName || l.stageName).toLowerCase().includes(stageSearch.toLowerCase()))
                                                    // Inherent grouping by sorting by Funnel and Stage
                                                    .sort((a: any, b: any) => a.funnelName.localeCompare(b.funnelName) || a.stageName.localeCompare(b.stageName))
                                                    .map((lead: any) => (
                                                        <tr key={lead.id} className="hover:bg-red-50/50 transition-colors">
                                                            <td className="p-4 font-medium text-gray-900 border-l-4 border-red-500">
                                                                {lead.name || 'Sin Nombre'}
                                                                <span className="block text-xs text-gray-400">{lead.phone}</span>
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="font-bold text-gray-700">{lead.funnelName}</span>
                                                                <span className="block text-xs text-gray-500">{lead.stageName}</span>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <div className="text-red-600 font-bold">{lead.timeInStage} días</div>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <Link href={`/dashboard/chat/${lead.id}`} className="text-whatsapp-green font-medium hover:underline text-sm flex justify-center items-center gap-1">
                                                                    <MessageSquare className="h-3 w-3" /> Responder
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                {(!data.unrepliedLeadsList || data.unrepliedLeadsList.length === 0) && (
                                                    <tr>
                                                        <td colSpan={4} className="p-8 text-center text-gray-500">No hay leads pendientes de respuesta.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* End of render scope */}
                    </>
                )
            })()}
        </div >
    );
}
