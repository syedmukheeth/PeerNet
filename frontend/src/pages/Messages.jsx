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
   SUB-COMPONENTS: CONVERSATION ITEM
   ------------------------------------------------------------------------- */
const ConversationRow = React.memo(({ c, isActive, peer, onClick }) => (
    <div 
        className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-all border-l-4
            ${isActive ? 'bg-white/5 border-accent' : 'hover:bg-white/[0.03] border-transparent'}`}
        onClick={onClick}
    >
        <div className="relative shrink-0">
            <img 
                src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=7C3AED&color=fff`} 
                className="w-14 h-14 rounded-full border border-white/5 object-cover" 
                alt="" 
            />
            {c.isOnline && <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black" />}
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-0.5">
                <h4 className={`text-[15px] font-bold tracking-tight truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                    {peer?.username}
                </h4>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">
                    {timeago(c.lastMessage?.createdAt || c.updatedAt)}
                </span>
            </div>
            <p className={`text-[13px] truncate ${c.unreadCount > 0 ? 'text-white font-bold' : 'text-zinc-500 font-medium'}`}>
                {c.lastMessage?.body || 'Sent an attachment'}
            </p>
        </div>
        {c.unreadCount > 0 && <div className="w-2 h-2 bg-accent rounded-full shadow-[0_0_10px_var(--accent)]" />}
    </div>
))

/* -------------------------------------------------------------------------
   SUB-COMPONENTS: MESSAGE BUBBLE
   ------------------------------------------------------------------------- */
const MessageItem = React.memo(({ m, isSelf }) => (
    <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`ms-msg-row ${isSelf ? 'self' : 'peer'}`}
    >
        <div className="ms-bubble">
            {m.body}
        </div>
        <span className="ms-meta">
            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
    </motion.div>
))

/* -------------------------------------------------------------------------
   MAIN COMPONENT: MESSAGES
   ------------------------------------------------------------------------- */
export default function Messages() {
    const { user } = useAuth()
    const { convoId } = useParams()
    const navigate = useNavigate()
    
    const [convos, setConvos] = useState([])
    const [messages, setMessages] = useState([])
    const [inputText, setInputText] = useState('')
    const [loading, setLoading] = useState(true)
    const [msgsLoading, setMsgsLoading] = useState(false)
    const viewportRef = useRef(null)

    // Derived State
    const activeConvo = useMemo(() => convos.find(c => c._id === convoId), [convos, convoId])
    const peer = useMemo(() => activeConvo?.participants.find(p => p._id !== user?._id), [activeConvo, user])

    // Load Conversations
    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await api.get('/chats')
                setConvos(data)
                // AUTO-OPEN LATEST: If on base /messages, redirect to first chat
                if (!convoId && data.length > 0) {
                    navigate(`/messages/${data[0]._id}`, { replace: true })
                }
            } catch (e) { console.error(e) }
            finally { setLoading(false) }
        }
        fetch()
    }, [convoId, navigate])

    // Load Messages
    useEffect(() => {
        if (!convoId) return
        const fetchMsgs = async () => {
            setMsgsLoading(true)
            try {
                const { data } = await api.get(`/chats/${convoId}/messages`)
                setMessages(data)
                setTimeout(scrollToBottom, 100)
            } catch (e) { console.error(e) }
            finally { setMsgsLoading(false) }
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
        const text = inputText
        setInputText('')
        try {
            const { data } = await api.post(`/chats/${convoId}/messages`, { body: text })
            setMessages(prev => [...prev, data])
            setTimeout(scrollToBottom, 50)
        } catch (e) { console.error(e) }
    }

    return (
        <div className="messages-layout">
            
            {/* PANEL 1: CONVERSATION LIST (380px) */}
            <aside className={`ms-sidebar ${convoId ? 'hidden lg:flex' : 'flex'}`}>
                <div className="ms-sidebar-header">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 cursor-pointer group">
                            <span className="text-2xl font-black text-white tracking-tighter">{user?.username}</span>
                            <HiChevronDown size={20} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                            <HiPencilAlt size={22} />
                        </button>
                    </div>
                    
                    <div className="ms-search-box">
                        <HiSearch size={20} className="text-zinc-500" />
                        <input className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-zinc-600 font-bold" placeholder="Search direct messages" />
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
                            <ConversationRow 
                                key={c._id} 
                                c={c} 
                                isActive={convoId === c._id}
                                peer={c.participants.find(p => p._id !== user?._id)}
                                onClick={() => navigate(`/messages/${c._id}`)}
                            />
                        ))
                    ) : (
                        <div className="p-10 text-center">
                            <HiChatAlt2 size={48} className="text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-500 font-bold text-sm">No conversations yet</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* PANEL 2: MAIN CHAT WINDOW */}
            <main className={`ms-main ${!convoId ? 'hidden lg:flex' : 'flex'}`}>
                {convoId ? (
                    <>
                        <header className="ms-header">
                            <div className="flex items-center gap-4">
                                <button className="lg:hidden p-2" onClick={() => navigate('/messages')}>
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
                                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Online</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-zinc-400">
                                <HiPhone size={24} className="hover:text-white cursor-pointer transition-colors" />
                                <HiVideoCamera size={26} className="hover:text-white cursor-pointer transition-colors" />
                                <HiInformationCircle size={26} className="hover:text-white cursor-pointer transition-colors" />
                            </div>
                        </header>

                        <div ref={viewportRef} className="ms-viewport no-scrollbar">
                            <div className="flex-1 min-h-[40px]" />
                            <div className="flex flex-col items-center py-16 mb-8 border-b border-white/5">
                                <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} className="w-24 h-24 rounded-full mb-4 ring-8 ring-white/5" alt="" />
                                <h2 className="text-2xl font-black text-white tracking-tighter mb-1">{peer?.username}</h2>
                                <p className="text-zinc-500 text-sm font-bold mb-8">PeerNet Professional User</p>
                                <button className="px-8 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs rounded-xl tracking-widest transition-all">
                                    VIEW PROFILE
                                </button>
                            </div>
                            
                            {messages.map((m, i) => {
                                const day = formatDate(m.createdAt)
                                const prevDay = i > 0 ? formatDate(messages[i-1].createdAt) : null
                                return (
                                    <React.Fragment key={m._id}>
                                        {day !== prevDay && <div className="ms-day"><span>{day}</span></div>}
                                        <MessageItem m={m} isSelf={m.sender === user?._id} />
                                    </React.Fragment>
                                )
                            })}

                        </div>

                        <footer className="ms-footer">
                            <div className="ms-composer">
                                <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><HiEmojiHappy size={24} className="text-zinc-500" /></button>
                                <input 
                                    className="ms-input"
                                    placeholder="Message..."
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                                />
                                {inputText.trim() ? (
                                    <button className="px-4 py-2 text-accent font-black text-sm hover:text-white transition-colors" onClick={handleSend}>
                                        Send
                                    </button>
                                ) : (
                                    <div className="flex items-center pr-2">
                                        <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><HiMicrophone size={22} className="text-zinc-500" /></button>
                                        <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><HiPhotograph size={22} className="text-zinc-500" /></button>
                                    </div>
                                )}
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-10 border border-accent/20 shadow-2xl">
                            <HiChatAlt2 size={48} className="text-accent" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tighter mb-4 italic">Direct Messaging</h2>
                        <p className="text-zinc-500 max-w-[340px] text-center font-bold leading-relaxed mb-10 opacity-60">
                            Select a friend from the left sidebar to start chatting. Your conversations are secured.
                        </p>
                        <button className="px-10 py-4 bg-accent hover:opacity-90 text-white font-black rounded-2xl transition-all shadow-xl shadow-accent/20">
                            NEW CONVERSATION
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}
