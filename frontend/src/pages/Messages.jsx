import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiSearch, HiPencilAlt, HiChevronDown, HiPhone, 
    HiVideoCamera, HiInformationCircle, HiChatAlt2,
    HiEmojiHappy, HiPhotograph, HiLogout, HiCog, HiHome, HiBell, HiPlusCircle, HiArrowLeft,
    HiDotsHorizontal, HiMicrophone, HiPaperClip, HiPaperAirplane
} from 'react-icons/hi'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import timeago from '../utils/timeago'

/* -------------------------------------------------------------------------
   SKELETONS (Discord Style)
   ------------------------------------------------------------------------- */
const SkeletonRow = () => (
    <div className="flex items-center gap-3 px-6 py-4">
        <div className="w-14 h-14 rounded-full skeleton shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded skeleton" />
            <div className="h-3 w-40 rounded skeleton opacity-40" />
        </div>
    </div>
)

/* -------------------------------------------------------------------------
   COMPONENTS: RE-ENGINEERED BUBBLE
   ------------------------------------------------------------------------- */
const MessageBubble = React.memo(({ m, isSelf, groupClass }) => (
    <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`ms-row ${isSelf ? 'self' : 'peer'} ${groupClass}`}
    >
        <div className="ms-bubble">
            {m.body}
        </div>
        <span className="ms-time px-2">
            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
    </motion.div>
))

/* -------------------------------------------------------------------------
   COMPONENTS: CONVERSATION CARD
   ------------------------------------------------------------------------- */
const ConvoCard = React.memo(({ c, isActive, peer, isTyping, onClick }) => (
    <div 
        className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-all duration-200 relative group
            ${isActive ? 'bg-white/5' : 'hover:bg-white/[0.03]'}`}
        onClick={onClick}
    >
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-accent rounded-r-full shadow-[0_0_20px_var(--accent)]" />}
        
        <div className="relative shrink-0">
            <img 
                src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=7C3AED&color=fff`} 
                className="w-14 h-14 rounded-full border border-white/5 object-cover" 
                alt="" 
            />
            {c.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black" />}
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-0.5">
                <h4 className={`text-[15px] font-bold tracking-tight truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                    {peer?.username}
                </h4>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-tighter">
                    {timeago(c.lastMessage?.createdAt || c.updatedAt)}
                </span>
            </div>
            <p className={`text-[13px] truncate ${c.unreadCount > 0 ? 'text-white font-bold' : 'text-zinc-500 font-medium'}`}>
                {isTyping ? <span className="text-accent animate-pulse">Typing...</span> : (c.lastMessage?.body || 'Attachment')}
            </p>
        </div>
    </div>
))

/* -------------------------------------------------------------------------
   MAIN REBUILD
   ------------------------------------------------------------------------- */
export default function Messages() {
    const { user, logout } = useAuth()
    const { convoId } = useParams()
    const navigate = useNavigate()
    
    const [convos, setConvos] = useState([])
    const [messages, setMessages] = useState([])
    const [inputText, setInputText] = useState('')
    const [loading, setLoading] = useState(true)
    const [msgsLoading, setMsgsLoading] = useState(false)
    const viewportRef = useRef(null)

    const activeConvo = useMemo(() => convos.find(c => c._id === convoId), [convos, convoId])
    const peer = useMemo(() => activeConvo?.participants.find(p => p._id !== user?._id), [activeConvo, user])

    // Data Fetching
    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get('/chats')
                setConvos(data)
            } catch (e) { console.error(e) }
            finally { setLoading(false) }
        }
        load()
    }, [])

    useEffect(() => {
        if (!convoId) return
        const loadMsgs = async () => {
            setMsgsLoading(true)
            try {
                const { data } = await api.get(`/chats/${convoId}/messages`)
                setMessages(data)
                setTimeout(scrollToBottom, 100)
            } catch (e) { console.error(e) }
            finally { setMsgsLoading(false) }
        }
        loadMsgs()
    }, [convoId])

    const scrollToBottom = () => {
        if (viewportRef.current) {
            viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' })
        }
    }

    const handleSend = async () => {
        if (!inputText.trim()) return
        const body = inputText
        setInputText('')
        try {
            const { data } = await api.post(`/chats/${convoId}/messages`, { body })
            setMessages(prev => [...prev, data])
            setTimeout(scrollToBottom, 50)
        } catch (e) { console.error(e) }
    }

    const getGroupClass = (i) => {
        const m = messages[i], p = messages[i-1], n = messages[i+1]
        const ps = p && p.sender === m.sender, ns = n && n.sender === m.sender
        if (!ps && !ns) return 'msg-single'
        if (!ps && ns) return 'msg-top'
        if (ps && ns) return 'msg-middle'
        if (ps && !ns) return 'msg-bottom'
        return ''
    }

    const formatDate = (date) => {
        const d = new Date(date), today = new Date()
        if (d.toDateString() === today.toDateString()) return 'Today'
        return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
    }

    return (
        <div className="messages-layout">
            
            {/* 1. COMPACT NAV RAIL (72px) */}
            <aside className="ms-rail">
                <div className="mb-10 px-4">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20 cursor-pointer" onClick={() => navigate('/')}>
                        <span className="text-white font-black text-xl">P</span>
                    </div>
                </div>
                
                <div className="ms-rail-item" onClick={() => navigate('/')} title="Home"><HiHome size={24} /></div>
                <div className="ms-rail-item active" title="Messages"><HiChatAlt2 size={24} /></div>
                <div className="ms-rail-item" onClick={() => navigate('/notifications')} title="Notifications"><HiBell size={24} /></div>
                
                <div className="mt-auto space-y-4">
                    <div className="ms-rail-item" onClick={() => navigate('/settings')} title="Settings"><HiCog size={24} /></div>
                    <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden cursor-pointer" onClick={() => navigate(`/profile/${user?.username}`)}>
                        <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}`} alt="" className="w-full h-full object-cover" />
                    </div>
                </div>
            </aside>

            {/* 2. CHAT LIST (360px) */}
            <aside className={`ms-sidebar ${convoId ? 'hidden lg:flex' : 'flex'}`}>
                <div className="ms-sidebar-header">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xl font-black text-white tracking-tighter">{user?.username}</span>
                            <HiChevronDown size={18} className="opacity-40" />
                        </div>
                        <button className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                            <HiPencilAlt size={20} className="text-white" />
                        </button>
                    </div>
                    
                    <div className="relative">
                        <HiSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input className="ms-search-input" placeholder="Search direct messages" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {loading ? (
                        Array(8).fill(0).map((_, i) => <SkeletonRow key={i} />)
                    ) : convos.map(c => (
                        <ConvoCard 
                            key={c._id} 
                            c={c} 
                            isActive={convoId === c._id}
                            peer={c.participants.find(p => p._id !== user?._id)}
                            onClick={() => navigate(`/messages/${c._id}`)}
                        />
                    ))}
                </div>
            </aside>

            {/* 3. MAIN CHAT VIEW */}
            <main className={`ms-main ${!convoId ? 'hidden lg:flex' : 'flex'}`}>
                {convoId ? (
                    <>
                        <header className="ms-header">
                            <div className="flex items-center gap-3">
                                <button className="lg:hidden p-2 mr-1" onClick={() => navigate('/messages')}>
                                    <HiArrowLeft size={22} className="text-white" />
                                </button>
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                                    <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white tracking-tight leading-none mb-1">{peer?.username}</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Active</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-zinc-400">
                                <HiPhone size={22} className="hover:text-white cursor-pointer" />
                                <HiVideoCamera size={24} className="hover:text-white cursor-pointer" />
                                <HiInformationCircle size={24} className="hover:text-white cursor-pointer" />
                            </div>
                        </header>

                        <div ref={viewportRef} className="ms-viewport no-scrollbar">
                            <div className="flex-1 min-h-[40px]" />
                            <div className="flex flex-col items-center py-12 mb-8 border-b border-white/5">
                                <div className="w-24 h-24 rounded-full overflow-hidden mb-4 ring-4 ring-white/5">
                                    <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} alt="" className="w-full h-full object-cover" />
                                </div>
                                <h2 className="text-2xl font-black text-white tracking-tighter mb-1">{peer?.username}</h2>
                                <p className="text-zinc-500 text-sm font-bold mb-6 italic opacity-60">You follow each other</p>
                                <button className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-all">
                                    VIEW PROFILE
                                </button>
                            </div>
                            
                            {messages.map((m, i) => {
                                const day = formatDate(m.createdAt)
                                const prevDay = i > 0 ? formatDate(messages[i-1].createdAt) : null
                                return (
                                    <React.Fragment key={m._id}>
                                        {day !== prevDay && <div className="ms-day">{day}</div>}
                                        <MessageBubble 
                                            m={m} 
                                            isSelf={m.sender === user?._id}
                                            groupClass={getGroupClass(i)}
                                        />
                                    </React.Fragment>
                                )
                            })}
                        </div>

                        <footer className="ms-composer-area">
                            <div className="ms-composer-pill">
                                <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                    <HiEmojiHappy size={22} className="text-zinc-500" />
                                </button>
                                <input 
                                    className="ms-input"
                                    placeholder="Message..."
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                />
                                <div className="flex items-center gap-1">
                                    {inputText.trim() ? (
                                        <motion.button 
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center shadow-lg shadow-accent/20"
                                            onClick={handleSend}
                                        >
                                            <HiPaperAirplane size={18} className="rotate-90 translate-y-[-1px]" />
                                        </motion.button>
                                    ) : (
                                        <>
                                            <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><HiPhotograph size={22} className="text-zinc-500" /></button>
                                            <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><HiPlusCircle size={22} className="text-zinc-500" /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-24 h-24 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-8 rotate-3 shadow-2xl shadow-accent/5">
                            <HiChatAlt2 size={48} className="text-accent" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tighter mb-3">Your Messages</h2>
                        <p className="text-zinc-500 max-w-[320px] font-medium leading-relaxed mb-10">Send private messages to a friend. Your conversations are secured with Digital Obsidian encryption.</p>
                        <button className="px-10 py-3.5 bg-accent hover:opacity-90 text-white font-bold rounded-2xl transition-all shadow-xl shadow-accent/20">
                            SEND MESSAGE
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}
