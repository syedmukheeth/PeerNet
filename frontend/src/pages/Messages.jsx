import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
    HiDotsVertical, HiPaperClip, HiEmojiHappy, 
    HiReply, HiPencil, HiTrash, HiSearch,
    HiX, HiChevronDown, HiArrowRight, HiVolumeUp, HiVolumeOff, 
    HiBookmark, HiArchive, HiArrowSmRight, HiCheckCircle, HiMail, HiLightningBolt, HiArrowLeft
} from 'react-icons/hi'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

import { 
    useConvos, useMessages, useSendMessage, 
    useMessageActions, useConvoActions, useChatState, useMarkRead 
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
                    className="zn-convo-avatar rounded-full" 
                    alt={peer?.username} 
                />
                {peer?.isOnline && <div className="zn-online-dot border-2 border-bg" />}
            </div>
            <div className="flex-1 min-w-0 pr-2">
                <div className="flex justify-between items-center mb-0.5">
                    <span className={`zn-convo-name truncate ${isUnread ? 'font-bold' : 'font-medium'}`}>{peer?.username || 'Unknown User'}</span>
                    <span className="text-[11px] text-zinc-500">{formatTime(c.updatedAt)}</span>
                </div>
                <div className="zn-convo-msg-row">
                    <p className={`zn-convo-msg truncate ${isUnread ? 'text-text-1 font-semibold' : 'text-text-2'}`}>
                        {lastMsg?.sender === user?._id ? 'You: ' : ''}
                        {lastMsg?.body || 'Started a conversation'}
                    </p>
                </div>
            </div>

            {isUnread && (
                <div className="flex-shrink-0 ml-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                </div>
            )}
        </motion.div>
    )
}

/**
 * MESSAGE BUBBLE COMPONENT
 * Premium bubble with actions, reactions, and reply context
 */
const MessageBubble = ({ m, isSelf, onReply, onEdit, onDelete, onReact, onForward, searchQuery, pos, isNewGroup }) => {
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
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className={`zn-row ${isSelf ? 'self' : 'peer'} pos-${pos} ${isNewGroup ? 'new-group' : ''} ${reactions.length > 0 ? 'has-reactions' : ''}`}
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
                    <div className={`zn-bubble-meta ${isSelf ? 'self' : 'peer'}`}>
                        <span>{formatTime(m.createdAt)}</span>
                        {isSelf && (
                            m.isSeen ? (
                                <div className="flex -space-x-1 text-white">
                                    <HiCheckCircle size={10} className="opacity-40" />
                                    <HiCheckCircle size={10} className="opacity-80" />
                                </div>
                            ) : (
                                <HiCheckCircle size={10} className="opacity-40" />
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

                {/* Bubble Actions Menu - Semantic & Premium */}
                <div className="zn-bubble-actions">
                    <div className="zn-action-bar">
                        <button onClick={() => onReply(m)} className="zn-action-btn" title="Reply">
                            <HiReply size={16} />
                        </button>
                        <button onClick={() => onForward(m)} className="zn-action-btn" title="Forward">
                            <HiArrowSmRight size={16} />
                        </button>
                        <button onClick={() => onDelete(m._id)} className="zn-action-btn delete" title="Delete">
                            <HiTrash size={16} />
                        </button>
                        
                        <div className="zn-action-divider" />
                        
                        <div className="flex items-center gap-0.5 px-1">
                            {quickEmojis.slice(0, 3).map(e => (
                                <button 
                                    key={e} 
                                    onClick={() => onReact(e)} 
                                    className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-sm transition-all hover:scale-125 active:scale-150"
                                >
                                    {e}
                                </button>
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
    const markReadMutation = useMarkRead(convoId)



    // Derived Data
    const activeConvo = useMemo(() => convos.find(c => c._id === convoId), [convos, convoId])

    // Mark messages as read when convo opens or new messages arrive
    useEffect(() => {
        if (convoId && messages.length > 0) {
            const hasUnread = activeConvo?.unreadCount > 0 || activeConvo?.isMarkedUnread
            if (hasUnread) {
                markReadMutation.mutate()
            }
        }
    }, [convoId, messages.length, activeConvo?.unreadCount, activeConvo?.isMarkedUnread])
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

    // Group messages by date and sequence
    const groupedMessages = useMemo(() => {
        const groups = []
        let lastDate = ''
        
        filteredMessages.forEach((m, idx) => {
            const date = new Date(m.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
            if (date !== lastDate) {
                groups.push({ type: 'date', value: date, id: `date-${date}` })
                lastDate = date
            }
            
            // Determine position in sequence for grouping UI
            const prev = filteredMessages[idx - 1]
            const next = filteredMessages[idx + 1]
            const senderId = m.sender?._id || m.sender
            
            const isSameAsPrev = prev && (prev.sender?._id || prev.sender) === senderId
            const isSameAsNext = next && (next.sender?._id || next.sender) === senderId
            
            // Also check time gap (e.g. if > 15 mins, start a new group)
            const prevTime = prev ? new Date(prev.createdAt).getTime() : 0
            const currTime = new Date(m.createdAt).getTime()
            const isTimeGap = (currTime - prevTime) > 15 * 60 * 1000

            let pos = 'single'
            if (isSameAsPrev && isSameAsNext && !isTimeGap) pos = 'middle'
            else if (isSameAsPrev && !isTimeGap) pos = 'bottom'
            else if (isSameAsNext) pos = 'top'
            
            groups.push({ 
                type: 'message', 
                value: m, 
                id: m._id, 
                pos, 
                isNewGroup: !isSameAsPrev || isTimeGap 
            })
        })
        return groups
    }, [filteredMessages])

    // Handlers
    const scrollToBottom = useCallback((instant = false) => {
        if (viewportRef.current) {
            viewportRef.current.scrollTo({
                top: viewportRef.current.scrollHeight,
                behavior: instant ? 'instant' : 'smooth'
            })
        }
    }, [])

    // Scroll when messages change or loading completes
    useEffect(() => { 
        if (!loadingMsgs) {
            scrollToBottom(messages.length <= (prevMsgCount.current || 0))
            prevMsgCount.current = messages.length
        }
    }, [messages, loadingMsgs, scrollToBottom])

    const prevMsgCount = useRef(messages.length)

    // Scroll to bottom instantly when switching conversations
    useEffect(() => {
        if (convoId && !loadingMsgs) {
            const timer = setTimeout(() => scrollToBottom(true), 100)
            return () => clearTimeout(timer)
        }
    }, [convoId, loadingMsgs, scrollToBottom])
    
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
            <aside className={`zn-messages-sidebar ${convoId ? 'hidden-mobile' : ''}`}>
                <div className="zn-sidebar-header">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-xl font-bold tracking-tight text-text-1">Messages</h1>
                    </div>
                    <div className="zn-sidebar-search-wrapper flex items-center gap-3 bg-surface-el border border-white/5 rounded-full px-4 py-2.5 group-focus-within:border-accent/30 transition-all">
                        <HiSearch className="text-text-3 group-focus-within:text-accent transition-colors shrink-0" size={18} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent border-none outline-none text-sm font-medium placeholder:text-text-3 transition-all" 
                            placeholder="Search" 
                        />
                    </div>
                </div>

                <div className="zn-sidebar-scroll no-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {loadingConvos ? (
                            <div key="skeleton" className="p-4 space-y-4">
                                {[1,2,3,4,5,6].map(id => (
                                    <div key={id} className="flex gap-4 items-center">
                                        <div className="skeleton w-14 h-14 rounded-2xl shrink-0" />
                                        <div className="flex-1 space-y-2.5">
                                            <div className="skeleton skeleton-text h-4 w-32 !mb-0" />
                                            <div className="skeleton skeleton-text h-2.5 w-48 opacity-40 !mb-0" />
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                <AnimatePresence>
                    {convoId ? (
                        <motion.div 
                            key={`chat-${convoId}`}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="zn-page-transition h-full flex flex-col"
                        >
                            <header className="zn-chat-header px-6 border-b border-white/5 bg-black/20 backdrop-blur-2xl z-30">
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => navigate('/messages')}
                                        className="lg:hidden p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-white"
                                    >
                                        <HiArrowLeft size={20} />
                                    </button>
                                    <div className="relative group cursor-pointer">
                                        <img 
                                            src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} 
                                            className="w-10 h-10 rounded-2xl object-cover border border-white/5 shadow-2xl transition-transform group-hover:scale-105" 
                                            alt="" 
                                        />
                                        {peer?.isOnline && (
                                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-4 border-[#050505] rounded-full" />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-white tracking-tight leading-none mb-1">{peer?.username || 'Chatting...'}</h2>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${peer?.isOnline ? 'bg-green-500' : 'bg-zinc-600'}`} />
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                {peer?.isOnline ? 'Online' : 'Offline'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => { setIsSearchingInChat(!isSearchingInChat); if (!isSearchingInChat) setChatSearchQuery('') }} 
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSearchingInChat ? 'bg-accent/10 text-accent' : 'text-zinc-400 hover:bg-white/5'}`}
                                    >
                                        <HiSearch size={20} />
                                    </button>
                                    <button className="w-10 h-10 rounded-xl text-zinc-400 hover:bg-white/5 flex items-center justify-center transition-all">
                                        <HiDotsVertical size={20} />
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

                            <div ref={viewportRef} className="zn-viewport scroll-gpu">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {loadingMsgs ? (
                                        <div key="chat-skeleton" className="space-y-8 px-6">
                                            {[1,2,3,4].map(id => (
                                                <div key={id} className={`zn-row ${id % 2 === 0 ? 'self' : 'peer'} flex flex-col`}>
                                                    <div className="zn-bubble-container flex flex-col">
                                                        <div className={`skeleton h-14 rounded-[24px] mb-2 ${id % 2 === 0 ? 'w-56' : 'w-72'}`} />
                                                        <div className="skeleton skeleton-text h-2.5 w-16 opacity-30 !mb-0" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
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
                                                    isSelf={
                                                        item.value.sender === 'me' || 
                                                        item.value.sender?._id === user?._id || 
                                                        item.value.sender === user?._id
                                                    } 
                                                    pos={item.pos}
                                                    isNewGroup={item.isNewGroup}
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

                            <footer className="zn-footer">
                                <div className="zn-composer-wrapper">
                                    <div className="zn-composer-pill">
                                        <button className="zn-composer-action-btn">
                                            <HiEmojiHappy size={22} />
                                        </button>
                                        <button className="zn-composer-action-btn" onClick={() => fileInputRef.current?.click()}>
                                            <HiPaperClip size={22} />
                                        </button>
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} hidden />
                                        
                                        <textarea 
                                            rows="1"
                                            value={inputText}
                                            onChange={(e) => {
                                                setInputText(e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend();
                                                    e.target.style.height = 'auto';
                                                }
                                            }}
                                            placeholder={`Message ${peer?.username || '...'}`}
                                            className="zn-composer-input resize-none max-h-40"
                                        />
                                        
                                        <div className="flex items-center gap-1 self-end mb-1">

                                            <button 
                                                disabled={!inputText.trim() && !replyingTo}
                                                onClick={() => {
                                                    handleSend();
                                                    const ta = document.querySelector('.zn-composer-input');
                                                    if (ta) ta.style.height = 'auto';
                                                }}
                                                className="zn-send-btn"
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
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden h-full bg-surface"
                        >
                            <motion.div 
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                transition={{ type: 'spring', delay: 0.1 }}
                                className="relative z-10"
                            >
                                <div className="w-24 h-24 rounded-full bg-surface-1 border border-border flex items-center justify-center mb-8 mx-auto shadow-xl">
                                    <HiMail size={40} className="text-accent" />
                                </div>
                                <h2 className="text-3xl font-bold text-text-1 mb-3 tracking-tight">Your Messages</h2>
                                <p className="text-text-2 font-medium max-w-xs mx-auto leading-relaxed text-sm">
                                    Send private photos and messages to a friend or group.
                                </p>
                                
                                <div className="mt-8 flex flex-wrap justify-center gap-3">
                                    <button className="px-6 py-2.5 bg-accent rounded-lg text-sm font-bold text-white shadow-lg transition-all active:scale-95">Send Message</button>
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
