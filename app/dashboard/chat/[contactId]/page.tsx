'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, MoreVertical, Search, Paperclip, Smile, ArrowLeft, X, Trash2, Copy, Forward } from 'lucide-react';
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
    isReadByAgent?: boolean;
}

interface Contact {
    id: number;
    name: string | null;
    phone: string;
    stageId: number | null;
    nameConfirmed?: boolean;
}

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
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
    const [showEmoji, setShowEmoji] = useState(false);

    // Quick Replies Templates
    const [templates, setTemplates] = useState<{ id: number, name: string, content: string }[]>([]);
    const [showTemplatePopover, setShowTemplatePopover] = useState(false);
    const [templateFilter, setTemplateFilter] = useState('');

    // New State for Preview and Hover
    const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null);
    const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);

    // Message Selection Mode
    const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [allContacts, setAllContacts] = useState<any[]>([]);
    const [forwardSearch, setForwardSearch] = useState('');
    const isSelectionMode = selectedMessages.length > 0;

    // UI Enhancements
    const [floatingDate, setFloatingDate] = useState<string | null>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const unreadSeparatorRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

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

    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Hoy';
        if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
        return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const parseMessageBody = (text: string) => {
        // Convert \n to <br/> and **text** to <strong>text</strong>
        let parsed = text.replace(/\n/g, '<br/>');
        parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        parsed = parsed.replace(/\*(.*?)\*/g, '<strong>$1</strong>'); // Handle single asterisks too
        return { __html: parsed };
    };

    const markChatAsRead = async () => {
        try {
            await fetch(`/api/contacts/${contactId}/read`, { method: 'PUT' });
        } catch (e) {
            console.error(e);
        }
    };

    // Scroll Logic
    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
    };

    const handleScroll = () => {
        if (!chatContainerRef.current) return;

        // Find the visible date header
        const messageElements = chatContainerRef.current.querySelectorAll('[data-date]');
        for (const el of Array.from(messageElements).reverse()) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 150) {
                const dateHeader = el.getAttribute('data-date');
                if (dateHeader && dateHeader !== floatingDate) {
                    setFloatingDate(dateHeader);
                }
                break;
            }
        }

        // Handle fade out
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            setFloatingDate(null);
        }, 1500);
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

    const onEmojiClick = (emojiData: any) => {
        setNewMessage(prev => prev + emojiData.emoji);
        setShowEmoji(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create local preview URL
        const url = URL.createObjectURL(file);
        setPreviewFile({ file, url });

        // Reset input so same file can be selected again if needed
        e.target.value = '';
    };

    const confirmSendFile = async () => {
        if (!previewFile || !contactId) return;

        setSending(true);
        const formData = new FormData();
        formData.append('file', previewFile.file);

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
                    body: `📎 Archivo adjunto: ${name}`,
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
                setPreviewFile(null); // Close preview
            }

        } catch (error) {
            console.error("Error uploading/sending file:", error);
        } finally {
            setSending(false);
        }
    };

    const cancelPreview = () => {
        if (previewFile) {
            URL.revokeObjectURL(previewFile.url);
            setPreviewFile(null);
        }
    };

    const handleDeleteMessage = async (messageId: number) => {
        if (!confirm('¿Eliminar este mensaje?')) return;
        try {
            const res = await fetch(`/api/messages?messageId=${messageId}`, { method: 'DELETE' });
            if (res.ok) {
                setMessages(prev => prev.filter(m => m.id !== messageId));
            }
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    };

    const confirmContactName = async () => {
        if (!contact) return;
        try {
            const res = await fetch(`/api/contacts/${contact.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: contact.name }) // Triggers nameConfirmed update
            });
            if (res.ok) {
                setContact({ ...contact, nameConfirmed: true });
            }
        } catch (error) {
            console.error("Error confirming name", error);
        }
    };

    const toggleSelectMessage = (id: number) => {
        setSelectedMessages(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    };

    const handleCopySelected = () => {
        const selectedMsgs = messages.filter(m => selectedMessages.includes(m.id)).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const textToCopy = selectedMsgs.map(m => `[${safelyFormatTime(m.timestamp)}] ${m.direction === 'inbound' ? contact?.name || 'Cliente' : 'Yo'}: ${m.body}`).join('\n');
        navigator.clipboard.writeText(textToCopy);
        setSelectedMessages([]);
        alert('Mensajes copiados al portapapeles');
    };

    const handleForwardSelected = async (targetContactId: number) => {
        if (!targetContactId || selectedMessages.length === 0) return;
        setSending(true);
        const selectedMsgs = messages.filter(m => selectedMessages.includes(m.id)).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        try {
            for (const msg of selectedMsgs) {
                let body = msg.body;
                if (msg.direction === 'inbound') {
                    body = `[Reenviado de ${contact?.name || 'Cliente'}]: ${msg.body}`;
                }

                await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contactId: Number(targetContactId),
                        body: body,
                        direction: 'outbound',
                        status: 'sent',
                        fileUrl: msg.fileUrl || undefined,
                        fileType: msg.fileType || undefined,
                        fileName: msg.fileName || undefined
                    })
                });
            }
            alert('Mensajes reenviados con éxito');
            setShowForwardModal(false);
            setSelectedMessages([]);
        } catch (error) {
            console.error('Error al reenviar', error);
            alert('Ocurrió un error al reenviar algunos mensajes.');
        } finally {
            setSending(false);
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

                // Fetch Templates
                const resTmpl = await fetch('/api/templates');
                if (resTmpl.ok) {
                    setTemplates(await resTmpl.json());
                }

                // Fetch All Contacts for Forwarding Feature
                const resAll = await fetch('/api/contacts');
                if (resAll.ok) {
                    setAllContacts(await resAll.json());
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

    // Scroll and Read Status Effect on Load
    useEffect(() => {
        if (messages.length > 0) {
            // Wait slightly for DOM paint
            setTimeout(() => {
                const unreadIndex = messages.findIndex(m => m.direction === 'inbound' && m.isReadByAgent === false);
                if (unreadIndex !== -1 && unreadSeparatorRef.current) {
                    unreadSeparatorRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
                } else {
                    scrollToBottom(false);
                }
            }, 50);

            // Mark all as read conceptually in background
            markChatAsRead();
        }
    }, [messages.length, contactId]);

    // Escape Key Navigation Effect
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showContactInfo) {
                    setShowContactInfo(false);
                } else if (previewFile) {
                    cancelPreview();
                } else if (showSearch) {
                    setShowSearch(false);
                } else {
                    // Navigate back to the main dashboard if nothing else is open
                    router.push('/dashboard');
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showContactInfo, previewFile, showSearch, router]);

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

    const filteredMessages = messages.filter(m =>
        m.body.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-full flex-col bg-[#efeae2] bg-opacity-90 relative" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>

            {/* File Preview Modal */}
            {previewFile && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-lg rounded-xl bg-white p-4 shadow-2xl">
                        <button
                            onClick={cancelPreview}
                            className="absolute -right-3 -top-3 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 shadow-md"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex flex-col items-center gap-4">
                            <h3 className="text-lg font-semibold text-gray-800">Vista previa del archivo</h3>

                            {previewFile.file.type.startsWith('image/') ? (
                                <img
                                    src={previewFile.url}
                                    alt="Preview"
                                    className="max-h-[60vh] rounded-lg object-contain border border-gray-200"
                                />
                            ) : (
                                <div className="flex items-center gap-3 rounded-lg bg-gray-100 p-6">
                                    <Paperclip className="h-10 w-10 text-gray-500" />
                                    <div className="text-left">
                                        <p className="font-medium text-gray-900">{previewFile.file.name}</p>
                                        <p className="text-sm text-gray-500">{(previewFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex w-full gap-3 pt-2">
                                <button
                                    onClick={cancelPreview}
                                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmSendFile}
                                    disabled={sending}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-whatsapp-green px-4 py-2 font-medium text-white hover:bg-whatsapp-teal transition disabled:opacity-50"
                                >
                                    {sending ? 'Enviando...' : (
                                        <>
                                            <span>Enviar</span>
                                            <Send className="h-4 w-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Encabezado del Chat o Barra de Selección */}
            {isSelectionMode ? (
                <div className="flex items-center justify-between bg-whatsapp-teal text-white px-4 py-3 shadow-md z-10 transition-colors duration-200">
                    <div className="flex items-center gap-6">
                        <X className="h-6 w-6 cursor-pointer hover:bg-white/20 rounded-full p-1 transition" onClick={() => setSelectedMessages([])} />
                        <span className="font-semibold text-lg">{selectedMessages.length} seleccionado(s)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleCopySelected} className="flex flex-col items-center hover:bg-white/20 p-2 rounded transition" title="Copiar">
                            <Copy className="h-5 w-5" />
                        </button>
                        <button onClick={() => setShowForwardModal(true)} className="flex flex-col items-center hover:bg-white/20 p-2 rounded transition" title="Reenviar">
                            <Forward className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            ) : (
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
                                        onClick={() => {
                                            setSelectedMessages([]); // Force mode entry, but empty initially. Let user tap bubbles.
                                            // A better way is to provide a "Seleccionar Mensajes" button that just alerts them to tap a bubble, or sets an explicit mode.
                                            // For now, setting it to an empty array doesn't trigger isSelectionMode because length == 0. So we need to set a dummy ID or tell them.
                                            alert("Mantén presionado o haz click en cualquier mensaje para seleccionarlo.");
                                            setShowMenu(false);
                                        }}
                                    >
                                        Seleccionar Mensajes
                                    </button>
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
                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-400 text-sm border-t mt-1 pt-1"
                                        onClick={() => setShowMenu(false)}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* Área de Mensajes */}
                <div className="flex-1 flex flex-col h-full relative">
                    {contact && contact.nameConfirmed === false && (
                        <div className="bg-yellow-50 text-yellow-800 px-4 py-2 flex items-center justify-between text-sm shadow-sm border-b border-yellow-200 z-10 shrink-0">
                            <div className="flex items-center gap-2">
                                <span>¿El nombre del prospecto es <b>{contact?.name}</b>?</span>
                            </div>
                            <button onClick={confirmContactName} className="bg-yellow-200 hover:bg-yellow-300 text-yellow-900 px-3 py-1 rounded font-medium transition cursor-pointer">
                                Confirmar Nombre
                            </button>
                        </div>
                    )}

                    {/* Floating Date Header */}
                    {floatingDate && (
                        <div className="absolute top-4 left-0 right-0 flex justify-center z-20 pointer-events-none transition-opacity duration-300">
                            <span className="bg-[#e1f2eb] dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-md text-sm shadow-sm opacity-90">
                                {floatingDate}
                            </span>
                        </div>
                    )}

                    <div
                        className="flex-1 overflow-y-auto p-4 sm:p-8"
                        ref={chatContainerRef}
                        onScroll={handleScroll}
                    >
                        {filteredMessages.map((msg, index) => {
                            const showDateHeader = index === 0 || new Date(msg.timestamp).toDateString() !== new Date(filteredMessages[index - 1].timestamp).toDateString();
                            const currentHeaderDate = formatDateHeader(msg.timestamp);

                            // Unread Separator Logic
                            const isFirstUnread = msg.direction === 'inbound' && msg.isReadByAgent === false &&
                                (index === 0 || filteredMessages[index - 1].isReadByAgent === true);

                            // Count unread from this index
                            const totalUnread = isFirstUnread ? filteredMessages.slice(index).filter(m => m.direction === 'inbound' && !m.isReadByAgent).length : 0;

                            return (
                                <div key={msg.id} data-date={currentHeaderDate}>
                                    {showDateHeader && (
                                        <div className="flex justify-center my-4 opacity-80 pointer-events-none">
                                            <span className="bg-[#e1f2eb] dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-md text-xs shadow-sm">
                                                {currentHeaderDate}
                                            </span>
                                        </div>
                                    )}

                                    {isFirstUnread && (
                                        <div ref={unreadSeparatorRef} className="flex items-center justify-center my-4 relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-gray-300/50 dark:border-gray-600/50"></div>
                                            </div>
                                            <div className="relative flex justify-center">
                                                <span className="bg-gray-800 text-gray-200 px-3 py-1 rounded-full text-xs shadow-md">
                                                    {totalUnread} mensaje{totalUnread > 1 ? 's' : ''} no leído{totalUnread > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        className={`flex mb-2 group relative transition-all duration-200 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'} ${isSelectionMode ? 'cursor-pointer pl-10 pr-4' : ''} ${selectedMessages.includes(msg.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                                        onMouseLeave={() => setHoveredMessageId(null)}
                                        onClick={() => {
                                            if (isSelectionMode) toggleSelectMessage(msg.id);
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            toggleSelectMessage(msg.id);
                                        }}
                                    >
                                        {/* Multiselect Checkbox overlay */}
                                        {isSelectionMode && (
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedMessages.includes(msg.id) ? 'bg-whatsapp-teal border-whatsapp-teal text-white' : 'border-gray-400 bg-white'}`}>
                                                    {selectedMessages.includes(msg.id) && <span className="text-xs font-bold leading-none select-none">✓</span>}
                                                </div>
                                            </div>
                                        )}

                                        <div
                                            className={`relative max-w-[85%] md:max-w-[70%] rounded-lg px-3 py-2 shadow-sm text-sm transition-colors ${msg.direction === 'outbound'
                                                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-none text-gray-900 dark:text-gray-100'
                                                : 'bg-white dark:bg-[#202c33] rounded-tl-none text-gray-900 dark:text-gray-100'
                                                } pb-5 ${selectedMessages.includes(msg.id) ? 'ring-2 ring-whatsapp-teal/50' : ''}`}
                                        >
                                            {/* Delete Button */}
                                            {hoveredMessageId === msg.id && (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteMessage(msg.id);
                                                    }}
                                                    className="absolute -top-3 -right-2 z-10 cursor-pointer rounded-full bg-white dark:bg-gray-800 p-1.5 text-gray-400 hover:text-red-500 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors"
                                                    title="Eliminar mensaje"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </div>
                                            )}

                                            {/* Media / Files Content */}
                                            {msg.fileUrl && (
                                                <div className="mb-2 mt-1">
                                                    {msg.fileType?.startsWith('image/') ? (
                                                        <img src={msg.fileUrl} alt={msg.fileName || 'Imagen'} className="w-full max-w-[300px] h-auto rounded-md cursor-pointer hover:opacity-90 transition object-contain bg-black/5" onClick={() => window.open(msg.fileUrl!, '_blank')} />
                                                    ) : msg.fileType?.startsWith('audio/') ? (
                                                        <div className="min-w-[200px] md:min-w-[250px] py-1">
                                                            <audio controls src={msg.fileUrl} className="w-full h-10 custom-audio-player" />
                                                        </div>
                                                    ) : (
                                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-3 rounded-lg hover:bg-black/10 transition text-blue-600 dark:text-blue-400">
                                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600">
                                                                <Paperclip className="h-5 w-5" />
                                                            </div>
                                                            <div className="flex flex-col truncate">
                                                                <span className="truncate max-w-[150px] font-medium text-gray-800 dark:text-gray-200">{msg.fileName || 'Archivo adjunto'}</span>
                                                                <span className="text-[10px] text-gray-500 uppercase">{msg.fileType?.split('/')[1] || 'Documento'}</span>
                                                            </div>
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* Text Content */}
                                            {msg.body && !msg.body.startsWith('📎 Archivo adjunto:') && (
                                                <div
                                                    className="text-[15px] leading-relaxed break-words pr-2"
                                                    dangerouslySetInnerHTML={parseMessageBody(msg.body)}
                                                />
                                            )}

                                            <div className="flex justify-end items-center gap-1 absolute bottom-1 right-2">
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400" suppressHydrationWarning>
                                                    {safelyFormatTime(msg.timestamp)}
                                                </span>
                                                {msg.direction === 'outbound' && (
                                                    <span className="text-blue-500 text-[11px] ml-0.5">✓✓</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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

                        <div className="flex-1 rounded-lg bg-white px-4 py-2 relative">
                            {/* Templates Popover */}
                            {showTemplatePopover && templates.length > 0 && (
                                <div className="absolute bottom-full left-0 mb-2 w-64 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="p-2 border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Respuestas Rápidas
                                    </div>
                                    <div className="p-1">
                                        {templates.filter(t => t.name.toLowerCase().includes(templateFilter.toLowerCase())).map(t => (
                                            <div
                                                key={t.id}
                                                className="p-2 hover:bg-blue-50 cursor-pointer rounded-md transition"
                                                onClick={() => {
                                                    // Replace the slash command with the actual content
                                                    const beforeSlash = newMessage.substring(0, newMessage.lastIndexOf('/'));
                                                    setNewMessage(beforeSlash + t.content + ' ');
                                                    setShowTemplatePopover(false);
                                                    setTemplateFilter('');
                                                    fileInputRef.current?.focus();
                                                }}
                                            >
                                                <div className="font-medium text-blue-700 text-sm">/{t.name}</div>
                                                <div className="text-xs text-gray-600 truncate">{t.content}</div>
                                            </div>
                                        ))}
                                        {templates.filter(t => t.name.toLowerCase().includes(templateFilter.toLowerCase())).length === 0 && (
                                            <div className="p-3 text-center text-xs text-gray-400">Sin coincidencias</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <input
                                type="text"
                                placeholder="Escribe un mensaje"
                                className="w-full bg-transparent outline-none text-gray-800 placeholder-gray-500"
                                value={newMessage}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setNewMessage(val);

                                    // Detect slash command
                                    const lastSlashIndex = val.lastIndexOf('/');
                                    if (lastSlashIndex !== -1 && (lastSlashIndex === 0 || val[lastSlashIndex - 1] === ' ')) {
                                        setShowTemplatePopover(true);
                                        setTemplateFilter(val.substring(lastSlashIndex + 1));
                                    } else {
                                        setShowTemplatePopover(false);
                                        setTemplateFilter('');
                                    }
                                }}
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

            {/* Forward Modal */}
            {showForwardModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl flex flex-col max-h-[80vh]">
                        <button
                            onClick={() => setShowForwardModal(false)}
                            className="absolute right-4 top-4 rounded-full p-1 text-gray-500 hover:bg-gray-100 transition"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h3 className="text-xl font-bold text-gray-800 mb-4">Reenviar a...</h3>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar contacto..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-whatsapp-teal text-gray-900"
                                value={forwardSearch}
                                onChange={e => setForwardSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-[50vh]">
                            {allContacts
                                .filter(c => c.id.toString() !== contactId && (c.name?.toLowerCase().includes(forwardSearch.toLowerCase()) || c.phone.includes(forwardSearch)))
                                .map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleForwardSelected(c.id)}
                                        disabled={sending}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 transition disabled:opacity-50 text-left"
                                    >
                                        <div className="h-10 w-10 shrink-0 rounded-full bg-whatsapp-teal/20 flex items-center justify-center text-whatsapp-teal font-bold uppercase">
                                            {c.name ? c.name.charAt(0) : '#'}
                                        </div>
                                        <div className="flex-1 truncate">
                                            <p className="font-semibold text-gray-900 truncate">{c.name || 'Sin nombre'}</p>
                                            <p className="text-xs text-gray-500">{c.phone}</p>
                                        </div>
                                        <Forward className="h-4 w-4 text-gray-400" />
                                    </button>
                                ))
                            }
                            {allContacts.length === 0 && (
                                <p className="text-center text-gray-500 py-8 text-sm">Cargando contactos...</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
