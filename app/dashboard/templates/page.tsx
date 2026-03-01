'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, Edit2, MessageSquareQuote } from 'lucide-react';

interface Template {
    id: number;
    name: string;
    content: string;
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [form, setForm] = useState({ name: '', content: '' });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/templates');
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            } else {
                setError('Error al cargar plantillas');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.content.trim()) {
            setError('El nombre y el contenido son obligatorios');
            return;
        }

        try {
            const method = editingTemplate ? 'PUT' : 'POST';
            const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : '/api/templates';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setEditingTemplate(null);
                setForm({ name: '', content: '' });
                setError('');
                fetchTemplates();
            } else {
                setError('Error al guardar plantilla');
            }
        } catch (err) {
            setError('Error de conexión');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar esta plantilla?')) return;
        try {
            const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchTemplates();
            } else {
                setError('Error al eliminar plantilla');
            }
        } catch (err) {
            setError('Error de conexión');
        }
    };

    const handleEdit = (tmpl: Template) => {
        setEditingTemplate(tmpl);
        setForm({ name: tmpl.name, content: tmpl.content });
        setError('');
    };

    const handleCancel = () => {
        setEditingTemplate(null);
        setForm({ name: '', content: '' });
        setError('');
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando plantillas...</div>;

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <MessageSquareQuote className="h-6 w-6 text-blue-500" /> Plantillas de Mensajes
                </h1>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Formulario */}
                <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                        {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Corto</label>
                            <input
                                type="text"
                                placeholder="Ej: Saludo"
                                className="w-full border border-gray-300 p-2 rounded-md outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cuerpo del Mensaje</label>
                            <textarea
                                placeholder="Hola, ¿en qué puedo ayudarte hoy?"
                                className="w-full border border-gray-300 p-2 rounded-md outline-none focus:ring-1 focus:ring-blue-500 min-h-[120px] text-sm text-gray-900"
                                value={form.content}
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium text-sm transition flex items-center justify-center gap-1"
                            >
                                <Save className="h-4 w-4" /> Guardar
                            </button>
                            {editingTemplate && (
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-md font-medium text-sm transition"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Usa <kbd className="bg-gray-100 px-1 rounded border">Ctrl</kbd> + <kbd className="bg-gray-100 px-1 rounded border">/</kbd> o escribe <kbd className="bg-gray-100 px-1 rounded border">/</kbd> en el chat para usarlas.
                        </p>
                    </div>
                </div>

                {/* Lista */}
                <div className="md:col-span-2 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Tus Plantillas Guardadas</h2>
                    {templates.length === 0 ? (
                        <div className="text-center bg-gray-50 p-8 rounded-lg border border-dashed border-gray-300">
                            <MessageSquareQuote className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 font-medium">No tienes plantillas creadas.</p>
                            <p className="text-sm text-gray-400 mt-1">Crea una plantilla a la izquierda para usar respuestas rápidas en el chat.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {templates.map(tmpl => (
                                <div key={tmpl.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-colors flex flex-col h-full">
                                    <h3 className="font-semibold text-gray-900 text-base mb-1 truncate" title={tmpl.name}>/{tmpl.name}</h3>
                                    <p className="text-sm text-gray-600 flex-1 line-clamp-3 mb-4" title={tmpl.content}>
                                        {tmpl.content}
                                    </p>
                                    <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => handleEdit(tmpl)}
                                            className="text-blue-500 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                                        >
                                            <Edit2 className="h-4 w-4" /> Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tmpl.id)}
                                            className="text-gray-400 hover:text-red-500 p-1"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
