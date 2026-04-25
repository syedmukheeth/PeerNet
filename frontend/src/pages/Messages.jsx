import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
    HiPencilAlt, HiSearch, HiOutlinePhotograph, HiOutlineEmojiHappy, HiChevronLeft,
    HiHome, HiFilm, HiChatAlt2, HiBell, HiCog, HiLogout
} from 'react-icons/hi'
import { useAuth } from '../context/AuthContext'
import { chatApi } from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import { timeago } from '../utils/timeago'
import toast from 'react-hot-toast'
import EmojiPicker from '@emoji-mart/react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Memoized Components ──────────────────────────────────────
const MessageItem = React.memo(({ m, isSelf, groupClass, timeLabel }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`message-row ${isSelf ? 'self' : 'peer'} ${groupClass}`}
    >
        <div className="message-bubble">
            {m.body}
            <div className="text-[10px] opacity-50 mt-1">{timeLabel}</div>
        </div>
    </motion.div>
))
MessageItem.displayName = 'MessageItem'

const ConvoItem = React.memo(({ c, isActive, hasUnread, peer, peerTyping, onClick }) => (
    <div 
        className={`convo-item ${isActive ? 'active' : ''}`}
        onClick={onClick}
    >
        <div className="avatar-wrap">
            <img 
                src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=7C3AED&color=fff`} 
                className="avatar" 
                alt="" 
                loading="lazy"
            />
            {c.isOnline && <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-[#09090b] rounded-full" />}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
                <span className={`text-[15px] ${hasUnread ? 'font-black' : 'font-bold'}`}>
                    {peer?.username}
                </span>
                <span className="text-[11px] opacity-40">
                    {timeago(c.lastMessage?.createdAt || c.updatedAt)}
                </span>
            </div>
            <p className={`text-[13px] truncate ${hasUnread ? 'text-white font-bold' : 'opacity-50'}`}>
                {peerTyping ? 'typing...' : (c.lastMessage?.body || 'Sent an attachment')}
            </p>
        </div>
        {hasUnread && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
    </div>
))
ConvoItem.displayName = 'ConvoItem'

export default function Messages() {
    const { id: convoId } = useParams()
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const socket = useSocket(user)

    // ─── State ──────────────────────────────────────────────────
    const [conversations, setConversations] = useState([])
    const [messages, setMessages] = useState([])
    const [messageCache, setMessageCache] = useState({}) // CACHE
    const [loading, setLoading] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [inputText, setInputText] = useState('')
    const [showEmoji, setShowEmoji] = useState(false)
    const [peerTyping, setPeerTyping] = useState(false)

    const scrollRef = useRef()
    const inputRef = useRef()
    const typingTimer = useRef()
    const currentFetchId = useRef(0)
    const messageCacheRef = useRef({})

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior })
        }
    }, [])

    useEffect(() => {
        messageCacheRef.current = messageCache
    }, [messageCache])

    // ─── Debounced Search ───────────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchText), 300)
        return () => clearTimeout(timer)
    }, [searchText])

    // ─── Navigation Links ───────────────────────────────────────
    const navLinks = useMemo(() => [
        { to: '/', icon: HiHome, label: 'Home' },
        { to: '/search', icon: HiSearch, label: 'Search' },
        { to: '/shorts', icon: HiFilm, label: 'Shorts' },
        { to: '/messages', icon: HiChatAlt2, label: 'Messages', active: true },
        { to: '/notifications', icon: HiBell, label: 'Notifications' },
    ], [])

    // ─── Fetch Conversations ────────────────────────────────────
    const fetchConvos = useCallback(async () => {
        try {
            const { data } = await chatApi.get('')
            setConversations(data.data || [])
        } catch (err) { console.error("Convo error", err) }
    }, [])

    useEffect(() => { fetchConvos() }, [fetchConvos])

    // ─── Fetch Messages with Caching ────────────────────────────
    useEffect(() => {
        if (!convoId) {
            setMessages([])
            return
        }

        // Use cache if available for instant switch
        const cachedMessages = messageCacheRef.current[convoId]
        if (cachedMessages) {
            setMessages(cachedMessages)
            setLoading(false)
            setTimeout(() => scrollToBottom('instant'), 50)
        } else {
            setMessages([])
            setLoading(true)
        }
        
        const fetchId = ++currentFetchId.current

        const switchChat = async () => {
            try {
                socket?.emit('join_conversation', convoId)
                const { data } = await chatApi.get(`${convoId}/messages`)
                if (fetchId !== currentFetchId.current) return
                
                const newMsgs = data.data || []
                setMessages(newMsgs)
                setMessageCache(prev => ({ ...prev, [convoId]: newMsgs }))
                
                await chatApi.patch(`${convoId}/messages/read`, {})
                window.dispatchEvent(new CustomEvent('peernet:sync-counts'))
                setTimeout(() => scrollToBottom('instant'), 50)
            } catch {
                if (fetchId === currentFetchId.current) toast.error("Failed to load")
            } finally {
                if (fetchId === currentFetchId.current) setLoading(false)
            }
        }
        switchChat()
        return () => { if (convoId) socket?.emit('leave_conversation', convoId) }
    }, [convoId, socket, scrollToBottom])

    // ─── Socket Logic ───────────────────────────────────────────
    useEffect(() => {
        if (!socket) return
        const handleNewMsg = (msg) => {
            if (msg.conversationId === convoId) {
                setMessages(prev => {
                    const exists = prev.find(m => m._id === msg._id || m.tempId === msg.tempId)
                    const updated = exists ? prev.map(m => (m._id === exists._id ? msg : m)) : [...prev, msg]
                    setMessageCache(cache => ({ ...cache, [convoId]: updated }))
                    return updated
                })
                setTimeout(() => scrollToBottom(), 50)
            } else {
                // Update cache even if not active
                setMessageCache(cache => {
                    const existing = cache[msg.conversationId] || []
                    return { ...cache, [msg.conversationId]: [...existing, msg] }
                })
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
    }, [socket, convoId, user?._id, scrollToBottom])

    // ─── Actions ────────────────────────────────────────────────
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
        } catch {
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

    const filtered = useMemo(() => conversations.filter(c => {
        const peer = c.participants?.find(p => (p._id || p) !== user?._id)
        return peer?.username?.toLowerCase().includes(debouncedSearch.toLowerCase())
    }), [conversations, debouncedSearch, user?._id])

    const activePeer = useMemo(() => {
        const active = conversations.find(c => c._id === convoId)
        return active?.participants?.find(p => (p._id || p) !== user?._id)
    }, [conversations, convoId, user?._id])

    return (
        <div className={`messages-layout ${convoId ? 'mobile-chat-active' : ''}`}>
            
            {/* PANEL 1: Global Navigation (Desktop) */}
            <aside className="messages-nav">
                <div className="mb-8">
                    <img src="/assets/logo.png" className="w-8 h-8 rounded-lg" alt="" />
                </div>
                {navLinks.map(link => (
                    <div 
                        key={link.to} 
                        className={`messages-nav-item ${link.active ? 'active' : ''}`}
                        onClick={() => navigate(link.to)}
                        title={link.label}
                    >
                        <link.icon size={22} />
                    </div>
                ))}
                <div className="mt-auto flex flex-col gap-4">
                    <div className="messages-nav-item" onClick={() => navigate('/settings')} title="Settings"><HiCog size={22} /></div>
                    <div className="messages-nav-item" onClick={() => logout()} title="Logout"><HiLogout size={22} /></div>
                </div>
            </aside>

            {/* MOBILE NAVIGATION BAR */}
            <nav className="messages-mobile-nav lg:hidden">
                {navLinks.map(link => (
                    <div 
                        key={link.to} 
                        className={`messages-mobile-nav-item ${link.active ? 'active' : ''}`}
                        onClick={() => navigate(link.to)}
                    >
                        <link.icon size={20} />
                    </div>
                ))}
            </nav>

            {/* PANEL 2: Conversation List */}
            <aside className="messages-sidebar">
                <header>
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-black">Messages</h1>
                        <HiPencilAlt size={22} className="cursor-pointer hover:opacity-70 transition-opacity" />
                    </div>
                    <div className="search-box">
                        <HiSearch className="opacity-40" />
                        <input 
                            className="bg-transparent border-none outline-none text-sm w-full" 
                            placeholder="Search messages..." 
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-0">
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
                            <div className="w-16 h-16 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                <HiSearch size={24} className="text-zinc-600" />
                            </div>
                            <p className="text-zinc-500 text-sm">No results for &quot;{searchText}&quot;</p>
                        </div>
                    ) : (
                        filtered.map(c => {
                            const peer = c.participants?.find(p => (p._id || p) !== user?._id)
                            const isActive = convoId === c._id
                            const hasUnread = c.unreadCount > 0 && !isActive
                            return (
                                <ConvoItem 
                                    key={c._id}
                                    c={c}
                                    isActive={isActive}
                                    hasUnread={hasUnread}
                                    peer={peer}
                                    peerTyping={peerTyping && isActive}
                                    onClick={() => navigate(`/messages/${c._id}`)}
                                />
                            )
                        })
                    )}
                </div>
            </aside>

            {/* PANEL 3: Chat Viewport */}
            <main className="messages-content">
                {activePeer ? (
                    <>
                        <header className="chat-header">
                            <div className="flex items-center gap-3">
                                <HiChevronLeft 
                                    className="lg:hidden text-2xl cursor-pointer" 
                                    onClick={() => navigate('/messages')} 
                                />
                                <div className="relative">
                                    <img 
                                        src={activePeer?.avatarUrl || `https://ui-avatars.com/api/?name=${activePeer?.username}&background=7C3AED&color=fff`} 
                                        className="w-10 h-10 rounded-xl object-cover" 
                                        alt="" 
                                    />
                                    {activePeer.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#09090b] rounded-full" />}
                                </div>
                                <div>
                                    <div className="font-bold text-[15px]">{activePeer?.fullName || activePeer?.username}</div>
                                    <div className="text-[11px] opacity-50">
                                        {activePeer.isOnline ? 'Online' : activePeer.lastSeen ? `Active ${timeago(activePeer.lastSeen)}` : 'Offline'}
                                    </div>
                                </div>
                            </div>
                        </header>

                        <motion.div 
                            key={convoId}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="chat-viewport no-scrollbar" 
                            ref={scrollRef}
                        >
                            {loading && !messageCache[convoId] ? (
                                <div className="space-y-6 py-10">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                                            <div className="w-2/3 h-14 bg-zinc-900/50 rounded-2xl animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center py-12 border-b border-white/5 mb-8">
                                        <motion.img 
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            src={activePeer?.avatarUrl || `https://ui-avatars.com/api/?name=${activePeer?.username}&background=7C3AED&color=fff`} 
                                            className="w-24 h-24 rounded-3xl mb-4 shadow-2xl border-2 border-white/10" 
                                            alt="" 
                                        />
                                        <h2 className="text-2xl font-black text-white">{activePeer?.fullName || activePeer?.username}</h2>
                                        <p className="text-zinc-500 mb-4 text-sm">@{activePeer?.username}</p>
                                        <button className="px-6 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl transition-all border border-white/5 text-sm" onClick={() => navigate(`/profile/${activePeer?._id}`)}>View Profile</button>
                                    </div>

                                    {messages.map((m, i) => {
                                        const isSelf = (m.sender?._id || m.sender) === user?._id
                                        const prevM = messages[i-1]
                                        const nextM = messages[i+1]
                                        const isPrevSame = prevM && (prevM.sender?._id || prevM.sender) === (m.sender?._id || m.sender)
                                        const isNextSame = nextM && (nextM.sender?._id || nextM.sender) === (m.sender?._id || m.sender)

                                        let groupClass = ''
                                        if (isPrevSame && isNextSame) groupClass = 'mt-0.5'
                                        else if (isPrevSame) groupClass = 'mt-0.5'
                                        else groupClass = 'mt-4'
                                        
                                        return (
                                            <MessageItem 
                                                key={m._id}
                                                m={m}
                                                isSelf={isSelf}
                                                groupClass={groupClass}
                                                timeLabel={timeago(m.createdAt)}
                                            />
                                        )
                                    })}
                                    
                                    <AnimatePresence>
                                        {peerTyping && (
                                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex gap-1 py-2">
                                                <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}
                        </motion.div>

                        <footer className="composer-wrap">
                            <div className="composer-box">
                                <button className="opacity-50 hover:opacity-100 transition-opacity" onClick={() => setShowEmoji(!showEmoji)}>
                                    <HiOutlineEmojiHappy size={22} />
                                </button>
                                
                                <textarea 
                                    ref={inputRef}
                                    rows="1"
                                    className="flex-1 bg-transparent border-none outline-none text-[15px] py-2 no-scrollbar"
                                    placeholder="Message..."
                                    value={inputText}
                                    onChange={handleType}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                                />

                                {inputText.trim() ? (
                                    <button 
                                        className="text-blue-500 font-bold text-sm px-2 hover:text-blue-400 transition-colors"
                                        onClick={handleSend}
                                    >
                                        Send
                                    </button>
                                ) : (
                                    <button className="opacity-50 hover:opacity-100 transition-opacity">
                                        <HiOutlinePhotograph size={22} />
                                    </button>
                                )}

                                {showEmoji && (
                                    <div className="absolute bottom-full mb-4 right-0 z-50">
                                        <EmojiPicker 
                                            onEmojiSelect={(e) => setInputText(prev => prev + e.native)} 
                                            theme="dark"
                                            set="native"
                                        />
                                    </div>
                                )}
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full flex items-center justify-center mb-6 border border-white/5">
                            <HiChatAlt2 size={48} className="text-purple-500" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2">Direct Messages</h2>
                        <p className="text-zinc-500 max-w-sm mb-8">Connect with friends and share your thoughts in a private, secure space.</p>
                        <button className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-purple-500/20" onClick={() => navigate('/')}>Back to Feed</button>
                    </div>
                )}
            </main>
        </div>
    )
}
