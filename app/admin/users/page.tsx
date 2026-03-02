'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit2, Save, X, Plus, Key, Mail, Lock, ArrowLeft, Search, Trash } from 'lucide-react';

interface User {
    id: number;
    email: string | null;
    username: string | null;
    role: string;
    apiKey: string;
    isActive: boolean;
    metricsEnabled: boolean;
    canManageUsers: boolean;
    canEditTemplates: boolean;
    canExportData: boolean;
    parentId: number | null;
    disabledMessage: string | null;
    n8nWebhookUrl: string | null;
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
    const [editForm, setEditForm] = useState({
        email: '', username: '', password: '', apiKey: '', metricsEnabled: false, isActive: true,
        disabledMessage: '', n8nWebhookUrl: '', canManageUsers: false, canEditTemplates: false, canExportData: false
    });

    // New User Form
    const [showNewUserModal, setShowNewUserModal] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        username: '', password: '', role: 'USER', isActive: true, metricsEnabled: false,
        canManageUsers: false, canEditTemplates: false, canExportData: false, parentId: ''
    });
    const [creatingUser, setCreatingUser] = useState(false);

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
        setEditForm({
            email: user.email || '', username: user.username || '', password: '', apiKey: user.apiKey,
            metricsEnabled: user.metricsEnabled, isActive: user.isActive,
            disabledMessage: user.disabledMessage || '', n8nWebhookUrl: user.n8nWebhookUrl || '',
            canManageUsers: user.canManageUsers, canEditTemplates: user.canEditTemplates, canExportData: user.canExportData
        });
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setEditForm({
            email: '', username: '', password: '', apiKey: '', metricsEnabled: false, isActive: true,
            disabledMessage: '', n8nWebhookUrl: '', canManageUsers: false, canEditTemplates: false, canExportData: false
        });
        setError('');
    };

    const handleSave = async () => {
        if (!editingUser) return;
        try {
            const updateData: any = {
                email: editForm.email || undefined,
                username: editForm.username || undefined,
                apiKey: editForm.apiKey,
                metricsEnabled: editForm.metricsEnabled,
                canManageUsers: editForm.canManageUsers,
                canEditTemplates: editForm.canEditTemplates,
                canExportData: editForm.canExportData,
                isActive: editForm.isActive,
                disabledMessage: editForm.disabledMessage,
                n8nWebhookUrl: editForm.n8nWebhookUrl
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

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingUser(true);
        setError('');

        try {
            const payload = {
                ...newUserForm,
                parentId: newUserForm.parentId ? parseInt(newUserForm.parentId) : null
            };

            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowNewUserModal(false);
                setNewUserForm({
                    username: '', password: '', role: 'USER', isActive: true, metricsEnabled: false,
                    canManageUsers: false, canEditTemplates: false, canExportData: false, parentId: ''
                });
                fetchUsers();
            } else {
                const data = await res.json();
                setError(data.error || 'Error al crear usuario');
            }
        } catch (err) {
            setError('Error de conexión.');
        } finally {
            setCreatingUser(false);
        }
    };

    const filteredUsers = users.filter(user =>
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowNewUserModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition shadow-sm text-sm flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" /> Nuevo Agente
                    </button>
                    <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition border border-gray-300 shadow-sm text-sm"
                    >
                        {showTemplates ? 'Ocultar Plantillas' : 'Plantillas de Bloqueo'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* New User Modal */}
            {showNewUserModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">Crear Nuevo Agente</h2>
                            <button onClick={() => setShowNewUserModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="new-user-form" onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Usuario (Para logueo)</label>
                                    <input type="text" required value={newUserForm.username} onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value })} className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 outline-none focus:border-purple-500" placeholder="ej. analista01" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Padre (Empresa Asociada)</label>
                                    <select
                                        value={newUserForm.parentId}
                                        onChange={e => setNewUserForm({ ...newUserForm, parentId: e.target.value })}
                                        className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 outline-none focus:border-purple-500"
                                    >
                                        <option value="">Cuenta Propia (Ninguna)</option>
                                        {users.filter(u => u.email).map(u => (
                                            <option key={u.id} value={u.id}>{u.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de Acceso</label>
                                    <input type="password" required minLength={6} value={newUserForm.password} onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })} className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 outline-none focus:border-purple-500" placeholder="Mínimo 6 caracteres" />
                                </div>
                                <div className="pt-4 border-t border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-800 mb-3">Permisos de la Sub-Cuenta</h3>

                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className="relative">
                                                <input type="checkbox" className="sr-only" checked={newUserForm.metricsEnabled} onChange={e => setNewUserForm({ ...newUserForm, metricsEnabled: e.target.checked })} />
                                                <div className={`block w-10 h-6 rounded-full transition-colors ${newUserForm.metricsEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${newUserForm.metricsEnabled ? 'transform translate-x-4' : ''}`}></div>
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">Visualizar Métricas de Rendimiento</span>
                                        </label>

                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className="relative">
                                                <input type="checkbox" className="sr-only" checked={newUserForm.canEditTemplates} onChange={e => setNewUserForm({ ...newUserForm, canEditTemplates: e.target.checked })} />
                                                <div className={`block w-10 h-6 rounded-full transition-colors ${newUserForm.canEditTemplates ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${newUserForm.canEditTemplates ? 'transform translate-x-4' : ''}`}></div>
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">Gestionar Plantillas de Mensajes</span>
                                        </label>

                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className="relative">
                                                <input type="checkbox" className="sr-only" checked={newUserForm.canExportData} onChange={e => setNewUserForm({ ...newUserForm, canExportData: e.target.checked })} />
                                                <div className={`block w-10 h-6 rounded-full transition-colors ${newUserForm.canExportData ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${newUserForm.canExportData ? 'transform translate-x-4' : ''}`}></div>
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">Exportar Reportes (Excel/PDF)</span>
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 mb-0 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowNewUserModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition">Cancelar</button>
                            <button type="submit" form="new-user-form" disabled={creatingUser} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2">
                                {creatingUser ? 'Procesando...' : <><Save className="h-4 w-4" /> Guardar Agente</>}
                            </button>
                        </div>
                    </div>
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
                                                        type={user.role === 'ADMIN' ? 'email' : 'text'}
                                                        value={user.role === 'ADMIN' ? editForm.email : editForm.username}
                                                        onChange={(e) => user.role === 'ADMIN' ? setEditForm({ ...editForm, email: e.target.value }) : setEditForm({ ...editForm, username: e.target.value })}
                                                        className="w-full text-sm outline-none text-gray-900"
                                                        placeholder={user.role === 'ADMIN' ? "Email de Admin" : "Nombre de Usuario"}
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
                                                <div className="text-sm font-medium text-gray-900">{user.email || user.username}</div>
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
                                                        placeholder="Token de Conexión"
                                                    />
                                                </div>
                                                <div className="flex items-center border rounded p-1">
                                                    <div className="mx-2 text-gray-400 font-bold text-xs">🔗</div>
                                                    <input
                                                        type="text"
                                                        value={editForm.n8nWebhookUrl}
                                                        onChange={(e) => setEditForm({ ...editForm, n8nWebhookUrl: e.target.value })}
                                                        className="w-full text-sm outline-none text-gray-900 bg-transparent"
                                                        placeholder="URL del Receptor Integrado"
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
                                                <label className="flex items-center gap-2 cursor-pointer mt-1 text-sm text-gray-700">
                                                    <div className="relative">
                                                        <input type="checkbox" className="sr-only" checked={editForm.canEditTemplates} onChange={(e) => setEditForm({ ...editForm, canEditTemplates: e.target.checked })} />
                                                        <div className={`block w-10 h-6 rounded-full transition-colors ${editForm.canEditTemplates ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                                                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${editForm.canEditTemplates ? 'transform translate-x-4' : ''}`}></div>
                                                    </div>
                                                    Gestión de Plantillas
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer mt-1 text-sm text-gray-700">
                                                    <div className="relative">
                                                        <input type="checkbox" className="sr-only" checked={editForm.canExportData} onChange={(e) => setEditForm({ ...editForm, canExportData: e.target.checked })} />
                                                        <div className={`block w-10 h-6 rounded-full transition-colors ${editForm.canExportData ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                                                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${editForm.canExportData ? 'transform translate-x-4' : ''}`}></div>
                                                    </div>
                                                    Permisos de Exportación
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500">
                                                <div className="flex items-center gap-1 mb-1" title="Token API">
                                                    <Key className="h-3 w-3" />
                                                    <span className="truncate w-32">{user.apiKey || 'No configurada'}</span>
                                                </div>
                                                <div className="flex items-center gap-1 mb-1" title="URL del Receptor">
                                                    <div className="text-[10px] font-bold">🔗</div>
                                                    <span className="truncate w-32">{user.n8nWebhookUrl || 'No configurado'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className={`h-2 w-2 rounded-full ${user.metricsEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                                                    <span>Métricas {user.metricsEnabled ? 'Activadas' : 'Desactivadas'}</span>
                                                </div>
                                                <div className="flex gap-2 mt-2">
                                                    {user.canEditTemplates && <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">Plantillas</span>}
                                                    {user.canExportData && <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-semibold">Exportador</span>}
                                                    {/* We skip canManageUsers as long as role === ADMIN handles it broadly */}
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
