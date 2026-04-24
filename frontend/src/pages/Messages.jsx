import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
    HiPencilAlt, HiSearch, HiOutlinePhotograph, HiOutlineEmojiHappy, HiChevronLeft,
    HiHome, HiFilm, HiChatAlt2, HiBell, HiPlusCircle, HiCog, HiLogout
} from 'react-icons/hi'
import { useAuth } from '../context/AuthContext'
import api, { chatApi } from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import { timeago } from '../utils/timeago'
import toast from 'react-hot-toast'
import EmojiPicker from '@emoji-mart/react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Messages() {
    const { id: convoId } = useParams()
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const socket = useSocket(user)

    // ─── State ──────────────────────────────────────────────────
    const [conversations, setConversations] = useState([])
    const [activeConvo, setActiveConvo] = useState(null)
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [inputText, setInputText] = useState('')
    const [showEmoji, setShowEmoji] = useState(false)
    const [peerTyping, setPeerTyping] = useState(false)

    const scrollRef = useRef()
    const inputRef = useRef()
    const typingTimer = useRef()
    const currentFetchId = useRef(0)

    // ─── App Nav Links ──────────────────────────────────────────
    const navLinks = [
        { to: '/', icon: HiHome, label: 'Home' },
        { to: '/search', icon: HiSearch, label: 'Search' },
        { to: '/shorts', icon: HiFilm, label: 'Shorts' },
        { to: '/messages', icon: HiChatAlt2, label: 'Messages', active: true },
        { to: '/notifications', icon: HiBell, label: 'Notifications' },
    ]

    // ─── API Methods ────────────────────────────────────────────
    const fetchConvos = async () => {
        try {
            const { data } = await chatApi.get('')
            setConversations(data.data || [])
        } catch (err) { console.error("Convo error", err) }
    }

    useEffect(() => {
        if (!convoId) {
            setActiveConvo(null)
            setMessages([])
            return
        }

        setMessages([])
        setLoading(true)
        
        const match = conversations.find(c => c._id === convoId)
        if (match) setActiveConvo(match)

        const fetchId = ++currentFetchId.current

        const switchChat = async () => {
            try {
                socket?.emit('join_conversation', convoId)
                const { data } = await chatApi.get(`${convoId}/messages`)
                if (fetchId !== currentFetchId.current) return
                setMessages(data.data || [])
                await chatApi.patch(`${convoId}/messages/read`, {})
                window.dispatchEvent(new CustomEvent('peernet:sync-counts'))
                setTimeout(() => scrollToBottom('instant'), 50)
            } catch (err) {
                if (fetchId === currentFetchId.current) toast.error("Failed to load")
            } finally {
                if (fetchId === currentFetchId.current) setLoading(false)
            }
        }
        switchChat()
        return () => { if (convoId) socket?.emit('leave_conversation', convoId) }
    }, [convoId, conversations, socket])

    useEffect(() => { fetchConvos() }, [])

    // ─── Socket Logic ───────────────────────────────────────────
    useEffect(() => {
        if (!socket) return
        const handleNewMsg = (msg) => {
            if (msg.conversationId === convoId) {
                setMessages(prev => {
                    const exists = prev.find(m => m._id === msg._id || m.tempId === msg.tempId)
                    if (exists) return prev.map(m => (m._id === exists._id ? msg : m))
                    return [...prev, msg]
                })
                setTimeout(() => scrollToBottom(), 50)
            }
            setConversations(prev => prev.map(c => 
                c._id === msg.conversationId ? { ...c, lastMessage: msg, unreadCount: (c.unreadCount || 0) + (convoId === c._id ? 0 : 1) } : c
            ))
        }
        socket.on('new_message', handleNewMsg)
        socket.on('user_typing_start', ({ userId }) => { if (userId !== user?._id) setPeerTyping(true) })
        socket.on('user_typing_stop', ({ userId }) => { if (userId !== user?._id) setPeerTyping(false) })
        return () => {
            socket.off('new_message')
            socket.off('user_typing_start')
            socket.off('user_typing_stop')
        }
    }, [socket, convoId, user?._id])

    // ─── Actions ────────────────────────────────────────────────
    const scrollToBottom = (behavior = 'smooth') => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior })
        }
    }

    const handleSend = async () => {
        if (!inputText.trim() || !convoId) return
        const body = inputText
        const tempId = Date.now()
        setInputText('')
        if (inputRef.current) inputRef.current.style.height = 'auto'

        const opt = { _id: `temp_${tempId}`, tempId, body, sender: user._id, createdAt: new Date().toISOString(), status: 'sending' }
        setMessages(prev => [...prev, opt])
        setTimeout(() => scrollToBottom(), 50)

        try {
            await chatApi.post(`${convoId}/messages`, { body, tempId })
        } catch (err) {
            setMessages(prev => prev.map(m => m.tempId === tempId ? { ...m, status: 'failed' } : m))
            toast.error("Failed to send")
        }
    }

    const handleType = (e) => {
        setInputText(e.target.value)
        e.target.style.height = 'auto'
        e.target.style.height = `${e.target.scrollHeight}px`
        if (!socket || !convoId) return
        socket.emit('typing_start', { conversationId: convoId })
        clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => socket.emit('typing_stop', { conversationId: convoId }), 2000)
    }

    const filtered = conversations.filter(c => {
        const peer = c.participants?.find(p => (p._id || p) !== user?._id)
        return peer?.username?.toLowerCase().includes(searchText.toLowerCase())
    })

    const activePeer = activeConvo?.participants?.find(p => (p._id || p) !== user?._id)

    return (
        <div className={`v4-root ${convoId ? 'mobile-chat-active' : ''}`}>
            
            {/* PANEL 1: Global Navigation */}
            <aside className="v4-nav-panel">
                <div className="mb-8">
                    <img src="/assets/logo.png" className="w-8 h-8 rounded-lg" alt="" />
                </div>
                {navLinks.map(link => (
                    <div 
                        key={link.to} 
                        className={`v4-nav-item ${link.active ? 'active' : ''}`}
                        onClick={() => navigate(link.to)}
                        title={link.label}
                    >
                        <link.icon size={22} />
                    </div>
                ))}
                <div className="mt-auto flex flex-col gap-4">
                    <div className="v4-nav-item" onClick={() => navigate('/settings')} title="Settings"><HiCog size={22} /></div>
                    <div className="v4-nav-item" onClick={() => logout()} title="Logout"><HiLogout size={22} /></div>
                </div>
            </aside>

            {/* PANEL 2: Conversation List */}
            <aside className="v4-middle-panel">
                <header className="v4-middle-header">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="v4-middle-title">Messages</h1>
                        <button className="v4-nav-item" style={{ marginBottom: 0, width: 32, height: 32 }}>
                            <HiPencilAlt size={18} />
                        </button>
                    </div>
                    <div className="v4-search-box">
                        <HiSearch className="text-zinc-500" />
                        <input 
                            className="v4-search-input" 
                            placeholder="Search chats..." 
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {conversations.length === 0 ? (
                        <div className="space-y-2 p-4">
                            {[1,2,3,4,5,6].map(i => (
                                <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                                    <div className="w-12 h-12 bg-zinc-900 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-zinc-900 rounded w-1/2" />
                                        <div className="h-2 bg-zinc-900 rounded w-3/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-zinc-500 text-sm">No results found for "{searchText}"</p>
                        </div>
                    ) : (
                        filtered.map(c => {
                            const peer = c.participants?.find(p => (p._id || p) !== user?._id)
                            const isActive = convoId === c._id
                            const hasUnread = c.unreadCount > 0 && !isActive
                            
                            return (
                                <div 
                                    key={c._id} 
                                    className={`v4-convo-item ${isActive ? 'active' : ''}`}
                                    onClick={() => navigate(`/messages/${c._id}`)}
                                >
                                    <div className="v4-avatar-wrap">
                                        <img 
                                            src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=7C3AED&color=fff`} 
                                            className="v4-avatar" 
                                            alt="" 
                                        />
                                        {c.isOnline && <div className="v4-online-dot" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <span className={`v4-header-name ${hasUnread ? 'font-black' : ''}`}>
                                                {peer?.username}
                                            </span>
                                            <span className="text-[10px] text-zinc-500">
                                                {timeago(c.lastMessage?.createdAt || c.updatedAt)}
                                            </span>
                                        </div>
                                        <p className={`text-sm truncate ${hasUnread ? 'text-white font-bold' : 'text-zinc-500'}`}>
                                            {peerTyping && isActive ? 'typing...' : (c.lastMessage?.body || 'Sent an attachment')}
                                        </p>
                                    </div>
                                    {hasUnread && <div className="v4-unread-badge">{c.unreadCount}</div>}
                                </div>
                            )
                        })
                    )}
                </div>
            </aside>

            {/* PANEL 3: Chat Viewport */}
            <main className="v4-chat-main">
                {activeConvo ? (
                    <>
                        <header className="v4-chat-header">
                            <div className="v4-header-user">
                                <HiChevronLeft 
                                    className="lg:hidden text-2xl mr-2 cursor-pointer" 
                                    onClick={() => navigate('/messages')} 
                                />
                                <img 
                                    src={activePeer?.avatarUrl || `https://ui-avatars.com/api/?name=${activePeer?.username}&background=7C3AED&color=fff`} 
                                    className="w-10 h-10 rounded-xl object-cover" 
                                    alt="" 
                                />
                                <div>
                                    <div className="v4-header-name">{activePeer?.fullName || activePeer?.username}</div>
                                    <div className="v4-header-status">
                                        {activeConvo.isOnline ? (
                                            <span className="flex items-center gap-1.5 text-green-500">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                Active Now
                                            </span>
                                        ) : 'Offline'}
                                    </div>
                                </div>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar" ref={scrollRef} key={convoId}>
                            {loading ? (
                                <div className="space-y-6 py-10">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                                            <div className="w-2/3 h-12 bg-zinc-900 rounded-2xl animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center py-12 border-b border-zinc-900/50 mb-8">
                                        <img src={activePeer?.avatarUrl || `https://ui-avatars.com/api/?name=${activePeer?.username}&background=7C3AED&color=fff`} className="w-24 h-24 rounded-3xl mb-4 shadow-2xl" alt="" />
                                        <h2 className="text-2xl font-black text-white">{activePeer?.fullName || activePeer?.username}</h2>
                                        <p className="text-zinc-500 mb-4">@{activePeer?.username}</p>
                                        <button className="px-6 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl transition-all border border-white/5" onClick={() => navigate(`/profile/${activePeer?._id}`)}>View Profile</button>
                                    </div>

                                    {messages.map((m, i) => {
                                        const isSelf = (m.sender?._id || m.sender) === user?._id
                                        const isPrevSame = messages[i-1] && (messages[i-1].sender?._id || messages[i-1].sender) === (m.sender?._id || m.sender)
                                        const isNextSame = messages[i+1] && (messages[i+1].sender?._id || messages[i+1].sender) === (m.sender?._id || m.sender)
                                        
                                        return (
                                            <motion.div
                                                key={m._id}
                                                initial={{ opacity: 0, scale: 0.98, y: 5 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div 
                                                    className={`max-w-[75%] px-4 py-3 text-[15px] leading-relaxed shadow-sm
                                                        ${isSelf ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white' : 'bg-zinc-900 text-zinc-100'}
                                                    `}
                                                    style={{
                                                        borderRadius: isSelf 
                                                            ? `${isPrevSame ? '20px' : '20px'} ${isPrevSame ? '4px' : '20px'} ${isNextSame ? '4px' : '20px'} 20px`
                                                            : `${isPrevSame ? '4px' : '20px'} ${isPrevSame ? '20px' : '20px'} 20px ${isNextSame ? '4px' : '20px'}`
                                                    }}
                                                >
                                                    {m.body}
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                    
                                    <AnimatePresence>
                                        {peerTyping && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-1 py-2">
                                                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}
                        </div>

                        <div className="p-6">
                            <div className="relative flex items-end gap-3 bg-zinc-900/50 border border-white/5 rounded-3xl p-3 focus-within:border-purple-500/50 transition-all">
                                <button className="p-2 text-zinc-400 hover:text-white" onClick={() => setShowEmoji(!showEmoji)}>
                                    <HiOutlineEmojiHappy size={24} />
                                </button>
                                <textarea 
                                    ref={inputRef}
                                    rows="1"
                                    className="flex-1 bg-transparent border-none outline-none text-white py-2 resize-none no-scrollbar"
                                    placeholder="Write a message..."
                                    value={inputText}
                                    onChange={handleType}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                                    style={{ maxHeight: 120 }}
                                />
                                {inputText.trim() ? (
                                    <button className="px-4 py-2 text-purple-500 font-black hover:scale-110 transition-transform" onClick={handleSend}>Send</button>
                                ) : (
                                    <button className="p-2 text-zinc-400 hover:text-white"><HiOutlinePhotograph size={24} /></button>
                                )}

                                {showEmoji && (
                                    <div className="absolute bottom-full mb-4 right-0 z-50">
                                        <EmojiPicker onEmojiSelect={(e) => setInputText(prev => prev + e.native)} theme="dark" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full flex items-center justify-center mb-6 border border-white/5">
                            <HiChatAlt2 size={48} className="text-purple-500" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2">Direct Messages</h2>
                        <p className="text-zinc-500 max-w-sm mb-8">Connect with friends and share your thoughts in a private, secure space.</p>
                        <button className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-purple-500/20">Start New Chat</button>
                    </div>
                )}
            </main>
        </div>
    )
}
