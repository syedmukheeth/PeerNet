import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiSearch, HiPencilAlt, HiChevronDown, HiPhone, 
    HiVideoCamera, HiInformationCircle, HiChatAlt2,
    HiEmojiHappy, HiPhotograph, HiLogout, HiCog, HiHome, HiBell, HiPlusCircle, HiArrowLeft
} from 'react-icons/hi'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import timeago from '../utils/timeago'

/* -------------------------------------------------------------------------
   COMPONENTS: CONVERSATION ITEM
   ------------------------------------------------------------------------- */
const ConvoItem = React.memo(({ c, isActive, hasUnread, peer, peerTyping, onClick }) => (
    <div 
        className={`ms-convo-item group ${isActive ? 'active' : ''}`}
        onClick={onClick}
    >
        <div className={`ms-avatar-container ${hasUnread ? 'ms-story-ring' : ''}`}>
            <img 
                src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=7C3AED&color=fff`} 
                className="ms-avatar group-hover:scale-105 transition-transform" 
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
        {hasUnread && <div className="w-2.5 h-2.5 bg-accent rounded-full ml-2 shadow-[0_0_10px_rgba(124,58,237,0.5)]" />}
    </div>
))
ConvoItem.displayName = 'ConvoItem'

/* -------------------------------------------------------------------------
   COMPONENTS: MESSAGE ROW
   ------------------------------------------------------------------------- */
const MessageRow = React.memo(({ m, isSelf, groupClass }) => (
    <div className={`ms-message-row ${isSelf ? 'self' : 'peer'} ${groupClass}`}>
        <div className="ms-bubble">
            {m.body}
        </div>
        {groupClass.includes('bottom') && (
            <span className="text-[10px] text-zinc-600 mt-1 px-1">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        )}
    </div>
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
            try {
                const { data } = await api.get(`/chats/${convoId}/messages`)
                setMessages(data)
                setTimeout(scrollToBottom, 100)
            } catch (err) { console.error(err) }
        }
        fetchMessages()
    }, [convoId])

    const scrollToBottom = () => {
        if (viewportRef.current) {
            viewportRef.current.scrollTop = viewportRef.current.scrollHeight
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

    const navLinks = [
        { to: '/', icon: HiHome, label: 'Home' },
        { to: '/search', icon: HiSearch, label: 'Search' },
        { to: '/messages', icon: HiChatAlt2, label: 'Messages', active: true },
        { to: '/notifications', icon: HiBell, label: 'Notifications' },
        { to: '/create', icon: HiPlusCircle, label: 'Create' },
    ]

    return (
        <div className="messages-layout">
            
            {/* PANEL 1: INTEGRATED NAV */}
            <aside className="ms-nav">
                <div className="mb-10 group cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-110 transition-transform">
                        <span className="text-white font-black text-xl">P</span>
                    </div>
                </div>
                
                <div className="flex flex-col items-center gap-2 w-full">
                    {navLinks.map(link => (
                        <div 
                            key={link.to} 
                            className={`ms-nav-item ${link.active ? 'active' : ''}`}
                            onClick={() => navigate(link.to)}
                            title={link.label}
                        >
                            <link.icon size={26} />
                        </div>
                    ))}
                </div>

                <div className="mt-auto flex flex-col gap-6 items-center">
                    <div className="ms-nav-item hover:text-white" onClick={() => navigate('/settings')} title="Settings"><HiCog size={24} /></div>
                    <div className="ms-nav-item hover:text-red-400" onClick={() => logout()} title="Logout"><HiLogout size={24} /></div>
                    <div className="w-10 h-10 rounded-full border-2 border-white/10 overflow-hidden cursor-pointer hover:border-accent transition-colors">
                        <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}`} alt="" className="w-full h-full object-cover" />
                    </div>
                </div>
            </aside>

            {/* PANEL 2: CONVO SIDEBAR */}
            <aside className={`ms-sidebar ${convoId ? 'hidden lg:flex' : 'flex'}`}>
                <header className="ms-sidebar-header">
                    <div className="flex justify-between items-center">
                        <div className="ms-username-btn group">
                            <span>{user?.username}</span>
                            <HiChevronDown size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                            <HiPencilAlt size={20} className="text-white" />
                        </div>
                    </div>
                    
                    <div className="ms-search-container">
                        <HiSearch size={18} className="text-zinc-600" />
                        <input 
                            className="bg-transparent border-none outline-none text-[15px] text-white w-full placeholder:text-zinc-700" 
                            placeholder="Search" 
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>
                </header>

                <div className="ms-convo-list no-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center text-zinc-700 text-sm font-medium">Loading conversations...</div>
                    ) : convos.length > 0 ? (
                        convos.map(c => {
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
                        })
                    ) : (
                        <div className="p-8 text-center text-zinc-700 text-sm font-medium">No messages found.</div>
                    )}
                </div>
            </aside>

            {/* PANEL 3: CHAT CONTENT */}
            <main className={`ms-content ${!convoId ? 'hidden lg:flex' : 'flex'}`}>
                {convoId ? (
                    <>
                        <header className="ms-chat-header">
                            <div className="flex items-center gap-3">
                                <button className="lg:hidden mr-1" onClick={() => navigate('/messages')}>
                                    <HiArrowLeft size={24} />
                                </button>
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                                    <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-bold tracking-tight text-white">{peer?.username}</h3>
                                    <p className="text-[11px] text-zinc-500 font-medium">Active now</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 text-zinc-300">
                                <HiPhone size={24} className="cursor-pointer hover:text-white transition-colors" />
                                <HiVideoCamera size={26} className="cursor-pointer hover:text-white transition-colors" />
                                <HiInformationCircle size={26} className="cursor-pointer hover:text-white transition-colors" />
                            </div>
                        </header>

                        <div ref={viewportRef} className="ms-viewport no-scrollbar">
                            <div className="mt-auto">
                                <div className="flex flex-col items-center py-10">
                                    <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border border-white/5">
                                        <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}`} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <h2 className="text-xl font-extrabold text-white mb-1">{peer?.username}</h2>
                                    <p className="text-sm text-zinc-500 font-medium mb-6">PeerNet User</p>
                                    <button className="px-5 py-1.5 bg-zinc-900 text-white font-bold text-sm rounded-lg hover:bg-zinc-800 transition-colors">
                                        View Profile
                                    </button>
                                </div>
                                
                                {messages.map((m, i) => (
                                    <MessageRow 
                                        key={m._id} 
                                        m={m} 
                                        isSelf={m.sender === user?._id}
                                        groupClass={getGroupClass(i)}
                                    />
                                ))}
                            </div>
                        </div>

                        <footer className="ms-composer">
                            <div className="ms-composer-inner">
                                <HiEmojiHappy size={26} className="text-zinc-400 cursor-pointer hover:text-white" />
                                <input 
                                    className="flex-1 bg-transparent border-none outline-none text-[15px] py-2 text-white placeholder:text-zinc-700"
                                    placeholder="Message..."
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                                />
                                {inputText.trim() ? (
                                    <span className="ms-send-btn" onClick={handleSend}>Send</span>
                                ) : (
                                    <div className="flex items-center gap-4 text-zinc-400">
                                        <HiPhotograph size={24} className="cursor-pointer hover:text-white" />
                                        <HiChatAlt2 size={24} className="cursor-pointer hover:text-white" />
                                    </div>
                                )}
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="ms-empty-state">
                        <div className="ms-empty-icon-box">
                            <HiChatAlt2 size={44} className="text-white relative z-10" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Your Messages</h2>
                        <p className="text-zinc-500 max-w-[280px] mb-8 text-[15px] leading-relaxed font-medium">Send private photos and messages to a friend or group.</p>
                        <button 
                            className="px-8 py-2.5 bg-accent hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-xl shadow-accent/20" 
                            onClick={() => navigate('/messages')}
                        >
                            Send Message
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}
