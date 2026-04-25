import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiSearch, HiPencilAlt, HiChevronDown, HiPhone, 
    HiVideoCamera, HiInformationCircle, HiChatAlt2,
    HiEmojiHappy, HiPhotograph, HiArrowLeft,
    HiMicrophone, HiPlusCircle, HiPaperAirplane
} from 'react-icons/hi'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import timeago from '../utils/timeago'

/* -------------------------------------------------------------------------
   SUB-COMPONENT: CONVERSATION ITEM (SIDEBAR)
   ------------------------------------------------------------------------- */
const ConvoItem = React.memo(({ c, isActive, user, onClick }) => {
    const peer = c.participants.find(p => p._id !== user?._id)
    return (
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
    )
})

/* -------------------------------------------------------------------------
   SUB-COMPONENT: MESSAGE BUBBLE
   ------------------------------------------------------------------------- */
const MessageBubble = React.memo(({ m, isSelf, groupClass }) => (
    <motion.div 
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`zn-row ${isSelf ? 'self' : 'peer'} ${groupClass}`}
    >
        <div className="zn-bubble">
            {m.body}
        </div>
        <span className="zn-meta">
            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
    </motion.div>
))

/* -------------------------------------------------------------------------
   MAIN PAGE: ZENITH MESSAGES
   ------------------------------------------------------------------------- */
export default function Messages() {
    const { user } = useAuth()
    const { id: convoId } = useParams()
    const navigate = useNavigate()
    
    const [convos, setConvos] = useState([])
    const [messages, setMessages] = useState([])
    const [inputText, setInputText] = useState('')
    const [loading, setLoading] = useState(true)
    const viewportRef = useRef(null)

    // Find Active Conversation Data
    const activeConvo = useMemo(() => convos.find(c => c._id === convoId), [convos, convoId])
    const peer = useMemo(() => activeConvo?.participants.find(p => p._id !== user?._id), [activeConvo, user])

    // Fetch Conversations
    useEffect(() => {
        const fetchConvos = async () => {
            try {
                const { data } = await api.get('/chats')
                setConvos(data)
                // Desktop: Auto-open latest chat if none selected
                if (!convoId && data.length > 0 && window.innerWidth > 1024) {
                    navigate(`/messages/${data[0]._id}`, { replace: true })
                }
            } catch (e) { console.error('[Zenith] Convo Fetch Error:', e) }
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
                setTimeout(() => viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'instant' }), 50)
            } catch (e) { console.error('[Zenith] Msg Fetch Error:', e) }
        }
        fetchMsgs()
    }, [convoId])

    const handleSend = async () => {
        if (!inputText.trim()) return
        const body = inputText
        setInputText('')
        try {
            const { data } = await api.post(`/chats/${convoId}/messages`, { body })
            setMessages(prev => [...prev, data])
            setTimeout(() => viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' }), 50)
        } catch (e) { console.error('[Zenith] Send Error:', e) }
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
            
            {/* LEFT PANEL: CONVERSATION LIST */}
            <aside className={`zn-sidebar ${convoId ? 'hide-mobile' : 'show-mobile'}`}>
                <div className="zn-sidebar-header">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-2 cursor-pointer">
                            <span className="text-2xl font-black text-white tracking-tighter leading-none">{user?.username}</span>
                            <HiChevronDown size={18} className="text-zinc-500" />
                        </div>
                        <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all">
                            <HiPencilAlt size={22} />
                        </button>
                    </div>
                    
                    <div className="zn-search-box">
                        <HiSearch size={20} className="text-zinc-500" />
                        <input className="zn-input font-bold" placeholder="Search messages" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {loading ? (
                        <div className="p-8 space-y-6">
                            {[1,2,3].map(i => <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-14 h-14 rounded-full bg-white/5" />
                                <div className="flex-1 py-2 space-y-2"><div className="h-3 bg-white/5 w-24 rounded" /><div className="h-3 bg-white/5 w-40 rounded" /></div>
                            </div>)}
                        </div>
                    ) : convos.length > 0 ? (
                        convos.map(c => (
                            <ConvoItem 
                                key={c._id} 
                                c={c} 
                                isActive={convoId === c._id}
                                user={user}
                                onClick={() => navigate(`/messages/${c._id}`)}
                            />
                        ))
                    ) : (
                        <div className="p-12 text-center opacity-40">
                            <HiChatAlt2 size={48} className="mx-auto mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest">No Conversations</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* RIGHT PANEL: CHAT VIEW */}
            <main className={`zn-main ${!convoId ? 'hide-mobile' : 'show-mobile'}`}>
                {convoId ? (
                    <>
                        <header className="zn-header">
                            <div className="flex items-center gap-4">
                                <button className="lg-hide p-2 -ml-2" onClick={() => navigate('/messages')}>
                                    <HiArrowLeft size={24} className="text-white" />
                                </button>
                                <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} className="w-10 h-10 rounded-full border border-white/10" alt="" />
                                <div>
                                    <h3 className="text-base font-bold text-white tracking-tight leading-none mb-1">{peer?.username}</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Active Now</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 text-zinc-400 hide-mobile">
                                <HiPhone size={24} className="hover:text-white cursor-pointer" />
                                <HiVideoCamera size={26} className="hover:text-white cursor-pointer" />
                                <HiInformationCircle size={26} className="hover:text-white cursor-pointer" />
                            </div>
                        </header>

                        <div ref={viewportRef} className="zn-viewport no-scrollbar">
                            <div className="flex-1" />
                            <div className="flex flex-col items-center py-16 mb-12 border-b border-white/5">
                                <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} className="w-24 h-24 rounded-full mb-6 border border-white/10 shadow-2xl" alt="" />
                                <h2 className="text-3xl font-black text-white tracking-tighter mb-1">{peer?.username}</h2>
                                <p className="text-zinc-500 text-sm font-medium mb-6">PeerNet Professional Network</p>
                                <button className="px-8 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-[11px] rounded-xl tracking-widest border border-white/5">
                                    VIEW PROFILE
                                </button>
                            </div>
                            
                            {messages.map((m, i) => {
                                const day = formatDate(m.createdAt)
                                const prevDay = i > 0 ? formatDate(messages[i-1].createdAt) : null
                                return (
                                    <React.Fragment key={m._id}>
                                        {day !== prevDay && <div className="zn-day"><span>{day}</span></div>}
                                        <MessageBubble m={m} isSelf={m.sender === user?._id} groupClass={getGroupClass(i)} />
                                    </React.Fragment>
                                )
                            })}
                        </div>

                        <footer className="zn-footer">
                            <div className="zn-composer-pill">
                                <HiEmojiHappy size={24} className="text-zinc-500 cursor-pointer hover:text-white" />
                                <input 
                                    className="zn-input"
                                    placeholder="Message..."
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                />
                                {inputText.trim() ? (
                                    <button className="px-4 py-2 text-zn-accent font-bold text-sm hover:text-white" onClick={handleSend}>Send</button>
                                ) : (
                                    <div className="flex items-center gap-3 pr-2">
                                        <HiPhotograph size={22} className="text-zinc-500 cursor-pointer" />
                                        <HiPlusCircle size={22} className="text-zinc-500 cursor-pointer" />
                                    </div>
                                )}
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-black">
                        <div className="w-24 h-24 rounded-[32px] bg-zinc-900 flex items-center justify-center mb-8 border border-white/5 shadow-2xl">
                            <HiChatAlt2 size={48} className="text-zn-accent" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tighter mb-4">Your Messages</h2>
                        <p className="text-zinc-500 max-w-[320px] font-medium leading-relaxed mb-10">
                            Send private photos and messages to a friend or group.
                        </p>
                        <button className="px-10 py-3.5 bg-zn-accent text-white font-black rounded-2xl shadow-xl shadow-zn-accent/20">
                            SEND MESSAGE
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}
