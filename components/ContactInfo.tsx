'use client';

import { useEffect, useState } from 'react';
import { X, Clock, Phone, Tag as TagIcon, Plus } from 'lucide-react';
import FunnelSelector from './FunnelSelector';

interface Contact {
    id: number;
    name: string | null;
    phone: string;
    stageId: number | null;
    tags?: { id: number; name: string; color: string }[];
}

interface ContactInfoProps {
    contact: Contact;
    onClose: () => void;
    lastMessageTime: string | null;
}

export default function ContactInfo({ contact, onClose, lastMessageTime }: ContactInfoProps) {
    const [availableTags, setAvailableTags] = useState<{ id: number, name: string, color: string }[]>([]);
    const [contactTags, setContactTags] = useState<{ id: number, name: string, color: string }[]>(contact.tags || []);
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [newTagName, setNewTagName] = useState('');

    useEffect(() => {
        setContactTags(contact.tags || []);
    }, [contact]);

    useEffect(() => {
        fetch('/api/tags')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setAvailableTags(data);
            })
            .catch(console.error);
    }, []);

    const handleAddTag = async (tagId: number) => {
        if (contactTags.find(t => t.id === tagId)) return;
        try {
            const res = await fetch(`/api/contacts/${contact.id}/tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tagId })
            });
            if (res.ok) {
                const updatedTags = await res.json();
                setContactTags(updatedTags);
            }
        } catch (error) {
            console.error(error);
        }
        setShowTagDropdown(false);
        setNewTagName('');
    };

    const handleCreateTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTagName.trim()) return;
        try {
            // First create the tag
            const createRes = await fetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTagName.trim(), color: '#8b5cf6' }) // Default purple
            });
            if (createRes.ok) {
                const newTag = await createRes.json();
                setAvailableTags([...availableTags, newTag]);
                // Then assign it
                handleAddTag(newTag.id);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleRemoveTag = async (tagId: number) => {
        try {
            const res = await fetch(`/api/contacts/${contact.id}/tags?tagId=${tagId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const updatedTags = await res.json();
                setContactTags(updatedTags);
            }
        } catch (error) {
            console.error(error);
        }
    };

    // 24h Window Logic
    const calculateTimeLeft = () => {
        if (!lastMessageTime) return 0;
        const lastMsg = new Date(lastMessageTime).getTime();
        const now = new Date().getTime();
        const diff = now - lastMsg;
        const twentyFourHours = 24 * 60 * 60 * 1000;

        return twentyFourHours - diff;
    };

    const timeLeft = calculateTimeLeft();
    const isWindowOpen = timeLeft > 0;

    const formatTimeLeft = (ms: number) => {
        if (ms <= 0) return "00:00:00";
        const h = Math.floor(ms / (1000 * 60 * 60));
        const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((ms % (1000 * 60)) / 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-80 h-full border-l border-gray-200 bg-white flex flex-col shadow-xl z-50 absolute right-0 top-0 md:static md:z-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[#f0f2f5] border-b border-gray-200">
                <h3 className="font-semibold text-gray-700">Info. del contacto</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Profile Pic & Name */}
            <div className="flex flex-col items-center p-6 border-b border-gray-100">
                <div className="h-24 w-24 rounded-full bg-gray-200 mb-4 flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center text-4xl text-white font-bold">
                        {contact.name ? contact.name.substring(0, 1).toUpperCase() : '#'}
                    </div>
                </div>
                <h2 className="text-xl font-medium text-gray-800">{contact.name || "Sin Nombre"}</h2>
                <p className="text-gray-500">{contact.phone}</p>
            </div>

            {/* 24h Window Timer */}
            <div className="p-4 border-b border-gray-100">
                <div className={`p-3 rounded-lg flex items-center gap-3 ${isWindowOpen ? 'bg-green-50' : 'bg-red-50'}`}>
                    <Clock className={`h-5 w-5 ${isWindowOpen ? 'text-green-600' : 'text-red-500'}`} />
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Ventana 24h</p>
                        <p className={`font-bold ${isWindowOpen ? 'text-green-700' : 'text-red-700'}`}>
                            {isWindowOpen ? formatTimeLeft(timeLeft) : "Cerrada"}
                        </p>
                    </div>
                </div>
                {!isWindowOpen && (
                    <p className="text-xs text-red-500 mt-2">
                        No puedes enviar mensajes libres. Solo Plantillas (Templates).
                    </p>
                )}
            </div>

            {/* Details & Actions */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Etapa del Embudo</label>
                    <div className="w-full">
                        <FunnelSelector contactId={contact.id} currentStageId={contact.stageId} />
                    </div>
                </div>

                {/* Tags Section */}
                <div className="mt-6 border-t border-gray-100 pt-6">
                    <label className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                        <TagIcon className="h-3.5 w-3.5" />
                        Etiquetas
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {contactTags.map(tag => (
                            <span key={tag.id} style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }} className="px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1.5">
                                {tag.name}
                                <button onClick={() => handleRemoveTag(tag.id)} className="hover:opacity-60 transition-opacity">
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>

                    <div className="relative">
                        {showTagDropdown ? (
                            <div className="absolute top-0 left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2">
                                <form onSubmit={handleCreateTag} className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={newTagName}
                                        onChange={e => setNewTagName(e.target.value)}
                                        placeholder="Nueva etiqueta..."
                                        className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-whatsapp-green"
                                    />
                                    <button type="submit" className="bg-whatsapp-green text-white px-2 py-1 rounded text-xs font-bold">Crear</button>
                                </form>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                    {availableTags.filter(t => t.name.toLowerCase().includes(newTagName.toLowerCase())).map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => handleAddTag(tag.id)}
                                            className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2"
                                        >
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }}></div>
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setShowTagDropdown(false)} className="w-full mt-2 text-center text-xs text-gray-400 py-1 hover:text-gray-600">Cancelar</button>
                            </div>
                        ) : (
                            <button onClick={() => setShowTagDropdown(true)} className="flex items-center gap-1 text-xs font-bold text-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors px-3 py-1.5 rounded-md">
                                <Plus className="h-3.5 w-3.5" /> Agregar Etiqueta
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-6 border-t border-gray-100 pt-6">
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Teléfono</label>
                    <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="h-4 w-4" />
                        <span>{contact.phone}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
