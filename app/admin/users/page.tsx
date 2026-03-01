'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit2, Save, X, Plus, Key, Mail, Lock, ArrowLeft, Search, Trash } from 'lucide-react';

interface User {
    id: number;
    email: string;
    role: string;
    apiKey: string;
    metricsEnabled: boolean;
    isActive: boolean;
    disabledMessage: string | null;
    createdAt: string;
}

interface AdminTemplate {
    id: number;
    name: string;
    content: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ email: '', password: '', apiKey: '', metricsEnabled: false, isActive: true, disabledMessage: '' });

    // Search
    const [searchTerm, setSearchTerm] = useState('');

    // Templates
    const [templates, setTemplates] = useState<AdminTemplate[]>([]);
    const [showTemplates, setShowTemplates] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<AdminTemplate | null>(null);
    const [newTemplateForm, setNewTemplateForm] = useState({ name: '', content: '' });

    const router = useRouter();

    useEffect(() => {
        fetchUsers();
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/admin/templates');
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (err) {
            console.error('Error fetching templates', err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                setError('Error al cargar usuarios. Asegúrate de ser Super Admin.');
            }
        } catch (err) {
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setEditForm({ email: user.email, password: '', apiKey: user.apiKey, metricsEnabled: user.metricsEnabled, isActive: user.isActive, disabledMessage: user.disabledMessage || '' });
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setEditForm({ email: '', password: '', apiKey: '', metricsEnabled: false, isActive: true, disabledMessage: '' });
        setError('');
    };

    const handleSave = async () => {
        if (!editingUser) return;
        try {
            const updateData: any = {
                email: editForm.email,
                apiKey: editForm.apiKey,
                metricsEnabled: editForm.metricsEnabled,
                isActive: editForm.isActive,
                disabledMessage: editForm.disabledMessage
            };

            // Only send password if it was changed
            if (editForm.password) {
                updateData.password = editForm.password;
            }

            const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (res.ok) {
                // Refresh list
                await fetchUsers();
                handleCancelEdit();
            } else {
                const data = await res.json();
                setError(data.error || 'Error al actualizar usuario');
            }
        } catch (err) {
            setError('Error de conexión.');
        }
    };

    const handleSaveTemplate = async () => {
        if (!newTemplateForm.name || !newTemplateForm.content) return;
        try {
            const method = editingTemplate ? 'PUT' : 'POST';
            const url = editingTemplate ? `/api/admin/templates/${editingTemplate.id}` : '/api/admin/templates';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTemplateForm)
            });
            if (res.ok) {
                setEditingTemplate(null);
                setNewTemplateForm({ name: '', content: '' });
                fetchTemplates();
            }
        } catch (err) {
            console.error('Error saving template', err);
        }
    };

    const handleDeleteTemplate = async (id: number) => {
        if (!confirm('¿Eliminar plantilla?')) return;
        try {
            const res = await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchTemplates();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toString().includes(searchTerm)
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando usuarios...</div>;

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition-colors flex items-center justify-center h-10 w-10">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
                </div>
                <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition border border-gray-300 shadow-sm text-sm"
                >
                    {showTemplates ? 'Ocultar Plantillas' : 'Plantillas de Bloqueo'}
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Template Manager Overlay */}
            {showTemplates && (
                <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 mb-8 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Plantillas de Mensajes de Bloqueo</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* List */}
                        <div className="space-y-3">
                            {templates.map(t => (
                                <div key={t.id} className="border border-gray-200 rounded-md p-3 flex justify-between items-start bg-gray-50">
                                    <div>
                                        <h3 className="font-medium text-gray-900 text-sm">{t.name}</h3>
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.content}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingTemplate(t); setNewTemplateForm({ name: t.name, content: t.content }); }} className="text-blue-500 hover:text-blue-700"><Edit2 className="h-4 w-4" /></button>
                                        <button onClick={() => handleDeleteTemplate(t.id)} className="text-red-500 hover:text-red-700"><Trash className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))}
                            {templates.length === 0 && <p className="text-sm text-gray-500 italic">No hay plantillas creadas.</p>}
                        </div>
                        {/* Form */}
                        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                            <h3 className="font-medium text-gray-800 text-sm mb-3">
                                {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                            </h3>
                            <div className="space-y-3">
                                <input type="text" placeholder="Nombre (ej. Falta de pago)" className="w-full border p-2 rounded text-sm outline-none focus:border-blue-500 text-gray-900" value={newTemplateForm.name} onChange={e => setNewTemplateForm({ ...newTemplateForm, name: e.target.value })} />
                                <textarea placeholder="Mensaje para el usuario..." className="w-full border p-2 rounded text-sm outline-none focus:border-blue-500 min-h-[80px] text-gray-900" value={newTemplateForm.content} onChange={e => setNewTemplateForm({ ...newTemplateForm, content: e.target.value })} />
                                <div className="flex gap-2">
                                    <button onClick={handleSaveTemplate} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1">
                                        <Save className="h-4 w-4" /> Guardar
                                    </button>
                                    {editingTemplate && <button onClick={() => { setEditingTemplate(null); setNewTemplateForm({ name: '', content: '' }); }} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded text-sm font-medium transition">Cancelar</button>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por email o ID..."
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <div className="text-sm text-gray-500">
                        {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalles Config</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        #{user.id}
                                    </td>

                                    {/* USER INFO COLUMN */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {editingUser?.id === user.id ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center border rounded p-1">
                                                    <Mail className="h-4 w-4 text-gray-400 mx-2" />
                                                    <input
                                                        type="email"
                                                        value={editForm.email}
                                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                        className="w-full text-sm outline-none text-gray-900"
                                                        placeholder="Email"
                                                    />
                                                </div>
                                                <div className="flex items-center border rounded p-1">
                                                    <Lock className="h-4 w-4 text-gray-400 mx-2" />
                                                    <input
                                                        type="text"
                                                        value={editForm.password}
                                                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                                        className="w-full text-sm outline-none text-gray-900"
                                                        placeholder="Nueva Contraseña (Opcional)"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{user.email}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                                        {user.role}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    {/* CONFIG COLUMN */}
                                    <td className="px-6 py-4">
                                        {editingUser?.id === user.id ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center border rounded p-1">
                                                    <Key className="h-4 w-4 text-gray-400 mx-2" />
                                                    <input
                                                        type="text"
                                                        value={editForm.apiKey}
                                                        onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })}
                                                        className="w-full text-sm outline-none text-gray-900"
                                                        placeholder="Evolution API Key"
                                                    />
                                                </div>
                                                <label className="flex items-center gap-2 cursor-pointer mt-2 text-sm text-gray-700">
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={editForm.metricsEnabled}
                                                            onChange={(e) => setEditForm({ ...editForm, metricsEnabled: e.target.checked })}
                                                        />
                                                        <div className={`block w-10 h-6 rounded-full transition-colors ${editForm.metricsEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${editForm.metricsEnabled ? 'transform translate-x-4' : ''}`}></div>
                                                    </div>
                                                    Acceso a Dashboard de Métricas
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500">
                                                <div className="flex items-center gap-1 mb-1" title="API Key">
                                                    <Key className="h-3 w-3" />
                                                    <span className="truncate w-32">{user.apiKey || 'No configurada'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className={`h-2 w-2 rounded-full ${user.metricsEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                                                    <span>Métricas {user.metricsEnabled ? 'Activadas' : 'Desactivadas'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    {/* STATUS COLUMN */}
                                    <td className="px-6 py-4">
                                        {editingUser?.id === user.id ? (
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={editForm.isActive}
                                                            onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                                                        />
                                                        <div className={`block w-10 h-6 rounded-full transition-colors ${editForm.isActive ? 'bg-green-500' : 'bg-red-400'}`}></div>
                                                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${editForm.isActive ? 'transform translate-x-4' : ''}`}></div>
                                                    </div>
                                                    <span className="font-medium">{editForm.isActive ? 'Activo' : 'Bloqueado'}</span>
                                                </label>

                                                {!editForm.isActive && (
                                                    <div className="mt-2 pl-2 border-l-2 border-red-200">
                                                        <select
                                                            className="w-full text-xs p-1.5 border border-gray-300 rounded mb-1 outline-none text-gray-800"
                                                            onChange={(e) => setEditForm({ ...editForm, disabledMessage: e.target.value })}
                                                            value={templates.find(t => t.content === editForm.disabledMessage)?.content || ''}
                                                        >
                                                            <option value="">Seleccionar plantilla...</option>
                                                            {templates.map(t => (
                                                                <option key={t.id} value={t.content}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                        <textarea
                                                            className="w-full text-xs p-2 border border-gray-300 rounded outline-none text-gray-900"
                                                            placeholder="Mensaje personalizado visible para el usuario..."
                                                            rows={2}
                                                            value={editForm.disabledMessage}
                                                            onChange={(e) => setEditForm({ ...editForm, disabledMessage: e.target.value })}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {user.isActive ? 'Activo' : 'Bloqueado'}
                                                </span>
                                                {!user.isActive && user.disabledMessage && (
                                                    <p className="text-xs text-red-600 mt-1 max-w-[200px] truncate" title={user.disabledMessage}>
                                                        "{user.disabledMessage}"
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    {/* ACTIONS COLUMN */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {editingUser?.id === user.id ? (
                                            <div className="flex items-center gap-3">
                                                <button onClick={handleSave} className="text-blue-600 hover:text-blue-900 flex items-center gap-1 font-semibold">
                                                    <Save className="h-4 w-4" /> Guardar
                                                </button>
                                                <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 font-semibold">
                                                    <X className="h-4 w-4" /> Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleEdit(user)} className="text-[#00A884] hover:text-[#008f6f] flex items-center gap-1 font-semibold transition-colors">
                                                <Edit2 className="h-4 w-4" /> Editar Config
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <Search className="h-8 w-8 text-gray-300 mb-2" />
                                            <p>No se encontraron usuarios que coincidan con la búsqueda.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
