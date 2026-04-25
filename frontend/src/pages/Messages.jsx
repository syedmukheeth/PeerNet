import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiSearch, HiPencilAlt, HiChevronDown, HiPhone, 
    HiVideoCamera, HiInformationCircle, HiChatAlt2,
    HiEmojiHappy, HiPhotograph, HiLogout, HiCog, HiHome, HiBell, HiPlusCircle, HiArrowLeft,
    HiDotsHorizontal, HiMicrophone, HiPaperClip
} from 'react-icons/hi'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import timeago from '../utils/timeago'

/* -------------------------------------------------------------------------
   SKELETON COMPONENTS
   ------------------------------------------------------------------------- */
const SkeletonConvo = () => (
    <div className="flex items-center px-5 py-3 gap-3">
        <div className="w-14 h-14 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded skeleton" />
            <div className="h-3 w-full rounded skeleton opacity-50" />
        </div>
    </div>
)

/* -------------------------------------------------------------------------
   SUB-COMPONENTS: DAY SEPARATOR
   ------------------------------------------------------------------------- */
const DaySeparator = ({ date }) => (
    <div className="day-separator">
        <span className="day-label">{date}</span>
    </div>
)

/* -------------------------------------------------------------------------
   COMPONENTS: CONVERSATION ITEM
   ------------------------------------------------------------------------- */
const ConvoItem = React.memo(({ c, isActive, hasUnread, peer, peerTyping, onClick }) => (
    <motion.div 
        layout
        className={`ms-convo-item group relative ${isActive ? 'active' : ''}`}
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
    >
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full shadow-[0_0_15px_rgba(124,58,237,0.5)]" />}
        
        <div className={`ms-avatar-container ${hasUnread ? 'ms-story-ring' : ''}`}>
            <img 
                src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=7C3AED&color=fff`} 
                className="ms-avatar transition-all group-hover:scale-105" 
                alt="" 
            />
            {c.isOnline && <div className="ms-online-badge" />}
        </div>
        
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
                <span className={`text-[15px] tracking-tight truncate ${hasUnread ? 'font-bold text-white' : 'font-semibold text-zinc-300'}`}>
                    {peer?.username}
                </span>
                <span className="text-[11px] text-zinc-500 font-medium whitespace-nowrap ml-2">
                    {timeago(c.lastMessage?.createdAt || c.updatedAt)}
                </span>
            </div>
            <p className={`text-[13px] truncate ${hasUnread ? 'text-white font-semibold' : 'text-zinc-500'}`}>
                {peerTyping ? <span className="text-accent animate-pulse">typing...</span> : (c.lastMessage?.body || 'Sent an attachment')}
            </p>
        </div>
        {hasUnread && <div className="w-2 h-2 bg-accent rounded-full ml-2" />}
    </motion.div>
))
ConvoItem.displayName = 'ConvoItem'

/* -------------------------------------------------------------------------
   COMPONENTS: MESSAGE ROW
   ------------------------------------------------------------------------- */
const MessageRow = React.memo(({ m, isSelf, groupClass }) => (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`ms-message-row ${isSelf ? 'self' : 'peer'} ${groupClass}`}
    >
        <div className="flex items-center gap-2 group/msg">
            <div className="ms-bubble">
                {m.body}
            </div>
            <span className="timestamp-hint">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
    </motion.div>
))
MessageRow.displayName = 'MessageRow'

/* -------------------------------------------------------------------------
   MAIN PAGE: MESSAGES
   ------------------------------------------------------------------------- */
export default function Messages() {
    const { user, logout } = useAuth()
    const { convoId } = useParams()
    const navigate = useNavigate()
    const [convos, setConvos] = useState([])
    const [messages, setMessages] = useState([])
    const [inputText, setInputText] = useState('')
    const [searchText, setSearchText] = useState('')
    const [loading, setLoading] = useState(true)
    const [messagesLoading, setMessagesLoading] = useState(false)
    const [peerTyping, setPeerTyping] = useState(false)
    const viewportRef = useRef(null)

    const activeConvo = useMemo(() => convos.find(c => c._id === convoId), [convos, convoId])
    const peer = useMemo(() => activeConvo?.participants.find(p => p._id !== user?._id), [activeConvo, user])

    useEffect(() => {
        const fetchConvos = async () => {
            try {
                const { data } = await api.get('/chats')
                setConvos(data)
            } catch (err) { console.error(err) }
            finally { setLoading(false) }
        }
        fetchConvos()
    }, [])

    useEffect(() => {
        if (!convoId) return
        const fetchMessages = async () => {
            setMessagesLoading(true)
            try {
                const { data } = await api.get(`/chats/${convoId}/messages`)
                setMessages(data)
                setTimeout(scrollToBottom, 100)
            } catch (err) { console.error(err) }
            finally { setMessagesLoading(false) }
        }
        fetchMessages()
    }, [convoId])

    const scrollToBottom = () => {
        if (viewportRef.current) {
            viewportRef.current.scrollTo({
                top: viewportRef.current.scrollHeight,
                behavior: 'smooth'
            })
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
        } catch (err) { console.error(err) }
    }

    const getGroupClass = (index) => {
        const m = messages[index]
        const prev = messages[index - 1]
        const next = messages[index + 1]
        
        const isPrevSame = prev && prev.sender === m.sender
        const isNextSame = next && next.sender === m.sender
        
        if (!isPrevSame && !isNextSame) return 'ms-msg-single'
        if (!isPrevSame && isNextSame) return 'ms-msg-top'
        if (isPrevSame && isNextSame) return 'ms-msg-middle'
        if (isPrevSame && !isNextSame) return 'ms-msg-bottom'
        return ''
    }

    const formatDate = (date) => {
        const d = new Date(date)
        const today = new Date()
        if (d.toDateString() === today.toDateString()) return 'Today'
        return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
    }

    const navLinks = [
        { to: '/', icon: HiHome, label: 'Home' },
        { to: '/search', icon: HiSearch, label: 'Search' },
        { to: '/messages', icon: HiChatAlt2, label: 'Messages', active: true },
        { to: '/notifications', icon: HiBell, label: 'Notifications' },
        { to: '/create', icon: HiPlusCircle, label: 'Create' },
    ]

    return (
        <div className="messages-layout">
            
            {/* PANEL 1: ICON NAV */}
            <aside className="ms-nav !border-r-0 !bg-black/40 backdrop-blur-xl">
                <div className="mb-10 px-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center shadow-lg shadow-accent/20 cursor-pointer hover:scale-110 transition-transform">
                        <span className="text-white font-black text-xl">P</span>
                    </div>
                </div>
                
                <div className="flex flex-col items-center gap-3 w-full">
                    {navLinks.map(link => (
                        <div 
                            key={link.to} 
                            className={`ms-nav-item relative group ${link.active ? 'active text-white' : 'text-zinc-500 hover:text-white'}`}
                            onClick={() => navigate(link.to)}
                        >
                            <link.icon size={26} className="relative z-10" />
                            {link.active && (
                                <motion.div layoutId="nav-glow" className="absolute inset-0 bg-accent/20 rounded-xl blur-lg" />
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-auto pb-6 flex flex-col items-center gap-6">
                    <div className="ms-nav-item text-zinc-500 hover:text-white" onClick={() => navigate('/settings')}><HiCog size={24} /></div>
                    <div className="w-10 h-10 rounded-full border-2 border-white/10 overflow-hidden cursor-pointer hover:border-accent transition-colors">
                        <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}`} alt="" className="w-full h-full object-cover" />
                    </div>
                </div>
            </aside>

            {/* PANEL 2: CONVERSATIONS */}
            <aside className={`ms-sidebar !bg-black ${convoId ? 'hidden lg:flex' : 'flex'}`}>
                <header className="px-6 py-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 cursor-pointer group">
                            <span className="text-2xl font-black tracking-tighter text-white">{user?.username}</span>
                            <HiChevronDown size={20} className="mt-1 opacity-40 group-hover:opacity-100 transition-all" />
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors">
                            <HiPencilAlt size={22} className="text-white" />
                        </div>
                    </div>
                    
                    <div className="ms-search-box-premium">
                        <HiSearch size={20} className="text-zinc-500" />
                        <input 
                            className="bg-transparent border-none outline-none text-[15px] text-white w-full placeholder:text-zinc-600 font-medium" 
                            placeholder="Search messages" 
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>
                </header>

                <div className="ms-convo-list no-scrollbar pb-20">
                    {loading ? (
                        Array(6).fill(0).map((_, i) => <SkeletonConvo key={i} />)
                    ) : convos.length > 0 ? (
                        <AnimatePresence>
                            {convos.map(c => {
                                const p = c.participants.find(p => p._id !== user?._id)
                                return (
                                    <ConvoItem 
                                        key={c._id} 
                                        c={c} 
                                        peer={p}
                                        isActive={convoId === c._id}
                                        hasUnread={c.unreadCount > 0}
                                        peerTyping={peerTyping && activeConvo?._id === c._id}
                                        onClick={() => navigate(`/messages/${c._id}`)}
                                    />
                                )
                            })}
                        </AnimatePresence>
                    ) : (
                        <div className="p-10 text-center space-y-2">
                            <p className="text-white font-bold">No chats yet</p>
                            <p className="text-zinc-500 text-sm">Start a conversation with someone!</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* PANEL 3: CHAT AREA */}
            <main className={`ms-content ${!convoId ? 'hidden lg:flex' : 'flex'}`}>
                {convoId ? (
                    <>
                        <header className="ms-chat-header !bg-black/60 !backdrop-blur-2xl">
                            <div className="flex items-center gap-4">
                                <button className="lg:hidden" onClick={() => navigate('/messages')}>
                                    <HiArrowLeft size={24} className="text-white" />
                                </button>
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 ring-2 ring-white/5">
                                    <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white tracking-tight leading-tight">{peer?.username}</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Active Now</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-zinc-400">
                                <HiPhone size={24} className="hover:text-white cursor-pointer transition-colors" />
                                <HiVideoCamera size={26} className="hover:text-white cursor-pointer transition-colors" />
                                <HiInformationCircle size={26} className="hover:text-white cursor-pointer transition-colors" />
                            </div>
                        </header>

                        <div ref={viewportRef} className="ms-viewport no-scrollbar !bg-black">
                            <div className="flex-1" />
                            <div className="flex flex-col items-center py-16 mb-8 border-b border-white/5">
                                <div className="w-24 h-24 rounded-full overflow-hidden mb-5 border-4 border-white/5 shadow-2xl">
                                    <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} alt="" className="w-full h-full object-cover" />
                                </div>
                                <h2 className="text-2xl font-black text-white tracking-tighter mb-1">{peer?.username}</h2>
                                <p className="text-zinc-500 text-sm font-semibold mb-6">You follow each other on PeerNet</p>
                                <button className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl transition-all active:scale-95">
                                    View Profile
                                </button>
                            </div>
                            
                            {messages.map((m, i) => {
                                const currentDay = formatDate(m.createdAt)
                                const prevDay = i > 0 ? formatDate(messages[i-1].createdAt) : null
                                return (
                                    <React.Fragment key={m._id}>
                                        {currentDay !== prevDay && <DaySeparator date={currentDay} />}
                                        <MessageRow 
                                            m={m} 
                                            isSelf={m.sender === user?._id}
                                            groupClass={getGroupClass(i)}
                                        />
                                    </React.Fragment>
                                )
                            })}
                        </div>

                        <footer className="px-6 py-6 !bg-black">
                            <div className="ms-composer-inner !bg-zinc-900 !border-none !py-2 !px-4">
                                <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                    <HiEmojiHappy size={24} className="text-zinc-400" />
                                </button>
                                <input 
                                    className="flex-1 bg-transparent border-none outline-none text-[15px] py-1 text-white placeholder:text-zinc-600 font-medium"
                                    placeholder="Message..."
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                                />
                                <div className="flex items-center gap-1">
                                    {inputText.trim() ? (
                                        <motion.button 
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="ms-send-btn !text-accent hover:!text-white pr-2"
                                            onClick={handleSend}
                                        >
                                            Send
                                        </motion.button>
                                    ) : (
                                        <>
                                            <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><HiMicrophone size={22} className="text-zinc-400" /></button>
                                            <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><HiPhotograph size={22} className="text-zinc-400" /></button>
                                            <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><HiPlusCircle size={22} className="text-zinc-400" /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="ms-empty-state !bg-black">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center"
                        >
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent/20 to-indigo-500/20 flex items-center justify-center mb-8 border border-white/5 relative">
                                <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
                                <HiChatAlt2 size={48} className="text-white relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-3 tracking-tighter bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">Your Messages</h2>
                            <p className="text-zinc-500 max-w-[320px] mb-10 text-[15px] leading-relaxed font-medium">Send private photos and messages to a friend or group. Your conversations are secured.</p>
                            <button 
                                className="px-10 py-3.5 bg-accent hover:opacity-90 text-white font-bold rounded-2xl transition-all shadow-2xl shadow-accent/30 active:scale-95" 
                                onClick={() => navigate('/messages')}
                            >
                                Send Message
                            </button>
                        </motion.div>
                    </div>
                )}
            </main>
        </div>
    )
}
