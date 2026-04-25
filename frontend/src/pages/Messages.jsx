import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
    HiDotsVertical, HiPaperClip, HiMicrophone, HiEmojiHappy, 
    HiReply, HiPencil, HiTrash, HiSearch, HiPencilAlt,
    HiX, HiChevronDown, HiArrowRight, HiVolumeUp, HiVolumeOff, 
    HiBookmark, HiArchive, HiArrowSmRight, HiCheckCircle, HiMailOpen
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
 */
const ConvoItem = ({ c, isActive, user, onClick, onPin, onMute, onArchive, onMarkUnread }) => {
    const peer = c.participants?.find(p => p._id !== user?._id)
    const lastMsg = c.lastMessage
    const isUnread = c.unreadCount > 0 || c.isMarkedUnread

    return (
        <div 
            onClick={onClick}
            className={`zn-convo-row group ${isActive ? 'active' : ''} ${c.isArchived ? 'opacity-50' : ''}`}
        >
            <div className="relative flex-shrink-0">
                <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} className="zn-convo-avatar" alt="" />
                {peer?.isOnline && <div className="zn-online-dot" />}
            </div>
            <div className="flex-1 min-w-0 pr-12">
                <div className="flex justify-between items-center mb-0.5">
                    <span className="zn-convo-name truncate">{peer?.username}</span>
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
                {isUnread && <div className="w-2 h-2 rounded-full bg-zn-accent" />}
            </div>

            {/* Hover Actions */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onPin() }} className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white" title="Pin Chat">
                    <HiBookmark size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onMarkUnread() }} className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white" title="Mark as Unread">
                    <HiMailOpen size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onArchive() }} className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white" title="Archive Chat">
                    <HiArchive size={14} />
                </button>
            </div>
        </div>
    )
}

/**
 * MESSAGE BUBBLE COMPONENT
 */
const MessageBubble = ({ m, isSelf, onReply, onEdit, onDelete, onReact, onForward }) => {
    const reactions = m.reactions || []
    const quickEmojis = ['❤️', '😂', '🔥', '👍', '😢', '😮']

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className={`zn-row ${isSelf ? 'self' : 'peer'}`}
        >
            <div className="zn-bubble-container group">
                {/* Reply Context */}
                {m.replyTo && (
                    <div className="zn-bubble-reply">
                        <div className="font-bold opacity-60">Replying to</div>
                        <div className="truncate">{m.replyTo.body || 'Media'}</div>
                    </div>
                )}

                <div className="zn-bubble">
                    {m.body}
                    
                    {/* Timestamp & Status */}
                    <div className={`flex items-center gap-1 mt-1 text-[9px] font-bold opacity-40 ${isSelf ? 'justify-end' : ''}`}>
                        {formatTime(m.createdAt)}
                        {isSelf && (m.isSeen ? <span className="text-zn-accent">Seen</span> : <span>Sent</span>)}
                    </div>

                    {/* Reactions Display */}
                    {reactions.length > 0 && (
                        <div className="zn-reactions">
                            {reactions.map(r => (
                                <div key={r.emoji} className={`zn-reaction-chip ${r.me ? 'active' : ''}`} onClick={() => onReact(r.emoji)}>
                                    <span>{r.emoji}</span>
                                    {r.count > 1 && <span>{r.count}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bubble Actions Menu */}
                <div className={`absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isSelf ? 'right-full mr-2' : 'left-full ml-2'}`}>
                    <div className="flex bg-[#121214] border border-white/5 rounded-xl p-1 shadow-2xl">
                        <button onClick={() => onReply(m)} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white" title="Reply">
                            <HiReply size={16} />
                        </button>
                        <button onClick={() => onForward(m)} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white" title="Forward">
                            <HiArrowSmRight size={16} />
                        </button>
                        {isSelf && (
                            <>
                                <button onClick={() => onEdit(m)} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white" title="Edit">
                                    <HiPencil size={16} />
                                </button>
                                <button onClick={() => onDelete(m._id)} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-red-500/50 hover:text-red-500" title="Delete">
                                    <HiTrash size={16} />
                                </button>
                            </>
                        )}
                        <div className="w-[1px] h-4 bg-white/5 my-auto mx-1" />
                        <div className="flex">
                            {quickEmojis.slice(0, 3).map(e => (
                                <button key={e} onClick={() => onReact(e)} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-sm">{e}</button>
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
 */
export default function Messages() {
    const { convoId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    
    // Data Fetching
    const { 
        data: convos = [], 
        isLoading: loadingConvos, 
        isError: errorConvos,
        refetch: refetchConvos
    } = useConvos()
    const { data: messages = [], isLoading: loadingMsgs } = useMessages(convoId)
    
    // UI Logic
    const [searchQuery, setSearchQuery] = useState('')
    const [replyingTo, setReplyingTo] = useState(null)
    const [isSearchingInChat, setIsSearchingInChat] = useState(false)
    const [chatSearchQuery, setChatSearchQuery] = useState('')
    const fileInputRef = useRef(null)

    // Chat Hooks
    const { getDraft, setDraft } = useChatState(convoId)
    const sendMutation = useSendMessage(convoId)
    const { react: reactMutation, edit: editMutation, remove: deleteMutation } = useMessageActions(convoId)
    const { pin: pinMutation, mute: muteMutation, archive: archiveMutation } = useConvoActions()

    const [inputText, setInputText] = useState(getDraft() || '')
    const [editingId, setEditingId] = useState(null)
    const [editingText, setEditingText] = useState('')
    const viewportRef = useRef(null)

    // Derived State
    const activeConvo = convos.find(c => c._id === convoId)
    const peer = activeConvo?.participants?.find(p => p._id !== user?._id)
    
    const filteredConvos = useMemo(() => {
        return convos
            .filter(c => {
                const p = c.participants?.find(p => p._id !== user?._id)
                return p?.username?.toLowerCase().includes(searchQuery.toLowerCase())
            })
            .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
    }, [convos, searchQuery, user?._id])

    const filteredMessages = useMemo(() => {
        if (!chatSearchQuery.trim()) return messages
        return messages.filter(m => m.body?.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    }, [messages, chatSearchQuery])

    // Side Effects
    useEffect(() => { if (viewportRef.current) viewportRef.current.scrollTop = viewportRef.current.scrollHeight }, [messages])
    useEffect(() => { setInputText(getDraft() || '') }, [convoId, getDraft])
    useEffect(() => { setDraft(inputText) }, [inputText, setDraft])
    useEffect(() => { if (convoId) localStorage.setItem('zn_last_convo_id', convoId) }, [convoId])

    // Event Handlers
    const handleSend = async () => {
        if (!inputText.trim() && !replyingTo) return
        const body = inputText
        const replyId = replyingTo?._id
        setInputText('')
        setReplyingTo(null)
        try { await sendMutation.mutateAsync({ text: body, replyToId: replyId }) } catch { toast.error('Failed to send') }
    }

    const onReact = (messageId, emoji) => reactMutation.mutate({ messageId, emoji })

    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (file) toast.success(`Selected: ${file.name} (Ready to upload)`)
    }

    return (
        <div className="zn-messages-root">
            {/* 1. SIDEBAR */}
            <aside className="zn-messages-sidebar">
                <div className="zn-sidebar-header">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-black tracking-tighter">Messages</h1>
                        <button className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white">
                            <HiPencilAlt size={20} />
                        </button>
                    </div>
                    <div className="relative group">
                        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-zn-accent transition-colors" size={18} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="zn-sidebar-search w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-bold placeholder:text-zinc-600 outline-none focus:border-zn-accent/50 focus:bg-white/10 focus:ring-4 focus:ring-zn-accent/5 transition-all" 
                            placeholder="Search conversations..." 
                        />
                    </div>
                </div>

                <div className="zn-sidebar-scroll no-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {loadingConvos ? (
                            <motion.div 
                                key="skeleton"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="p-4 space-y-4"
                            >
                                {[1,2,3,4,5,6].map(id => (
                                    <div key={id} className="flex gap-3">
                                        <div className="w-12 h-12 rounded-2xl zn-shimmer" />
                                        <div className="flex-1 py-1 space-y-2">
                                            <div className="h-3 zn-shimmer w-24 rounded-full" />
                                            <div className="h-2 zn-shimmer w-40 rounded-full opacity-60" />
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        ) : filteredConvos.length > 0 ? (
                            <motion.div 
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: { transition: { staggerChildren: 0.05 } }
                                }}
                                className="pb-4"
                            >
                                {filteredConvos.map(c => (
                                    <motion.div
                                        key={c._id}
                                        variants={{
                                            hidden: { opacity: 0, x: -10 },
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
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-12 text-center"
                            >
                                <div className="w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center mx-auto mb-4 opacity-40">
                                    <HiBookmark size={32} className="text-zinc-500" />
                                </div>
                                <p className="text-zinc-600 font-bold text-sm">No conversations found</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </aside>

            {/* 2. CHAT MAIN */}
            <main className="zn-chat-main">
                {convoId ? (
                    <motion.div 
                        key={convoId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="zn-page-transition"
                    >
                        <header className="zn-chat-header">
                            <div className="flex items-center gap-4">
                                <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} className="w-10 h-10 rounded-xl object-cover border border-white/5" alt="" />
                                <div>
                                    <h2 className="text-sm font-black text-white">{peer?.username}</h2>
                                    <p className="text-[10px] font-bold text-zn-accent flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-zn-accent animate-pulse" />
                                        Online Now
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsSearchingInChat(!isSearchingInChat)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSearchingInChat ? 'bg-zn-accent text-white' : 'text-zinc-400 hover:text-white'}`}>
                                    <HiSearch size={20} />
                                </button>
                                <button className="w-10 h-10 rounded-xl text-zinc-400 hover:text-white flex items-center justify-center">
                                    <HiDotsVertical size={20} />
                                </button>
                            </div>
                        </header>

                        <AnimatePresence>
                            {isSearchingInChat && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="zn-search-inline">
                                    <HiSearch className="text-zinc-500" size={18} />
                                    <input autoFocus value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} placeholder="Search in conversation..." className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-white placeholder:text-zinc-600" />
                                    <button onClick={() => { setIsSearchingInChat(false); setChatSearchQuery('') }}><HiX size={18} className="text-zinc-500" /></button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div ref={viewportRef} className="zn-viewport no-scrollbar">
                            <AnimatePresence mode="popLayout" initial={false}>
                                {loadingMsgs ? (
                                    <motion.div 
                                        key="chat-skeleton"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-6"
                                    >
                                        {[1,2,3,4].map(id => (
                                            <div key={id} className={`flex flex-col ${id % 2 === 0 ? 'items-end' : 'items-start'}`}>
                                                <div className={`h-12 zn-shimmer rounded-2xl mb-2 ${id % 2 === 0 ? 'w-48' : 'w-64'}`} />
                                                <div className="h-2 zn-shimmer w-12 rounded-full opacity-40" />
                                            </div>
                                        ))}
                                    </motion.div>
                                ) : filteredMessages.length > 0 ? (
                                    filteredMessages.map((m) => (
                                        <MessageBubble 
                                            key={m._id} m={m} 
                                            isSelf={m.sender?._id === user?._id || m.sender === user?._id} 
                                            onReply={setReplyingTo}
                                            onForward={() => toast.success('Select chat to forward')}
                                            onEdit={(msg) => { setEditingId(msg._id); setEditingText(msg.body) }}
                                            onDelete={deleteMutation.mutate}
                                            onReact={(emoji) => onReact(m._id, emoji)}
                                        />
                                    ))
                                ) : chatSearchQuery ? (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex items-center justify-center text-zinc-500 font-bold text-sm">
                                        No messages match your search
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>
                        </div>

                        <footer className="zn-footer">
                            <div className="max-w-4xl mx-auto">
                                <AnimatePresence>
                                    {replyingTo && (
                                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="zn-reply-preview">
                                            <div className="zn-reply-line" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-zn-accent uppercase tracking-widest mb-0.5">Replying to {replyingTo.sender?.username || 'User'}</p>
                                                <p className="text-xs text-zinc-400 truncate font-medium">{replyingTo.body}</p>
                                            </div>
                                            <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-white"><HiX size={18} /></button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="zn-composer-pill">
                                    <button className="text-zinc-500 hover:text-white"><HiEmojiHappy size={22} /></button>
                                    <button onClick={() => fileInputRef.current?.click()} className="text-zinc-500 hover:text-white"><HiPaperClip size={22} /></button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                    <input 
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                        className="zn-composer-input" 
                                        placeholder="Type a message..." 
                                        autoFocus
                                    />
                                    <button className="text-zinc-500 hover:text-white"><HiMicrophone size={22} /></button>
                                    <button onClick={handleSend} className="zn-send-btn"><HiArrowRight size={20} /></button>
                                </div>
                            </div>
                        </footer>
                    </motion.div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
                        {/* Animated Background Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-zn-accent/5 blur-[120px] rounded-full pointer-events-none" />
                        
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative z-10"
                        >
                            <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center mb-8 mx-auto shadow-2xl">
                                <HiMailOpen size={40} className="text-zn-accent" />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-3 tracking-tighter">Your Messages</h2>
                            <p className="text-zinc-500 font-bold max-w-xs mx-auto leading-relaxed">
                                Connect with your network instantly. Select a chat to start the conversation.
                            </p>
                        </motion.div>
                    </div>
                )}
            </main>

            {/* Editing Overlay Modal */}
            <AnimatePresence>
                {editingId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-lg bg-[#121214] border border-white/10 rounded-3xl p-8 shadow-2xl">
                            <h3 className="text-lg font-black text-white mb-6">Edit Message</h3>
                            <textarea 
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white outline-none focus:border-zn-accent/30 min-h-[120px] mb-6"
                            />
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setEditingId(null)} className="px-6 py-2.5 rounded-xl font-bold text-zinc-400 hover:text-white">Cancel</button>
                                <button 
                                    onClick={async () => {
                                        try {
                                            await editMutation.mutateAsync({ messageId: editingId, text: editingText })
                                            setEditingId(null)
                                            toast.success('Updated')
                                        } catch { toast.error('Failed') }
                                    }}
                                    className="px-8 py-2.5 bg-zn-accent rounded-xl font-bold text-white"
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
