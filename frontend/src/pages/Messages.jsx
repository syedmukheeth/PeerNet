import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiSearch, HiPencilAlt, HiChevronDown, 
    HiChatAlt2, HiEmojiHappy, HiPhotograph, 
    HiArrowLeft, HiPlusCircle, HiDotsHorizontal,
    HiTrash, HiPencil
} from 'react-icons/hi'
import { useAuth } from '../context/AuthContext'
import { chatApi } from '../api/axios'
import { timeago } from '../utils/timeago'
import { 
    useConvos, 
    useMessages, 
    useChatState, 
    useSendMessage,
    useEditMessage,
    useDeleteMessage
} from '../hooks/useChat'
import toast from 'react-hot-toast'

/* -------------------------------------------------------------------------
   SUB-COMPONENT: CONVERSATION ITEM (SIDEBAR)
   ------------------------------------------------------------------------- */
const ConvoItem = React.memo(({ c, isActive, user, onClick }) => {
    const peer = c.participants?.find(p => p._id !== user?._id)
    
    return (
        <div 
            className={`zn-convo-row ${isActive ? 'active' : ''}`}
            onClick={onClick}
        >
            <div className="relative shrink-0">
                <div className="zn-avatar-wrap">
                    <img 
                        src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=18181b&color=7c3aed`} 
                        className="w-full h-full object-cover" 
                        alt="" 
                    />
                </div>
                {c.isOnline && <div className="zn-online-dot" />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="zn-convo-name truncate">
                        {peer?.username || 'User'}
                    </h4>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                        {timeago(c.lastMessage?.createdAt || c.updatedAt)}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <p className={`zn-convo-msg truncate ${c.unreadCount > 0 ? 'unread' : ''}`}>
                        {c.lastMessage?.body || 'Sent an attachment'}
                    </p>
                    {c.unreadCount > 0 && (
                        <div className="w-5 h-5 rounded-full bg-zn-accent flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-zn-accent/30">
                            {c.unreadCount}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
})

/* -------------------------------------------------------------------------
   SUB-COMPONENT: MESSAGE BUBBLE
   ------------------------------------------------------------------------- */
const MessageBubble = React.memo(({ 
    m, isSelf, groupClass, 
    isEditing, editingText, setEditingText, 
    onStartEdit, onSaveEdit, onDelete, onEditKeyPress 
}) => {
    const [showMenu, setShowMenu] = useState(false)
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`zn-row ${isSelf ? 'self' : 'peer'} ${groupClass} group`}
            onMouseEnter={() => setShowMenu(true)}
            onMouseLeave={() => setShowMenu(false)}
        >
            <div className="relative flex items-center gap-3">
                {/* ACTIONS MENU (Contextual) */}
                {isSelf && showMenu && !isEditing && (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-1 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl px-1.5 py-1 shadow-2xl z-10"
                    >
                        <button onClick={() => onStartEdit(m)} className="p-1.5 text-zinc-400 hover:text-white transition-colors">
                            <HiPencil size={14} />
                        </button>
                        <button onClick={() => onDelete(m._id)} className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors">
                            <HiTrash size={14} />
                        </button>
                    </motion.div>
                )}

                <div className="zn-bubble-container">
                    <div className="zn-bubble shadow-sm">
                        {isEditing ? (
                            <input 
                                autoFocus
                                className="bg-transparent border-none outline-none text-white w-full font-medium"
                                value={editingText}
                                onChange={e => setEditingText(e.target.value)}
                                onKeyDown={onEditKeyPress}
                                onBlur={() => onStartEdit(null)}
                            />
                        ) : (
                            <>
                                {m.body}
                                {m.isEdited && (
                                    <span className="text-[8px] opacity-30 ml-2 font-black uppercase tracking-widest italic">(edited)</span>
                                )}
                            </>
                        )}
                    </div>
                    
                    <span className="zn-meta flex items-center gap-1.5 mt-1">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isSelf && <div className="w-1.5 h-1.5 rounded-full bg-zn-accent/40" />}
                    </span>
                </div>
            </div>
        </motion.div>
    )
})

/* -------------------------------------------------------------------------
   MAIN PAGE: ZENITH MESSAGES
   ------------------------------------------------------------------------- */
export default function Messages() {
    const { id: convoId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    
    const { data: convos = [], isLoading: loadingConvos } = useConvos()
    const { data: messages = [], isLoading: loadingMsgs } = useMessages(convoId)
    const { getDraft, setDraft } = useChatState(convoId)
    
    const sendMutation = useSendMessage(convoId)
    const editMutation = useEditMessage(convoId)
    const deleteMutation = useDeleteMessage(convoId)

    const [inputText, setInputText] = useState(getDraft() || '')
    const [editingId, setEditingId] = useState(null)
    const [editingText, setEditingText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const viewportRef = useRef(null)

    // Scroll to bottom on messages change
    useEffect(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTop = viewportRef.current.scrollHeight
        }
    }, [messages])

    // Persistence & Drafts
    useEffect(() => { setInputText(getDraft() || '') }, [convoId])
    useEffect(() => { setDraft(inputText) }, [inputText])
    useEffect(() => { if (convoId) localStorage.setItem('zn_last_convo_id', convoId) }, [convoId])

    // Auto-Navigation
    useEffect(() => {
        if (!convoId && convos.length > 0 && window.innerWidth > 1024) {
            const lastId = localStorage.getItem('zn_last_convo_id')
            const targetId = convos.find(c => c._id === lastId) ? lastId : convos[0]._id
            navigate(`/messages/${targetId}`, { replace: true })
        }
    }, [convoId, convos, navigate])

    const handleSendMessage = async (e) => {
        e?.preventDefault()
        if (!inputText.trim() || sendMutation.isPending) return
        const text = inputText
        setInputText('')
        try { await sendMutation.mutateAsync(text) } catch (e) { toast.error('Failed to send') }
    }

    const onStartEdit = (m) => {
        if (!m) { setEditingId(null); return }
        setEditingId(m._id)
        setEditingText(m.body)
    }

    const onSaveEdit = async () => {
        if (!editingText.trim() || editMutation.isPending) return
        const id = editingId
        setEditingId(null)
        try {
            await editMutation.mutateAsync({ messageId: id, text: editingText })
            toast.success('Updated')
        } catch (e) { toast.error('Failed'); setEditingId(id) }
    }

    const onDeleteMessage = async (id) => {
        if (!window.confirm('Delete message?')) return
        try { await deleteMutation.mutateAsync(id); toast.success('Deleted') } 
        catch (e) { toast.error('Failed') }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) handleSendMessage(e)
    }

    const handleEditKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) onSaveEdit()
        else if (e.key === 'Escape') setEditingId(null)
    }

    const getGroupClass = (i) => {
        if (!Array.isArray(messages)) return ''
        const m = messages[i], p = messages[i-1], n = messages[i+1]
        const isM = (a, b) => {
            if (!a || !b) return false
            const aid = typeof a.sender === 'object' ? a.sender?._id : a.sender
            const bid = typeof b.sender === 'object' ? b.sender?._id : b.sender
            return aid === bid
        }
        const samePrev = isM(m, p), sameNext = isM(m, n)
        if (samePrev && sameNext) return 'msg-middle'
        if (samePrev) return 'msg-bottom'
        if (sameNext) return 'msg-top'
        return ''
    }

    const activeConvo = convos.find(c => c._id === convoId)
    const peer = activeConvo?.participants?.find(p => p._id !== user?._id)

    return (
        <div className="zn-messages-root">
            {/* 1. SIDEBAR */}
            <aside className="zn-messages-sidebar">
                <div className="zn-sidebar-header">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-black tracking-tighter">Messages</h1>
                        <button className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all">
                            <HiPencilAlt size={20} />
                        </button>
                    </div>
                    <div className="relative group">
                        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-zn-accent transition-colors" size={18} />
                        <input className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold placeholder:text-zinc-600 outline-none focus:border-zn-accent/30 focus:bg-white/10 transition-all" placeholder="Search conversations" />
                    </div>
                </div>

                <div className="zn-sidebar-scroll no-scrollbar">
                    {loadingConvos ? (
                        <div className="p-4 space-y-4">
                            {[1,2,3,4,5].map(i => (
                                <div key={i} className="flex gap-3 animate-pulse">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5" />
                                    <div className="flex-1 py-1 space-y-2">
                                        <div className="h-2.5 bg-white/5 w-24 rounded" />
                                        <div className="h-2 bg-white/5 w-40 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : convos.length > 0 ? (
                        convos.map(c => <ConvoItem key={c._id} c={c} isActive={convoId === c._id} user={user} onClick={() => navigate(`/messages/${c._id}`)} />)
                    ) : (
                        <div className="p-12 text-center text-zinc-600 font-bold text-sm">No messages yet</div>
                    )}
                </div>
            </aside>

            {/* 2. CHAT AREA */}
            <main className="zn-chat-main">
                {convoId ? (
                    <>
                        <header className="zn-chat-header">
                            <div className="flex items-center gap-3">
                                <button onClick={() => navigate('/messages')} className="lg:hidden p-2 text-zinc-400">
                                    <HiArrowLeft size={20} />
                                </button>
                                <div className="relative">
                                    <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=18181b&color=7c3aed`} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt="" />
                                    {activeConvo?.isOnline && <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full" />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white leading-none mb-1">{peer?.username || 'Chat'}</h3>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">{activeConvo?.isOnline ? 'Active Now' : 'Offline'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button className="p-2.5 text-zinc-400 hover:text-white transition-colors"><HiDotsHorizontal size={20} /></button>
                            </div>
                        </header>

                        <div ref={viewportRef} className="zn-viewport no-scrollbar">
                            {loadingMsgs ? (
                                <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-zn-accent border-t-transparent rounded-full animate-spin" /></div>
                            ) : (
                                <>
                                    <div className="flex-1" />
                                    <div className="flex flex-col items-center py-12 mb-8 opacity-50">
                                        <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=18181b&color=7c3aed`} className="w-20 h-20 rounded-[28px] mb-4 border border-white/10" alt="" />
                                        <h2 className="text-2xl font-black tracking-tighter text-white">{peer?.username}</h2>
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[3px] mt-1">PeerNet Verified</p>
                                    </div>

                                    {messages.map((m, i) => {
                                        const day = formatDate(m.createdAt)
                                        const prevDay = i > 0 ? formatDate(messages[i-1].createdAt) : null
                                        const senderId = typeof m.sender === 'object' ? m.sender?._id : m.sender
                                        const isSelf = senderId === user?._id
                                        
                                        return (
                                            <React.Fragment key={m._id || i}>
                                                {day !== prevDay && <div className="zn-day"><span>{day}</span></div>}
                                                <MessageBubble 
                                                    m={m} isSelf={isSelf} groupClass={getGroupClass(i)}
                                                    isEditing={editingId === m._id} editingText={editingText}
                                                    setEditingText={setEditingText} onStartEdit={onStartEdit}
                                                    onSaveEdit={onSaveEdit} onDelete={onDeleteMessage}
                                                    onEditKeyPress={handleEditKeyPress}
                                                />
                                            </React.Fragment>
                                        )
                                    })}
                                    {isTyping && (
                                        <div className="flex gap-2 items-center text-zinc-600 text-[10px] font-black uppercase tracking-widest mt-2 ml-2 animate-pulse">
                                            <div className="flex gap-1">
                                                <div className="w-1 h-1 rounded-full bg-zinc-600 animate-bounce" />
                                                <div className="w-1 h-1 rounded-full bg-zinc-600 animate-bounce [animation-delay:0.2s]" />
                                                <div className="w-1 h-1 rounded-full bg-zinc-600 animate-bounce [animation-delay:0.4s]" />
                                            </div>
                                            Typing
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <footer className="zn-footer">
                            <div className="zn-composer-pill shadow-2xl">
                                <div className="flex items-center gap-3">
                                    <HiPhotograph size={22} className="text-zinc-600 hover:text-white cursor-pointer transition-colors" />
                                    <HiEmojiHappy size={22} className="text-zinc-600 hover:text-white cursor-pointer transition-colors" />
                                </div>
                                <input 
                                    className="zn-composer-input" 
                                    placeholder="Type a message..." 
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                />
                                <button 
                                    className={`zn-send-btn ${!inputText.trim() ? 'opacity-20 scale-90 grayscale' : 'opacity-100 shadow-xl shadow-zn-accent/40'}`}
                                    onClick={handleSendMessage}
                                    disabled={!inputText.trim() || sendMutation.isPending}
                                >
                                    <HiChatAlt2 size={18} />
                                </button>
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-black">
                        <div className="w-24 h-24 rounded-[32px] bg-zinc-900 flex items-center justify-center mb-8 border border-white/5 shadow-2xl">
                            <HiChatAlt2 size={48} className="text-zn-accent" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tighter mb-4">Zenith Messaging</h2>
                        <p className="text-zinc-500 max-w-[320px] font-medium leading-relaxed mb-10">
                            Select a conversation from the sidebar to start collaborating with your network.
                        </p>
                        <button className="px-10 py-3.5 bg-zn-accent text-white font-black rounded-2xl shadow-xl shadow-zn-accent/20 hover:scale-105 active:scale-95 transition-all">
                            NEW CONVERSATION
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}

function formatDate(date) {
    const d = new Date(date)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return 'Today'
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'long', day: 'numeric' })
}
