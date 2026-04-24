import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { HiPencilAlt, HiSearch, HiOutlinePhotograph, HiOutlineEmojiHappy, HiChevronLeft } from 'react-icons/hi'
import { useAuth } from '../context/AuthContext'
import api, { chatApi } from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import { timeago } from '../utils/timeago'
import toast from 'react-hot-toast'
import EmojiPicker from '@emoji-mart/react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Messages() {
    const { id: convoId } = useParams()
    const { user } = useAuth()
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

    // ─── Loading Data ───────────────────────────────────────────
    const fetchConvos = async () => {
        try {
            const { data } = await chatApi.get('')
            setConversations(data.data || [])
        } catch (err) {
            console.error("Convo error", err)
        }
    }

    const fetchMessages = useCallback(async (id) => {
        if (!id) return
        setLoading(true)
        try {
            const { data } = await chatApi.get(`${id}/messages`)
            setMessages(data.data || [])
            await chatApi.patch(`${id}/messages/read`, {})
            window.dispatchEvent(new CustomEvent('peernet:sync-counts'))
            scrollToBottom('instant')
        } catch (err) {
            toast.error("Failed to load messages")
        } finally {
            setLoading(false)
        }
    }, [])

    // ─── Loading Data ───────────────────────────────────────────
    useEffect(() => {
        if (!convoId) {
            setActiveConvo(null)
            setMessages([])
            return
        }

        const switchChat = async () => {
            // SYNC CLEAR: Prevent stale messages from showing
            setMessages([])
            setLoading(true)
            
            const match = conversations.find(c => c._id === convoId)
            if (match) setActiveConvo(match)
            
            try {
                await fetchMessages(convoId)
                socket?.emit('join_conversation', convoId)
            } catch (err) {
                console.error("Switch error", err)
            } finally {
                setLoading(false)
            }
        }

        switchChat()
        return () => { if (convoId) socket?.emit('leave_conversation', convoId) }
    }, [convoId, conversations, fetchMessages, socket])

    useEffect(() => { fetchConvos() }, [])

    // ─── Socket Events ──────────────────────────────────────────
    useEffect(() => {
        if (!socket) return
        const handleNewMsg = (msg) => {
            if (msg.conversationId === convoId) {
                setMessages(prev => {
                    const exists = prev.find(m => m._id === msg._id || m.tempId === msg.tempId)
                    if (exists) return prev.map(m => (m._id === exists._id ? msg : m))
                    return [...prev, msg]
                })
                scrollToBottom()
            }
            setConversations(prev => prev.map(c => 
                c._id === msg.conversationId ? { ...c, lastMessage: msg } : c
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
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }

    const handleSend = async () => {
        if (!inputText.trim() || !convoId) return
        const tempId = Date.now()
        const body = inputText
        setInputText('')

        // Optimistic
        const opt = { _id: `temp_${tempId}`, tempId, body, sender: user._id, createdAt: new Date().toISOString(), status: 'sending' }
        setMessages(prev => [...prev, opt])
        scrollToBottom()

        try {
            await chatApi.post(`${convoId}/messages`, { body, tempId })
        } catch (err) {
            setMessages(prev => prev.map(m => m.tempId === tempId ? { ...m, status: 'failed' } : m))
            toast.error("Failed to send")
        }
    }

    const handleType = (e) => {
        setInputText(e.target.value)
        if (!socket || !convoId) return
        socket.emit('typing_start', { conversationId: convoId })
        clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => {
            socket.emit('typing_stop', { conversationId: convoId })
        }, 2000)
    }

    const filtered = conversations.filter(c => {
        const peer = c.participants?.find(p => (p._id || p) !== user?._id)
        return peer?.username?.toLowerCase().includes(searchText.toLowerCase())
    })

    const activePeer = activeConvo?.participants?.find(p => (p._id || p) !== user?._id)

    return (
        <div className={`ig-root ${convoId ? 'mobile-chat-active' : ''}`}>
            {/* Sidebar */}
            <aside className="ig-sidebar">
                <header className="ig-sidebar-header">
                    <div className="ig-sidebar-title-row">
                        <h1 className="ig-sidebar-title">{user?.username}</h1>
                        <HiPencilAlt className="ig-sidebar-action" onClick={() => {}} />
                    </div>
                    <div className="ig-search-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <HiSearch style={{ position: 'absolute', left: 12, color: '#8e8e8e' }} />
                        <input 
                            className="ig-composer-input" 
                            style={{ background: '#262626', borderRadius: 8, padding: '8px 12px 8px 36px', width: '100%' }}
                            placeholder="Search"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>
                </header>

                <div className="ig-convo-list no-scrollbar">
                    {conversations.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-zinc-500 text-sm">No messages yet. Start a new conversation to connect with friends.</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-zinc-500 text-sm">No results found for "{searchText}"</p>
                        </div>
                    ) : (
                        filtered.map(c => {
                            const peer = c.participants?.find(p => (p._id || p) !== user?._id)
                            const avatar = peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=7C3AED&color=fff`
                            return (
                                <div 
                                    key={c._id} 
                                    className={`ig-convo-item ${convoId === c._id ? 'active' : ''}`}
                                    onClick={() => navigate(`/messages/${c._id}`)}
                                >
                                    <img src={avatar} className="ig-avatar" alt="" />
                                    <div className="ig-convo-info">
                                        <span className="ig-username">{peer?.username}</span>
                                        <p className="ig-last-msg truncate">
                                            {c.lastMessage?.body || 'Sent an attachment'} · {timeago(c.lastMessage?.createdAt || c.updatedAt)}
                                        </p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="ig-chat-main">
                {activeConvo ? (
                    <>
                        <header className="ig-chat-header">
                            <div className="ig-header-user">
                                <HiChevronLeft 
                                    className="ig-mobile-back" 
                                    onClick={() => navigate('/messages')} 
                                    style={{ fontSize: 24, marginRight: 12, cursor: 'pointer' }}
                                />
                                <div className="flex items-center" onClick={() => navigate(`/profile/${activePeer?._id}`)}>
                                    <img 
                                        src={activePeer?.avatarUrl || `https://ui-avatars.com/api/?name=${activePeer?.username}&background=7C3AED&color=fff`} 
                                        className="ig-avatar-sm" 
                                        alt="" 
                                    />
                                    <div>
                                        <div className="ig-header-name">{activePeer?.fullName || activePeer?.username}</div>
                                        <div style={{ fontSize: 12, color: '#a8a8a8' }}>{activeConvo.isOnline ? 'Active now' : 'Offline'}</div>
                                    </div>
                                </div>
                            </div>
                        </header>

                        <div className="ig-messages-viewport dark-scrollbar" ref={scrollRef}>
                            <div className="ig-messages-inner">
                                {loading ? (
                                    <div className="flex flex-col gap-4 py-10">
                                        {[1,2,3,4,5].map(i => (
                                            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                                                <div className="ig-skeleton" style={{ width: i % 2 === 0 ? '40%' : '60%', height: 40, borderRadius: 20 }} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-center py-10 flex flex-col items-center">
                                            <img 
                                                src={activePeer?.avatarUrl || `https://ui-avatars.com/api/?name=${activePeer?.username}&background=7C3AED&color=fff`} 
                                                className="rounded-full mb-4 border-4 border-zinc-900" 
                                                style={{ width: 110, height: 110, objectFit: 'cover' }}
                                                alt="" 
                                            />
                                            <h2 className="text-2xl font-extrabold text-white">{activePeer?.fullName || activePeer?.username}</h2>
                                            <p className="text-zinc-500 text-sm">{activePeer?.username} · PeerNet Member</p>
                                            <button 
                                                className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors"
                                                onClick={() => navigate(`/profile/${activePeer?._id}`)}
                                            >
                                                View Profile
                                            </button>
                                        </div>

                                        {messages.map((m, i) => {
                                            const prev = messages[i-1]
                                            const next = messages[i+1]
                                            const isSelf = (m.sender?._id || m.sender) === user?._id
                                            const isPrevSame = prev && (prev.sender?._id || prev.sender) === (m.sender?._id || m.sender)
                                            const isNextSame = next && (next.sender?._id || next.sender) === (m.sender?._id || m.sender)

                                            return (
                                                <motion.div
                                                    key={m._id}
                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                                                >
                                                    <MessageItem 
                                                        message={m} 
                                                        isSelf={isSelf} 
                                                        isPrevSame={isPrevSame} 
                                                        isNextSame={isNextSame} 
                                                        activePeer={activePeer}
                                                    />
                                                </motion.div>
                                            )
                                        })}
                                    </>
                                )}
                                <AnimatePresence>
                                    {peerTyping && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="ig-typing-indicator"
                                        >
                                            <div className="dot" />
                                            <div className="dot" />
                                            <div className="dot" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="ig-composer-area" style={{ position: 'relative' }}>
                            <div className="ig-composer-pill">
                                <HiOutlineEmojiHappy 
                                    className="ig-sidebar-action" 
                                    style={{ marginRight: 12 }} 
                                    onClick={() => setShowEmoji(!showEmoji)} 
                                />
                                <textarea 
                                    rows="1"
                                    className="ig-composer-input"
                                    placeholder="Message..."
                                    value={inputText}
                                    onChange={handleType}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                                />
                                {inputText.trim() ? (
                                    <span className="ig-composer-btn" onClick={handleSend}>Send</span>
                                ) : (
                                    <HiOutlinePhotograph className="ig-sidebar-action" style={{ marginLeft: 12 }} />
                                )}
                            </div>
                            {showEmoji && (
                                <div style={{ position: 'absolute', bottom: 80, right: 20, zIndex: 1000 }}>
                                    <EmojiPicker 
                                        onEmojiSelect={(e) => setInputText(prev => prev + e.native)} 
                                        theme="dark"
                                    />
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="ig-chat-main items-center justify-center">
                        <div className="text-center">
                            <div style={{ fontSize: 80, marginBottom: 20 }}>✉️</div>
                            <h2 className="ig-sidebar-title" style={{ fontSize: 20 }}>Your Messages</h2>
                            <p className="ig-last-msg">Send private photos and messages to a friend or group.</p>
                            <button 
                                className="btn" 
                                style={{ background: '#0095f6', color: '#fff', padding: '8px 24px', borderRadius: 8, marginTop: 20 }}
                                onClick={() => {}}
                            >
                                Send Message
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

// ─── Sub-Components ───────────────────────────────────────────

const MessageItem = React.memo(({ message, isSelf, isPrevSame, isNextSame, activePeer }) => {
    // Adaptive Radius Logic
    let radius = '22px'
    if (isSelf) {
        if (isPrevSame && isNextSame) radius = '22px 4px 4px 22px'
        else if (isPrevSame) radius = '22px 4px 22px 22px'
        else if (isNextSame) radius = '22px 22px 4px 22px'
        else radius = '22px 22px 4px 22px'
    } else {
        if (isPrevSame && isNextSame) radius = '4px 22px 22px 4px'
        else if (isPrevSame) radius = '4px 22px 22px 22px'
        else if (isNextSame) radius = '22px 22px 22px 4px'
        else radius = '22px 22px 22px 4px'
    }

    return (
        <div className={`ig-msg-row ${isSelf ? 'self' : 'peer'}`} style={{ marginBottom: isNextSame ? 2 : 12 }}>
            {!isSelf && (
                <div style={{ width: 28, height: 28, marginRight: 8, alignSelf: 'flex-end', marginBottom: 4 }}>
                    {!isNextSame && (
                        <img 
                            src={activePeer?.avatarUrl || `https://ui-avatars.com/api/?name=${activePeer?.username}&background=7C3AED&color=fff`} 
                            className="ig-avatar" 
                            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                            alt="" 
                        />
                    )}
                </div>
            )}
            <div 
                className={`ig-bubble ${isSelf ? 'ig-bubble-self' : 'ig-bubble-peer'}`}
                style={{ borderRadius: radius }}
            >
                {message.body}
            </div>
        </div>
    )
})
