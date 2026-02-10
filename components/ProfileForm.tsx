'use client';

import { useState } from 'react';

export default function ProfileForm() {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg('');
        setError('');

        if (password !== confirm) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                setMsg('Contraseña actualizada correctamente');
                setPassword('');
                setConfirm('');
            } else {
                setError('Error al actualizar contraseña');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            {msg && <div className="p-2 bg-green-100 text-green-700 rounded text-sm">{msg}</div>}
            {error && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-whatsapp-green focus:border-whatsapp-green outline-none"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-whatsapp-green focus:border-whatsapp-green outline-none"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="bg-[#008069] text-white px-4 py-2 rounded hover:bg-[#006050] transition disabled:opacity-50"
            >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
        </form>
    );
}
