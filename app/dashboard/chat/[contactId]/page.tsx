'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Send, MoreVertical, Search, Paperclip, Smile, ArrowLeft, X } from 'lucide-react';
import FunnelSelector from '@/components/FunnelSelector';
import ContactInfo from '@/components/ContactInfo';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface Message {
    id: number;
    body: string;
    direction: 'inbound' | 'outbound';
    status: string;
    timestamp: string;
    fileUrl?: string | null;
    fileType?: string | null;
    fileName?: string | null;
}

interface Contact {
    id: number;
    name: string | null;
    phone: string;
    stageId: number | null;
}

export default function ChatPage() {
    const params = useParams();
    const contactId = params.contactId as string;
    const [messages, setMessages] = useState<Message[]>([]);
    const [contact, setContact] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(true);
    const [showContactInfo, setShowContactInfo] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Calculate last inbound message for 24h window
    const lastInboundMessage = Array.isArray(messages) ? messages
        .filter(m => m.direction === 'inbound')
        .sort((a, b) => {
            const tA = new Date(a.timestamp).getTime();
            const tB = new Date(b.timestamp).getTime();
            return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
        })[0] : undefined;

    const safelyFormatTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !contactId) return;
        setSending(true);

        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contactId: Number(contactId),
                    body: newMessage,
                    direction: 'outbound',
                    status: 'sent'
                })
            });

            if (res.ok) {
                setNewMessage('');
                // Refresh messages immediately
                const savedMsg = await res.json();
                setMessages(prev => [...prev, savedMsg]);
            }
        } catch (error) {
            console.error('Error enviando mensaje', error);
        } finally {
            setSending(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !contactId) return;

        setSending(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // 1. Upload File
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Upload failed");
            const { url, name, type } = await uploadRes.json();

            // 2. Send Message with Attachment URL
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contactId: Number(contactId),
                    body: `📎 Archivo adjunto: ${name}`, // Fallback text
                    direction: 'outbound',
                    status: 'sent',
                    fileUrl: url,
                    fileType: type,
                    fileName: name
                })
            });

            if (res.ok) {
                const savedMsg = await res.json();
                setMessages(prev => [...prev, savedMsg]);
            }

        } catch (error) {
            console.error("Error uploading/sending file:", error);
        } finally {
            setSending(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!contactId) return;
            try {
                // Fetch Messages
                const resMsgs = await fetch(`/api/messages?contactId=${contactId}`);
                if (resMsgs.ok) {
                    const data = await resMsgs.json();
                    if (Array.isArray(data)) {
                        setMessages(data);
                    } else {
                        console.error("API did not return an array", data);
                        setMessages([]);
                    }
                }

                // Fetch Contact Details (for name and stage)
                const resContact = await fetch(`/api/contacts/${contactId}`);
                if (resContact.ok) {
                    const data = await resContact.json();
                    setContact(data);
                }

            } catch (error) {
                console.error('Error obteniendo datos', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000); // Sondeo cada 3s
        return () => clearInterval(interval);
    }, [contactId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (loading && !contact) {
        return (
            <div className="flex h-full items-center justify-center bg-[#efeae2]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-whatsapp-green border-t-transparent"></div>
            </div>
        );
    }

    const handleClearChat = async () => {
        if (!confirm('¿Estás seguro de vaciar este chat? Esta acción no se puede deshacer.')) return;
        try {
            const res = await fetch(`/api/messages?contactId=${contactId}`, { method: 'DELETE' });
            if (res.ok) {
                setMessages([]);
                setShowMenu(false);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteContact = async () => {
        if (!confirm('¿Estás seguro de eliminar este chat y el contacto?')) return;
        try {
            const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
            if (res.ok) {
                window.location.href = '/dashboard';
            }
        } catch (error) {
            console.error(error);
        }
    };

    const onEmojiClick = (emojiData: any) => {
        setNewMessage(prev => prev + emojiData.emoji);
        setShowEmoji(false);
    };

    const [showEmoji, setShowEmoji] = useState(false);

    const filteredMessages = messages.filter(m =>
        m.body.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-full flex-col bg-[#efeae2] bg-opacity-90" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>

            {/* Encabezado del Chat */}
            <div className="flex items-center justify-between bg-[#f0f2f5] px-4 py-3 border-b border-gray-200 cursor-pointer" onClick={() => setShowContactInfo(!showContactInfo)}>
                <div className="flex items-center">
                    <Link href="/dashboard" className="mr-2 md:hidden text-gray-500" onClick={(e) => e.stopPropagation()}>
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div className="h-10 w-10 rounded-full bg-gray-300">
                        <div className="flex h-full w-full items-center justify-center text-white font-bold bg-whatsapp-teal rounded-full">
                            {contact?.name ? contact.name.substring(0, 1).toUpperCase() : '#'}
                        </div>
                    </div>
                    <div className="ml-4">
                        <h2 className="text-gray-900 font-medium">{contact?.name || `Contacto ${contactId}`}</h2>
                        <p className="text-xs text-gray-500">{contact?.phone} • Click para info</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-gray-500" onClick={(e) => e.stopPropagation()}>
                    {/* Selector de Embudo */}
                    {contact && <FunnelSelector contactId={contact.id} currentStageId={contact.stageId} />}

                    {showSearch ? (
                        <div className="flex items-center bg-white rounded-full px-3 py-1 animate-in fade-in slide-in-from-right-5">
                            <input
                                autoFocus
                                type="text"
                                className="w-32 md:w-48 outline-none text-sm text-gray-700"
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onBlur={() => !searchQuery && setShowSearch(false)}
                            />
                            <X className="h-4 w-4 text-gray-400 cursor-pointer" onClick={() => { setSearchQuery(''); setShowSearch(false); }} />
                        </div>
                    ) : (
                        <Search className="h-5 w-5 cursor-pointer hover:text-gray-700" onClick={() => setShowSearch(true)} />
                    )}

                    <div className="relative">
                        <MoreVertical className="h-5 w-5 cursor-pointer hover:text-gray-700" onClick={() => setShowMenu(!showMenu)} />
                        {showMenu && (
                            <div className="absolute right-0 top-8 bg-white shadow-lg rounded-md py-2 w-48 z-10 border border-gray-100">
                                <button
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 text-sm"
                                    onClick={handleClearChat}
                                >
                                    Vaciar Chat
                                </button>
                                <button
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 text-sm"
                                    onClick={handleDeleteContact}
                                >
                                    Eliminar Chat
                                </button>
                                <button
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-400 text-sm"
                                    onClick={() => setShowMenu(false)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Área de Mensajes */}
                <div className="flex-1 flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                        {filteredMessages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex mb-2 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                                    }`}
                            >
                                <div
                                    className={`relative max-w-[70%] rounded-lg px-2 py-1 shadow-sm text-sm ${msg.direction === 'outbound'
                                        ? 'bg-whatsapp-sent rounded-tr-none'
                                        : 'bg-white rounded-tl-none'
                                        } pb-4`}
                                >
                                    {/* Display File/Image if present */}
                                    {msg.fileUrl && (
                                        <div className="mb-1">
                                            {msg.fileType?.startsWith('image/') ? (
                                                <img src={msg.fileUrl} alt={msg.fileName || 'Imagen'} className="max-w-full h-auto rounded-md cursor-pointer hover:opacity-90 transition" onClick={() => window.open(msg.fileUrl!, '_blank')} />
                                            ) : (
                                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-gray-100 p-2 rounded hover:bg-gray-200 transition text-blue-600">
                                                    <Paperclip className="h-4 w-4" />
                                                    <span className="truncate max-w-[150px]">{msg.fileName || 'Archivo adjunto'}</span>
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    <p className="text-gray-900 px-1">{msg.body}</p>
                                    <div className="flex justify-end items-center gap-1 absolute bottom-0.5 right-2">
                                        <span className="text-[10px] text-gray-500" suppressHydrationWarning>
                                            {safelyFormatTime(msg.timestamp)}
                                        </span>
                                        {msg.direction === 'outbound' && (
                                            <span className="text-blue-500 text-[10px]">✓✓</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Área de Entrada */}
                    <div className="flex items-center gap-2 bg-[#f0f2f5] px-4 py-2 relative">
                        {showEmoji && (
                            <div className="absolute bottom-16 left-4 z-50">
                                <EmojiPicker onEmojiClick={onEmojiClick} />
                            </div>
                        )}
                        <Smile className="h-6 w-6 text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => setShowEmoji(!showEmoji)} />

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <button onClick={() => fileInputRef.current?.click()} disabled={sending}>
                            <Paperclip className="h-6 w-6 text-gray-500 cursor-pointer" />
                        </button>

                        <div className="flex-1 rounded-lg bg-white px-4 py-2">
                            <input
                                type="text"
                                placeholder="Escribe un mensaje"
                                className="w-full bg-transparent outline-none text-gray-800 placeholder-gray-500"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={sending}
                            />
                        </div>
                        <button onClick={handleSendMessage} disabled={sending}>
                            <Send className={`h-6 w-6 cursor-pointer ${sending ? 'text-gray-400' : 'text-gray-500 hover:text-whatsapp-teal'}`} />
                        </button>
                    </div>
                </div>

                {/* Right Sidebar: Contact Info */}
                {showContactInfo && contact && (
                    <ContactInfo
                        contact={contact}
                        onClose={() => setShowContactInfo(false)}
                        lastMessageTime={lastInboundMessage?.timestamp || null}
                    />
                )}
            </div>
        </div>
    );
}
