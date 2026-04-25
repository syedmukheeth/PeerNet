import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
    HiDotsVertical, HiPaperClip, HiMicrophone, HiEmojiHappy, 
    HiReply, HiPencil, HiTrash, HiSearch, HiPencilAlt,
    HiX, HiChevronDown, HiArrowRight, HiVolumeUp, HiVolumeOff, 
    HiBookmark, HiArchive, HiArrowSmRight, HiCheckCircle, HiMail
} from 'react-icons/hi'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { 
    useConvos, useMessages, useSendMessage, 
    useMessageActions, useConvoActions, useChatState 
} from '../hooks/useChat'
import { timeago as formatTime } from '../utils/timeago'
import toast from 'react-hot-toast'

/**
 * CONVERSATION ITEM COMPONENT
 * Premium row for the sidebar conversation list
 */
const ConvoItem = ({ c, isActive, user, onClick, onPin, onMute, onArchive, onMarkUnread }) => {
    const peer = useMemo(() => c.participants?.find(p => p._id !== user?._id), [c.participants, user?._id])
    const lastMsg = c.lastMessage
    const isUnread = c.unreadCount > 0 || c.isMarkedUnread

    return (
        <motion.div 
            layout
            onClick={onClick}
            className={`zn-convo-row group ${isActive ? 'active' : ''} ${c.isArchived ? 'opacity-50' : ''}`}
        >
            <div className="relative flex-shrink-0">
                <img 
                    src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} 
                    className="zn-convo-avatar" 
                    alt={peer?.username} 
                />
                {peer?.isOnline && <div className="zn-online-dot" />}
            </div>
            <div className="flex-1 min-w-0 pr-12">
                <div className="flex justify-between items-center mb-0.5">
                    <span className="zn-convo-name truncate">{peer?.username || 'Unknown User'}</span>
                    <span className="text-[10px] text-zinc-500 font-bold">{formatTime(c.updatedAt)}</span>
                </div>
                <div className="zn-convo-msg-row">
                    <p className={`zn-convo-msg ${isUnread ? 'unread' : ''}`}>
                        {lastMsg?.sender === user?._id ? 'You: ' : ''}
                        {lastMsg?.body || 'Started a conversation'}
                    </p>
                </div>
            </div>

            {/* Badges & Actions Overlay */}
            <div className="zn-convo-badge-wrap">
                {c.isPinned && <HiBookmark className="zn-mini-icon active" size={12} />}
                {c.isMuted && <HiVolumeOff className="zn-mini-icon" size={12} />}
                {isUnread && <div className="w-2 h-2 rounded-full bg-zn-accent shadow-[0_0_10px_rgba(168,85,247,0.5)]" />}
            </div>

            {/* Hover Actions: Quick access to conversation management */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <button onClick={(e) => { e.stopPropagation(); onPin() }} className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors" title="Pin Chat">
                    <HiBookmark size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onMarkUnread() }} className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors" title="Mark as Unread">
                    <HiMail size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onArchive() }} className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors" title="Archive Chat">
                    <HiArchive size={14} />
                </button>
            </div>
        </motion.div>
    )
}

/**
 * MESSAGE BUBBLE COMPONENT
 * Premium bubble with actions, reactions, and reply context
 */
const MessageBubble = ({ m, isSelf, onReply, onEdit, onDelete, onReact, onForward, searchQuery }) => {
    const reactions = m.reactions || []
    const quickEmojis = ['❤️', '😂', '🔥', '👍', '😢', '😮']

    // Highlight search matches
    const renderContent = () => {
        if (!searchQuery) return m.body
        const parts = m.body.split(new RegExp(`(${searchQuery})`, 'gi'))
        return parts.map((part, i) => 
            part.toLowerCase() === searchQuery.toLowerCase() 
                ? <span key={i} className="bg-zn-accent/30 text-white rounded px-0.5">{part}</span> 
                : part
        )
    }

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className={`zn-row ${isSelf ? 'self' : 'peer'}`}
        >
            <div className="zn-bubble-container group">
                {/* Reply Context */}
                {m.replyTo && (
                    <div className="zn-bubble-reply">
                        <div className="font-black text-[9px] uppercase tracking-widest opacity-40 mb-1">Replying to</div>
                        <div className="truncate text-xs opacity-70 italic">{m.replyTo.body || 'Media'}</div>
                    </div>
                )}

                <div className={`zn-bubble ${m.isOptimistic ? 'opacity-70' : ''}`}>
                    <div className="zn-bubble-text">{renderContent()}</div>
                    
                    {/* Timestamp & Status */}
                    <div className={`flex items-center gap-1.5 mt-1.5 text-[9px] font-black uppercase tracking-tighter opacity-30 ${isSelf ? 'justify-end' : ''}`}>
                        {formatTime(m.createdAt)}
                        {isSelf && (
                            m.isSeen ? (
                                <div className="flex -space-x-1 text-zn-accent">
                                    <HiCheckCircle size={10} />
                                    <HiCheckCircle size={10} />
                                </div>
                            ) : (
                                <HiCheckCircle size={10} />
                            )
                        )}
                        {m.isEdited && <span className="italic">(edited)</span>}
                    </div>

                    {/* Reactions Display */}
                    <AnimatePresence>
                        {reactions.length > 0 && (
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="zn-reactions">
                                {reactions.map(r => (
                                    <button 
                                        key={r.emoji} 
                                        className={`zn-reaction-chip ${r.me ? 'active' : ''} hover:scale-110 transition-transform`} 
                                        onClick={() => onReact(r.emoji)}
                                    >
                                        <span>{r.emoji}</span>
                                        {r.count > 1 && <span className="ml-1 opacity-60">{r.count}</span>}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Bubble Actions Menu */}
                <div className={`absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10 transform ${isSelf ? 'right-full mr-3 translate-x-2' : 'left-full ml-3 -translate-x-2'} group-hover:translate-x-0`}>
                    <div className="flex bg-[#121214]/90 backdrop-blur-md border border-white/10 rounded-2xl p-1 shadow-2xl ring-1 ring-black/50">
                        <button onClick={() => onReply(m)} className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors" title="Reply">
                            <HiReply size={16} />
                        </button>
                        <button onClick={() => onForward(m)} className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors" title="Forward">
                            <HiArrowSmRight size={16} />
                        </button>
                        {isSelf && (
                            <>
                                <button onClick={() => onEdit(m)} className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors" title="Edit">
                                    <HiPencil size={16} />
                                </button>
                                <button onClick={() => onDelete(m._id)} className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-red-500/40 hover:text-red-500 transition-colors" title="Delete">
                                    <HiTrash size={16} />
                                </button>
                            </>
                        )}
                        <div className="w-[1px] h-4 bg-white/10 my-auto mx-1" />
                        <div className="flex gap-0.5 pr-1">
                            {quickEmojis.slice(0, 3).map(e => (
                                <button key={e} onClick={() => onReact(e)} className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-sm transition-transform active:scale-125">{e}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

/**
 * MAIN MESSAGES PAGE
 * The heartbeat of PeerNet communication.
 */
export default function Messages() {
    const { convoId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    
    // Data Fetching with optimized caching
    const { 
        data: convos = [], 
        isLoading: loadingConvos, 
        isError: errorConvos,
        refetch: refetchConvos
    } = useConvos()
    const { data: messages = [], isLoading: loadingMsgs } = useMessages(convoId)
    
    // UI Logic States
    const [searchQuery, setSearchQuery] = useState('')
    const [replyingTo, setReplyingTo] = useState(null)
    const [isSearchingInChat, setIsSearchingInChat] = useState(false)
    const [chatSearchQuery, setChatSearchQuery] = useState('')
    const fileInputRef = useRef(null)

    // Persistent Chat State
    const { getDraft, setDraft } = useChatState(convoId)
    const sendMutation = useSendMessage(convoId)
    const { react: reactMutation, edit: editMutation, remove: deleteMutation } = useMessageActions(convoId)
    const { pin: pinMutation, mute: muteMutation, archive: archiveMutation } = useConvoActions()

    const [inputText, setInputText] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editingText, setEditingText] = useState('')
    const viewportRef = useRef(null)

    // Derived Data
    const activeConvo = useMemo(() => convos.find(c => c._id === convoId), [convos, convoId])
    const peer = useMemo(() => activeConvo?.participants?.find(p => p._id !== user?._id), [activeConvo, user?._id])
    
    const filteredConvos = useMemo(() => {
        return convos
            .filter(c => {
                const p = c.participants?.find(p => p._id !== user?._id)
                const match = p?.username?.toLowerCase().includes(searchQuery.toLowerCase())
                return match && !c.isArchived // Hide archived by default
            })
            .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.updatedAt) - new Date(a.updatedAt))
    }, [convos, searchQuery, user?._id])

    const filteredMessages = useMemo(() => {
        if (!chatSearchQuery.trim()) return messages
        return messages.filter(m => m.body?.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    }, [messages, chatSearchQuery])

    // Group messages by date
    const groupedMessages = useMemo(() => {
        const groups = []
        let lastDate = ''
        filteredMessages.forEach(m => {
            const date = new Date(m.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
            if (date !== lastDate) {
                groups.push({ type: 'date', value: date, id: `date-${date}` })
                lastDate = date
            }
            groups.push({ type: 'message', value: m, id: m._id })
        })
        return groups
    }, [filteredMessages])

    // Handlers
    const scrollToBottom = useCallback(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTo({
                top: viewportRef.current.scrollHeight,
                behavior: 'smooth'
            })
        }
    }, [])

    useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])
    
    // Draft Syncing: Load draft when conversation changes
    useEffect(() => {
        const draft = getDraft()
        setInputText(draft)
    }, [convoId, getDraft])

    // Save draft as user types
    useEffect(() => {
        setDraft(inputText)
    }, [inputText, setDraft])

    useEffect(() => {
        if (convoId) localStorage.setItem('zn_last_convo_id', convoId)
    }, [convoId])

    const handleSend = async () => {
        if (!inputText.trim() && !replyingTo) return
        const body = inputText
        const replyId = replyingTo?._id
        setInputText('')
        setReplyingTo(null)
        try { 
            await sendMutation.mutateAsync({ text: body, replyToId: replyId })
            scrollToBottom()
        } catch { 
            toast.error('Failed to send message')
            setInputText(body) // Restore text on failure
        }
    }

    const onReact = (messageId, emoji) => reactMutation.mutate({ messageId, emoji })

    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (file) toast.success(`Selected "${file.name}" - Uploading soon...`)
    }

    return (
        <div className="zn-messages-root">
            {/* 1. SIDEBAR: The conversation navigator */}
            <aside className="zn-messages-sidebar">
                <div className="zn-sidebar-header">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-black tracking-tighter text-white">Messages</h1>
                        <button className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all active:scale-95 shadow-lg border border-white/5">
                            <HiPencilAlt size={22} />
                        </button>
                    </div>
                    <div className="relative group">
                        <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-zn-accent transition-colors" size={20} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="zn-sidebar-search w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold placeholder:text-zinc-600 outline-none focus:border-zn-accent/50 focus:bg-white/10 focus:ring-8 focus:ring-zn-accent/5 transition-all shadow-inner" 
                            placeholder="Search conversations..." 
                        />
                    </div>
                </div>

                <div className="zn-sidebar-scroll no-scrollbar">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {loadingConvos ? (
                            <motion.div 
                                key="skeleton"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="p-4 space-y-4"
                            >
                                {[1,2,3,4,5,6].map(id => (
                                    <div key={id} className="flex gap-4 items-center">
                                        <div className="w-14 h-14 rounded-2xl zn-shimmer shrink-0" />
                                        <div className="flex-1 space-y-2.5">
                                            <div className="h-4 zn-shimmer w-32 rounded-full" />
                                            <div className="h-2.5 zn-shimmer w-48 rounded-full opacity-40" />
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        ) : filteredConvos.length > 0 ? (
                            <motion.div 
                                key="list"
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: { transition: { staggerChildren: 0.05 } }
                                }}
                                className="pb-8"
                            >
                                {filteredConvos.map(c => (
                                    <motion.div
                                        key={c._id}
                                        variants={{
                                            hidden: { opacity: 0, x: -15 },
                                            visible: { opacity: 1, x: 0 }
                                        }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                                    >
                                        <ConvoItem 
                                            c={c} isActive={convoId === c._id} user={user} 
                                            onClick={() => navigate(`/messages/${c._id}`)} 
                                            onPin={() => pinMutation.mutate(c._id)}
                                            onMute={() => muteMutation.mutate(c._id)}
                                            onArchive={() => archiveMutation.mutate(c._id)}
                                            onMarkUnread={() => toast.success('Marked unread')}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="empty"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-16 text-center"
                            >
                                <div className="w-20 h-20 rounded-[32px] bg-white/5 flex items-center justify-center mx-auto mb-6 opacity-20 ring-1 ring-white/10 shadow-2xl">
                                    <HiMail size={40} className="text-zinc-500" />
                                </div>
                                <p className="text-zinc-500 font-black text-sm tracking-tight uppercase">No chats found</p>
                                <p className="text-zinc-700 text-xs mt-2 font-bold px-4">Try searching for a user or start a new conversation.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </aside>

            {/* 2. CHAT MAIN: The viewport of active connection */}
            <main className="zn-chat-main">
                <AnimatePresence mode="wait">
                    {convoId ? (
                        <motion.div 
                            key={`chat-${convoId}`}
                            initial={{ opacity: 0, x: 30, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                            className="zn-page-transition h-full flex flex-col"
                        >
                            <header className="zn-chat-header border-b border-white/5 bg-black/40 backdrop-blur-xl z-20">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <img 
                                            src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} 
                                            className="w-11 h-11 rounded-2xl object-cover border border-white/10 shadow-xl" 
                                            alt="" 
                                        />
                                        {peer?.isOnline && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0F0] border-4 border-black rounded-full" />}
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-white tracking-tight">{peer?.username || 'Chatting...'}</h2>
                                        <p className="text-[10px] font-black text-zn-accent flex items-center gap-1.5 uppercase tracking-widest">
                                            {peer?.isOnline ? (
                                                <>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-zn-accent animate-pulse" />
                                                    Active Now
                                                </>
                                            ) : (
                                                <span className="opacity-50">Offline</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => { setIsSearchingInChat(!isSearchingInChat); if (!isSearchingInChat) setChatSearchQuery('') }} 
                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${isSearchingInChat ? 'bg-zn-accent text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <HiSearch size={22} />
                                    </button>
                                    <button className="w-10 h-10 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5 flex items-center justify-center transition-all active:scale-90">
                                        <HiDotsVertical size={22} />
                                    </button>
                                </div>
                            </header>

                            <AnimatePresence>
                                {isSearchingInChat && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0, y: -20 }} 
                                        animate={{ height: 'auto', opacity: 1, y: 0 }} 
                                        exit={{ height: 0, opacity: 0, y: -20 }} 
                                        className="zn-search-inline bg-zinc-900/50 backdrop-blur-md border-b border-white/5"
                                    >
                                        <div className="flex items-center gap-3 px-6 py-3">
                                            <HiSearch className="text-zinc-500" size={18} />
                                            <input 
                                                autoFocus 
                                                value={chatSearchQuery} 
                                                onChange={(e) => setChatSearchQuery(e.target.value)} 
                                                placeholder="Search in conversation..." 
                                                className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-white placeholder:text-zinc-700" 
                                            />
                                            <button onClick={() => { setIsSearchingInChat(false); setChatSearchQuery('') }} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                                                <HiX size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div ref={viewportRef} className="zn-viewport no-scrollbar pb-12 pt-6">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {loadingMsgs ? (
                                        <motion.div 
                                            key="chat-skeleton"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="space-y-8 px-6"
                                        >
                                            {[1,2,3,4].map(id => (
                                                <div key={id} className={`flex flex-col ${id % 2 === 0 ? 'items-end' : 'items-start'}`}>
                                                    <div className={`h-14 zn-shimmer rounded-[24px] mb-2 shadow-sm ${id % 2 === 0 ? 'w-56' : 'w-72'}`} />
                                                    <div className="h-2.5 zn-shimmer w-16 rounded-full opacity-30" />
                                                </div>
                                            ))}
                                        </motion.div>
                                    ) : groupedMessages.length > 0 ? (
                                        groupedMessages.map((item) => (
                                            item.type === 'date' ? (
                                                <motion.div 
                                                    key={item.id}
                                                    layout
                                                    className="flex justify-center my-8"
                                                >
                                                    <span className="px-5 py-1.5 rounded-full bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 shadow-sm">
                                                        {item.value}
                                                    </span>
                                                </motion.div>
                                            ) : (
                                                <MessageBubble 
                                                    key={item.id} 
                                                    m={item.value} 
                                                    searchQuery={chatSearchQuery}
                                                    isSelf={item.value.sender?._id === user?._id || item.value.sender === user?._id} 
                                                    onReply={setReplyingTo}
                                                    onForward={(msg) => toast.success('Forwarding system ready')}
                                                    onEdit={(msg) => { setEditingId(msg._id); setEditingText(msg.body) }}
                                                    onDelete={deleteMutation.mutate}
                                                    onReact={(emoji) => onReact(item.value._id, emoji)}
                                                />
                                            )
                                        ))
                                    ) : chatSearchQuery ? (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-zinc-600 font-black text-sm uppercase tracking-widest min-h-[300px]">
                                            <HiSearch size={40} className="mb-4 opacity-10" />
                                            No matches found
                                        </motion.div>
                                    ) : (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-zinc-700 text-xs font-bold py-20 px-12 text-center leading-relaxed">
                                            <HiMail size={32} className="mb-4 opacity-10" />
                                            Beginning of a legendary conversation with {peer?.username || 'your contact'}.
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <footer className="zn-footer border-t border-white/5 bg-black/40 backdrop-blur-xl">
                                <div className="max-w-4xl mx-auto px-6 py-5">
                                    <AnimatePresence>
                                        {replyingTo && (
                                            <motion.div 
                                                initial={{ y: 20, opacity: 0, scale: 0.98 }} 
                                                animate={{ y: 0, opacity: 1, scale: 1 }} 
                                                exit={{ y: 20, opacity: 0, scale: 0.98 }} 
                                                className="zn-reply-preview bg-[#121214] border border-white/10 shadow-2xl ring-1 ring-zn-accent/20"
                                            >
                                                <div className="zn-reply-line bg-zn-accent shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-black text-zn-accent uppercase tracking-[0.15em] mb-0.5">Replying to {replyingTo.sender?.username || 'User'}</p>
                                                    <p className="text-xs text-zinc-500 truncate font-bold leading-tight">{replyingTo.body}</p>
                                                </div>
                                                <button onClick={() => setReplyingTo(null)} className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all">
                                                    <HiX size={18} />
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="zn-composer-pill group shadow-2xl ring-1 ring-white/5 focus-within:ring-zn-accent/20 transition-all duration-300">
                                        <div className="flex items-center gap-1.5 pl-2">
                                            <button className="w-10 h-10 rounded-2xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all active:scale-90 flex items-center justify-center">
                                                <HiEmojiHappy size={24} />
                                            </button>
                                            <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-2xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all active:scale-90 flex items-center justify-center">
                                                <HiPaperClip size={24} />
                                            </button>
                                        </div>
                                        
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                        
                                        <input 
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleSend()
                                                }
                                            }}
                                            className="zn-composer-input py-4 text-[15px]" 
                                            placeholder={`Message ${peer?.username || 'contact'}...`}
                                            autoFocus
                                        />
                                        
                                        <div className="flex items-center gap-2 pr-2.5">
                                            <button className="w-10 h-10 rounded-2xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all active:scale-90 flex items-center justify-center">
                                                <HiMicrophone size={24} />
                                            </button>
                                            <button 
                                                onClick={handleSend} 
                                                disabled={!inputText.trim() && !replyingTo}
                                                className={`zn-send-btn ${inputText.trim() || replyingTo ? 'active scale-100 opacity-100 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'opacity-20 scale-90 pointer-events-none'}`}
                                            >
                                                <HiArrowRight size={22} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </footer>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="select-convo"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="flex-1 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden h-full"
                        >
                            {/* Cinematic Background Elements */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zn-accent/5 blur-[140px] rounded-full pointer-events-none animate-pulse" />
                            <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
                            
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                transition={{ type: 'spring', delay: 0.1 }}
                                className="relative z-10"
                            >
                                <div className="w-28 h-28 rounded-[40px] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center mb-10 mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
                                    <HiMail size={48} className="text-zn-accent drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                                </div>
                                <h2 className="text-4xl font-black text-white mb-4 tracking-tighter leading-tight">Elite Networking<br />Starts Here</h2>
                                <p className="text-zinc-500 font-bold max-w-sm mx-auto leading-relaxed text-sm opacity-80">
                                    Your secure, high-fidelity hub for conversations. Choose a connection from the left to dive back in.
                                </p>
                                
                                <div className="mt-12 flex flex-wrap justify-center gap-3">
                                    <button onClick={() => navigate('/')} className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-sm font-black text-white transition-all active:scale-95">Back to Feed</button>
                                    <button className="px-8 py-3.5 bg-zn-accent rounded-2xl text-sm font-black text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] active:scale-95">New Message</button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Editing Overlay Modal: Cinematic focused editing */}
            <AnimatePresence>
                {editingId && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 40, rotateX: -10 }} 
                            animate={{ scale: 1, y: 0, rotateX: 0 }} 
                            exit={{ scale: 0.9, y: 40, opacity: 0 }}
                            className="w-full max-w-xl bg-[#0a0a0b] border border-white/10 rounded-[40px] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] ring-1 ring-white/5"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-black text-white tracking-tighter uppercase">Edit Message</h3>
                                <button onClick={() => setEditingId(null)} className="w-10 h-10 rounded-2xl hover:bg-white/5 flex items-center justify-center text-zinc-500 transition-colors">
                                    <HiX size={24} />
                                </button>
                            </div>
                            
                            <textarea 
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 rounded-[32px] p-8 text-white text-lg font-medium outline-none focus:border-zn-accent/40 focus:ring-4 focus:ring-zn-accent/5 min-h-[200px] mb-10 transition-all placeholder:text-zinc-800"
                                placeholder="Edit your message..."
                                autoFocus
                            />
                            
                            <div className="flex justify-end gap-4">
                                <button 
                                    onClick={() => setEditingId(null)} 
                                    className="px-8 py-4 rounded-2xl font-black text-zinc-500 hover:text-white transition-colors"
                                >
                                    Discard Changes
                                </button>
                                <button 
                                    onClick={async () => {
                                        if (!editingText.trim()) return
                                        try {
                                            await editMutation.mutateAsync({ messageId: editingId, text: editingText })
                                            setEditingId(null)
                                            toast.success('Message updated')
                                        } catch { toast.error('Update failed') }
                                    }}
                                    className="px-10 py-4 bg-zn-accent rounded-2xl font-black text-white shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] active:scale-95"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
