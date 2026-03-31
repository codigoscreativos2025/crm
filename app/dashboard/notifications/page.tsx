'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Loader2, ArrowLeft, Trash2 } from 'lucide-react';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    read: boolean;
    data?: string;
    createdAt: string;
}

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/auth/session');
            const session = await res.json();
            
            if (!session?.user?.id) {
                router.push('/login');
                return;
            }
            fetchNotifications();
        } catch (error) {
            router.push('/login');
        } finally {
            setChecking(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications?limit=50');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId: number) => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId })
            });
            
            setNotifications(prev => 
                prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        setLoading(true);
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllRead: true })
            });
            
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'NEW_USER': return 'bg-blue-500';
            case 'PAYMENT': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'NEW_USER': return 'Nuevo Usuario';
            case 'PAYMENT': return 'Pago';
            default: return 'Sistema';
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Notificaciones</h1>
                                <p className="text-sm text-gray-500">{unreadCount} sin leer</p>
                            </div>
                        </div>
                        
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                Marcar todo leído
                            </button>
                        )}
                    </div>
                </div>

                {/* Notifications List */}
                <div className="p-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12">
                            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No hay notificaciones</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`bg-white rounded-lg border p-4 transition ${
                                    !notification.read 
                                        ? 'border-blue-300 shadow-sm' 
                                        : 'border-gray-200'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${getTypeColor(notification.type)} ${notification.read ? 'opacity-50' : ''}`} />
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium text-gray-500 uppercase">
                                                {getTypeLabel(notification.type)}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {formatDate(notification.createdAt)}
                                            </span>
                                        </div>
                                        
                                        <h3 className={`font-semibold ${
                                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                                        }`}>
                                            {notification.title}
                                        </h3>
                                        
                                        <p className="text-sm text-gray-600 mt-1">
                                            {notification.message}
                                        </p>
                                        
                                        {!notification.read && (
                                            <button
                                                onClick={() => markAsRead(notification.id)}
                                                className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Marcar como leído
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}