'use client';

import { useState, useEffect } from 'react';

// Tipos básicos para el listado
interface Funnel {
    id: number;
    name: string;
    stages?: { id: number, name: string }[];
}

export default function ProfileForm() {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Funnel Config State
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [defaultFunnelId, setDefaultFunnelId] = useState<string>('');
    const [defaultStageId, setDefaultStageId] = useState<string>('');
    const [aiDeactivationMinutes, setAiDeactivationMinutes] = useState<number>(60);
    const [loadedFunnel, setLoadedFunnel] = useState(false);

    useEffect(() => {
        // Obtenemos los embudos del usuario
        fetch('/api/funnels')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setFunnels(data);
            })
            .catch(err => console.error(err));

        // Obtener el config actual de funnel (simulando desde sesión o un endpoint rápido)
        // Para esto necesitamos que un endpoint devuelva los datos del perfil
        fetch('/api/auth/session') // NextAuth expone la sesión
            .then(res => res.json())
            .then(data => {
                if (data?.user) {
                    if (data.user.defaultFunnelId) setDefaultFunnelId(String(data.user.defaultFunnelId));
                    if (data.user.defaultStageId) setDefaultStageId(String(data.user.defaultStageId));
                    if (data.user.aiDeactivationMinutes) setAiDeactivationMinutes(Number(data.user.aiDeactivationMinutes));
                }
                setLoadedFunnel(true);
            })
            .catch(() => setLoadedFunnel(true));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg('');
        setError('');

        if (password && password !== confirm) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        try {
            const payload: any = {};
            if (password) payload.password = password;
            // Solo mandamos si realmente se interactuó y cargó
            if (loadedFunnel) {
                payload.defaultFunnelId = defaultFunnelId || null;
                payload.defaultStageId = defaultStageId || null;
                payload.aiDeactivationMinutes = aiDeactivationMinutes;
            }

            if (Object.keys(payload).length === 0) {
                setMsg('No hay cambios para guardar.');
                setLoading(false);
                return;
            }

            const res = await fetch('/api/auth/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setMsg('Perfil actualizado correctamente');
                setPassword('');
                setConfirm('');
            } else {
                setError('Error al actualizar el perfil');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
            {msg && <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm border border-green-200">{msg}</div>}
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm border border-red-200">{error}</div>}

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">Seguridad</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Dejar en blanco para no cambiar"
                            className="w-full border border-gray-300 rounded-md p-2 focus:ring-whatsapp-green focus:border-whatsapp-green outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                        <input
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2 focus:ring-whatsapp-green focus:border-whatsapp-green outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">Configuración de Leads</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Embudo por defecto (nuevos contactos)</label>
                    <p className="text-xs text-gray-500 mb-2">Los nuevos contactos que lleguen por webhook se enviarán a la primera etapa de este embudo de forma automática.</p>
                    <select
                        value={defaultFunnelId}
                        onChange={(e) => setDefaultFunnelId(e.target.value)}
                        disabled={!loadedFunnel}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-whatsapp-green focus:border-whatsapp-green outline-none"
                    >
                        <option value="">Ninguno</option>
                        {funnels.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>

                    <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Etapa por defecto</label>
                    <select
                        value={defaultStageId}
                        onChange={(e) => setDefaultStageId(e.target.value)}
                        disabled={!loadedFunnel || !defaultFunnelId}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-whatsapp-green focus:border-whatsapp-green outline-none"
                    >
                        <option value="">Primera etapa (por defecto)</option>
                        {funnels.find(f => f.id === Number(defaultFunnelId))?.stages?.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>

                    <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Tiempo de Desactivación de IA (Minutos)</label>
                    <p className="text-xs text-gray-500 mb-2">Al pausar manualmente un lead en el chat, la IA no responderá durante la cantidad de minutos especificada aquí.</p>
                    <input
                        type="number"
                        min="1"
                        value={aiDeactivationMinutes}
                        onChange={(e) => setAiDeactivationMinutes(Number(e.target.value))}
                        disabled={!loadedFunnel}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-whatsapp-green focus:border-whatsapp-green outline-none"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-whatsapp-green text-white px-4 py-3 rounded-md font-medium hover:bg-whatsapp-teal transition disabled:opacity-50"
            >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
        </form>
    );
}
