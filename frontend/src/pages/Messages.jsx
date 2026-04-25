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
   SUB-COMPONENTS: ZENITH CONVERSATION ROW
   ------------------------------------------------------------------------- */
const ZenithConvoRow = React.memo(({ c, isActive, peer, onClick }) => (
    <div 
        className={`zn-convo-row ${isActive ? 'active' : ''}`}
        onClick={onClick}
    >
        <div className="relative shrink-0">
            <div className="zn-avatar-wrap">
                <img 
                    src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=7C3AED&color=fff`} 
                    className="w-full h-full object-cover" 
                    alt="" 
                />
            </div>
            {c.isOnline && <div className="zn-online-dot" />}
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
                <h4 className={`zn-convo-name ${isActive ? 'active' : ''}`}>
                    {peer?.username}
                </h4>
                <span className="zn-convo-time">
                    {timeago(c.lastMessage?.createdAt || c.updatedAt)}
                </span>
            </div>
            <p className={`zn-convo-msg ${c.unreadCount > 0 ? 'unread' : ''}`}>
                {c.lastMessage?.body || 'Sent an attachment'}
            </p>
        </div>
        {c.unreadCount > 0 && <div className="zn-unread-badge" />}
    </div>
))


/* -------------------------------------------------------------------------
   SUB-COMPONENTS: ZENITH MESSAGE BUBBLE
   ------------------------------------------------------------------------- */
const ZenithMessage = React.memo(({ m, isSelf, groupClass }) => (
    <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`zn-row ${isSelf ? 'self' : 'peer'} ${groupClass}`}
    >
        <div className="zn-bubble shadow-xl">
            {m.body}
        </div>
        <span className="zn-meta">
            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
    </motion.div>
))

/* -------------------------------------------------------------------------
   MAIN COMPONENT: PROJECT ZENITH
   ------------------------------------------------------------------------- */
export default function Messages() {
    const { user } = useAuth()
    const { convoId } = useParams()
    const navigate = useNavigate()
    
    const [convos, setConvos] = useState([])
    const [messages, setMessages] = useState([])
    const [inputText, setInputText] = useState('')
    const [loading, setLoading] = useState(true)
    const viewportRef = useRef(null)

    // Derived State
    const activeConvo = useMemo(() => convos.find(c => c._id === convoId), [convos, convoId])
    const peer = useMemo(() => activeConvo?.participants.find(p => p._id !== user?._id), [activeConvo, user])

    // Fetch Conversations & Auto-Open
    useEffect(() => {
        const fetchConvos = async () => {
            try {
                const { data } = await api.get('/chats')
                setConvos(data)
                // ZENITH LOGIC: Always auto-open latest chat on desktop
                if (!convoId && data.length > 0 && window.innerWidth > 1024) {
                    navigate(`/messages/${data[0]._id}`, { replace: true })
                }
            } catch (e) { console.error(e) }
            finally { setLoading(false) }
        }
        fetchConvos()
    }, [convoId, navigate])

    // Fetch Messages
    useEffect(() => {
        if (!convoId) return
        const fetchMsgs = async () => {
            try {
                const { data } = await api.get(`/chats/${convoId}/messages`)
                setMessages(data)
                setTimeout(scrollToBottom, 100)
            } catch (e) { console.error(e) }
        }
        fetchMsgs()
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
        <div className="zn-layout">
            
            {/* PANEL 1: SIDEBAR (360px) */}
            <aside className={`zn-sidebar ${convoId ? 'hidden lg:flex' : 'flex'}`}>
                <div className="zn-sidebar-header">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-2 cursor-pointer group">
                            <span className="text-2xl font-black text-white tracking-tighter leading-none">{user?.username}</span>
                            <HiChevronDown size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95">
                            <HiPencilAlt size={22} />
                        </button>
                    </div>
                    
                    <div className="zn-search-box">
                        <HiSearch size={20} className="text-zinc-500" />
                        <input className="bg-transparent border-none outline-none text-[15px] text-white w-full placeholder:text-zinc-600 font-bold" placeholder="Search direct messages" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                    {loading ? (
                        Array(6).fill(0).map((_, i) => (
                            <div key={i} className="px-6 py-4 flex gap-4 animate-pulse">
                                <div className="w-14 h-14 bg-white/5 rounded-full" />
                                <div className="flex-1 space-y-2 py-2">
                                    <div className="h-4 bg-white/5 rounded w-24" />
                                    <div className="h-3 bg-white/5 rounded w-40" />
                                </div>
                            </div>
                        ))
                    ) : convos.length > 0 ? (
                        convos.map(c => (
                            <ZenithConvoRow 
                                key={c._id} 
                                c={c} 
                                isActive={convoId === c._id}
                                peer={c.participants.find(p => p._id !== user?._id)}
                                onClick={() => navigate(`/messages/${c._id}`)}
                            />
                        ))
                    ) : (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                <HiChatAlt2 size={32} className="text-zinc-700" />
                            </div>
                            <p className="text-zinc-500 font-black text-xs uppercase tracking-widest">No chats found</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* PANEL 2: CHAT VIEW */}
            <main className={`zn-main ${!convoId ? 'hidden lg:flex' : 'flex'}`}>
                {convoId ? (
                    <>
                        <header className="zn-header">
                            <div className="flex items-center gap-4">
                                <button className="lg:hidden p-2 -ml-2" onClick={() => navigate('/messages')}>
                                    <HiArrowLeft size={24} className="text-white" />
                                </button>
                                <div className="relative group cursor-pointer" onClick={() => navigate(`/profile/${peer?.username}`)}>
                                    <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} className="w-10 h-10 rounded-full border border-white/10" alt="" />
                                    <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-black text-white tracking-tight leading-none mb-1 cursor-pointer" onClick={() => navigate(`/profile/${peer?.username}`)}>
                                        {peer?.username}
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Active Now</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-zinc-400">
                                <HiPhone size={24} className="hover:text-white cursor-pointer transition-colors" />
                                <HiVideoCamera size={26} className="hover:text-white cursor-pointer transition-colors" />
                                <HiInformationCircle size={26} className="hover:text-white cursor-pointer transition-colors" />
                            </div>
                        </header>

                        <div ref={viewportRef} className="zn-viewport no-scrollbar">
                            <div className="flex-1 min-h-[40px]" />
                            <div className="flex flex-col items-center py-16 mb-12 border-b border-white/5">
                                <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} className="w-24 h-24 rounded-full mb-6 ring-[12px] ring-white/[0.03] border border-white/10" alt="" />
                                <h2 className="text-3xl font-black text-white tracking-tighter mb-2">{peer?.username}</h2>
                                <p className="text-zinc-500 text-sm font-bold tracking-tight mb-8">You follow each other on PeerNet</p>
                                <button className="px-10 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-[11px] rounded-xl tracking-widest transition-all border border-white/5">
                                    VIEW PROFILE
                                </button>
                            </div>
                            
                            {messages.map((m, i) => {
                                const day = formatDate(m.createdAt)
                                const prevDay = i > 0 ? formatDate(messages[i-1].createdAt) : null
                                return (
                                    <React.Fragment key={m._id}>
                                        {day !== prevDay && <div className="zn-day"><span>{day}</span></div>}
                                        <ZenithMessage m={m} isSelf={m.sender === user?._id} groupClass={getGroupClass(i)} />
                                    </React.Fragment>
                                )
                            })}
                        </div>

                        <footer className="zn-footer">
                            <div className="zn-composer-pill">
                                <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><HiEmojiHappy size={24} className="text-zinc-500" /></button>
                                <input 
                                    className="zn-input"
                                    placeholder="Message..."
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                />
                                {inputText.trim() ? (
                                    <button className="px-5 py-2 text-zn-accent font-black text-sm hover:text-white transition-all transform active:scale-95" onClick={handleSend}>
                                        Send
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1 pr-2">
                                        <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><HiMicrophone size={22} className="text-zinc-500" /></button>
                                        <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><HiPhotograph size={22} className="text-zinc-500" /></button>
                                        <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><HiPlusCircle size={22} className="text-zinc-500" /></button>
                                    </div>
                                )}
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-zn-accent/20 to-zn-accent/5 flex items-center justify-center mb-10 border border-zn-accent/20 shadow-2xl rotate-3">
                            <HiChatAlt2 size={48} className="text-zn-accent" />
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-4">Direct Messaging</h2>
                        <p className="text-zinc-500 max-w-[340px] font-bold leading-relaxed mb-12 opacity-60">
                            Select a conversation from the left to start chatting with your network.
                        </p>
                        <button className="px-12 py-4 bg-zn-accent hover:opacity-90 text-white font-black rounded-2xl transition-all shadow-2xl shadow-zn-accent/20 active:scale-95">
                            NEW CONVERSATION
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}
