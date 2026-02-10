'use client';

import { X, Clock, Phone, User } from 'lucide-react';
import FunnelSelector from './FunnelSelector';

interface Contact {
    id: number;
    name: string | null;
    phone: string;
    stageId: number | null;
}

interface ContactInfoProps {
    contact: Contact;
    onClose: () => void;
    lastMessageTime: string | null;
}

export default function ContactInfo({ contact, onClose, lastMessageTime }: ContactInfoProps) {
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

                <div>
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
