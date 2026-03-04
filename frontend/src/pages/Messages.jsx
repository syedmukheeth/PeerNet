import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { io } from 'socket.io-client'
import {
    HiPaperAirplane, HiBadgeCheck, HiSearch, HiX,
    HiPencilAlt, HiArrowLeft
} from 'react-icons/hi'
import { timeago } from '../utils/timeago'
import toast from 'react-hot-toast'

let socket = null

function TypingIndicator() {
    return (
        <div className="typing-indicator">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
        </div>
    )
}

// ── New Conversation Modal ─────────────────────────────────
function NewConvoModal({ onClose, onStart }) {
    const [q, setQ] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)

    const handleSearch = async (e) => {
        const val = e.target.value
        setQ(val)
        if (val.length < 2) { setResults([]); return }
        setLoading(true)
        try {
            const { data } = await api.get('/users/search', { params: { q: val, limit: 15 } })
            setResults(data.data || [])
        } catch { /* silent */ }
        finally { setLoading(false) }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center" style={{ marginBottom: 18 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700 }}>New Message</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><HiX /></button>
                </div>

                <div className="search-bar" style={{ marginBottom: 16 }}>
                    <HiSearch style={{ color: 'var(--text-3)', fontSize: 18 }} />
                    <input
                        placeholder="Search people…"
                        value={q}
                        onChange={handleSearch}
                        autoFocus
                    />
                    {loading && <div className="spinner" style={{ width: 14, height: 14 }} />}
                </div>

                <div className="flex-col" style={{ gap: 4, maxHeight: 320, overflowY: 'auto' }}>
                    {results.map(u => {
                        const avatar = u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`
                        return (
                            <div key={u._id} className="user-row flex items-center gap-3 justify-between"
                                style={{ cursor: 'pointer' }}
                                onClick={() => onStart(u)}>
                                <div className="flex items-center gap-3">
                                    <img src={avatar} className="avatar avatar-md" alt="" />
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 14 }}>
                                            {u.username}
                                            {u.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13 }} />}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{u.fullName}</div>
                                    </div>
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Chat →</span>
                            </div>
                        )
                    })}
                    {q.length >= 2 && results.length === 0 && !loading && (
                        <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0', fontSize: 14 }}>
                            No users found for "{q}"
                        </p>
                    )}
                    {q.length < 2 && (
                        <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0', fontSize: 14 }}>
                            Type a name or username to search…
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────
export default function Messages() {
    const { id: paramConvoId } = useParams()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [conversations, setConversations] = useState([])
    const [activeConvo, setActiveConvo] = useState(null)
    const [messages, setMessages] = useState([])
    const [text, setText] = useState('')
    const [peerTyping, setPeerTyping] = useState(false)
    const [showNewConvo, setShowNewConvo] = useState(false)
    const [starting, setStarting] = useState(false)
    const [chatOpen, setChatOpen] = useState(false) // mobile slide
    const bottomRef = useRef()
    const typingTimer = useRef()
    const inputRef = useRef()

    // ── Socket setup ───────────────────────────────────────
    const userRef = useRef(user)
    useEffect(() => { userRef.current = user }, [user])

    useEffect(() => {
        const token = localStorage.getItem('accessToken')
        socket = io(window.location.origin, {
            auth: { token },
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        })
        socket.on('new_message', (msg) => {
            const senderId = msg.sender?._id || msg.sender
            if (senderId === userRef.current?._id) return
            setMessages(m => [...m, msg])
            // Update last message preview in convo list
            setConversations(cs => cs.map(c =>
                c._id === msg.conversationId
                    ? { ...c, lastMessage: msg }
                    : c
            ))
        })
        socket.on('user_typing', () => setPeerTyping(true))
        socket.on('user_stop_typing', () => setPeerTyping(false))
        return () => { socket?.disconnect(); socket = null }
    }, [])

    // ── Load conversations ──────────────────────────────────
    const loadConversations = async () => {
        const { data } = await api.get('/conversations')
        const convos = data.data || []
        setConversations(convos)
        return convos
    }

    useEffect(() => {
        loadConversations().then(convos => {
            if (paramConvoId) {
                const found = convos.find(c => c._id === paramConvoId)
                if (found) selectConvo(found)
            }
        }).catch(() => { })
    }, []) // eslint-disable-line

    // ── Select a conversation ──────────────────────────────
    const selectConvo = async (convo) => {
        if (activeConvo?._id === convo._id) { setChatOpen(true); return }
        if (activeConvo) socket?.emit('leave_conversation', activeConvo._id)
        setActiveConvo(convo)
        setMessages([])
        setChatOpen(true)
        socket?.emit('join_conversation', convo._id)
        navigate(`/messages/${convo._id}`, { replace: true })
        try {
            const { data } = await api.get(`/conversations/${convo._id}/messages`, { params: { limit: 50 } })
            setMessages(data.data || [])
        } catch { toast.error('Failed to load messages') }
        setTimeout(() => inputRef.current?.focus(), 100)
    }

    const closeChat = () => {
        setChatOpen(false)
        navigate('/messages', { replace: true })
    }

    // ── Start new conversation ─────────────────────────────
    const startConvoWith = async (targetUser) => {
        setShowNewConvo(false)
        setStarting(true)
        try {
            const { data } = await api.post('/conversations', { targetUserId: targetUser._id })
            const convo = data.data
            const fresh = await loadConversations()
            const found = fresh.find(c => c._id === convo._id) || {
                ...convo,
                participants: [user, targetUser],
            }
            await selectConvo(found)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to start conversation')
        } finally {
            setStarting(false)
        }
    }

    // ── Auto scroll ────────────────────────────────────────
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, peerTyping])

    // ── Send message ───────────────────────────────────────
    const handleSend = async (e) => {
        e.preventDefault()
        if (!text.trim() || !activeConvo) return
        const body = text.trim()
        setText('')
        clearTimeout(typingTimer.current)
        socket?.emit('stop_typing', { conversationId: activeConvo._id })
        try {
            const { data } = await api.post(`/conversations/${activeConvo._id}/messages`, { body })
            setMessages(m => [...m, data.data])
            setConversations(cs => cs.map(c => c._id === activeConvo._id
                ? { ...c, lastMessage: { body } } : c))
        } catch { toast.error('Failed to send'); setText(body) }
    }

    const handleTyping = (e) => {
        setText(e.target.value)
        if (activeConvo) {
            socket?.emit('typing', { conversationId: activeConvo._id })
            clearTimeout(typingTimer.current)
            typingTimer.current = setTimeout(() => {
                socket?.emit('stop_typing', { conversationId: activeConvo._id })
            }, 2000)
        }
    }

    const getOther = (convo) => convo.participants?.find(p => p._id !== user?._id)

    return (
        <>
            {/* chat-layout fills the full main-col height via CSS */}
            <div className="chat-layout" style={{ margin: '-28px -24px', height: 'calc(100dvh - 0px)' }}>

                {/* ── Conversation List ── */}
                <div className="convo-list">
                    <div className="convo-list-header">
                        <h2 style={{ fontWeight: 800, fontSize: 18, fontFamily: "'Syne','Inter',sans-serif" }}>
                            Messages
                        </h2>
                        <button
                            className="btn btn-primary btn-icon"
                            onClick={() => setShowNewConvo(true)}
                            title="New Message"
                            style={{ width: 34, height: 34 }}>
                            <HiPencilAlt style={{ fontSize: 16 }} />
                        </button>
                    </div>

                    {starting && (
                        <div className="flex justify-center" style={{ padding: 20 }}>
                            <div className="spinner" />
                        </div>
                    )}

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {conversations.map((c) => {
                            const other = getOther(c)
                            const avatar = other?.avatarUrl || `https://ui-avatars.com/api/?name=${other?.username}&background=6366F1&color=fff`
                            return (
                                <div key={c._id}
                                    className={`convo-item ${activeConvo?._id === c._id ? 'active' : ''}`}
                                    onClick={() => selectConvo(c)}>
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <img src={avatar} className="avatar avatar-md" alt=""
                                            style={{ boxShadow: other?.isVerified ? '0 0 0 2px var(--accent)' : 'none' }} />
                                        <div style={{
                                            position: 'absolute', bottom: 1, right: 1,
                                            width: 10, height: 10,
                                            background: 'var(--success)',
                                            borderRadius: '50%',
                                            border: '2px solid var(--surface)',
                                        }} />
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 14 }}>
                                                {other?.username}
                                                {other?.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13 }} />}
                                            </div>
                                            {c.lastMessage?.createdAt && (
                                                <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
                                                    {timeago(c.lastMessage.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="truncate" style={{ fontSize: 13, color: 'var(--text-3)' }}>
                                            {c.lastMessage?.body || 'Say hello 👋'}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {conversations.length === 0 && !starting && (
                            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-3)' }}>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
                                <p style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>No messages yet</p>
                                <p style={{ fontSize: 13, marginBottom: 16 }}>Start a new conversation</p>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowNewConvo(true)}>
                                    + New Message
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Chat Area ── */}
                <div className={`chat-area ${chatOpen ? 'open' : ''}`}>
                    {activeConvo ? (() => {
                        const other = getOther(activeConvo)
                        const avatar = other?.avatarUrl || `https://ui-avatars.com/api/?name=${other?.username}&background=6366F1&color=fff`
                        return (
                            <>
                                {/* Header */}
                                <div className="chat-area-header">
                                    {/* Mobile back button */}
                                    <button
                                        className="btn btn-ghost btn-icon chat-back-btn"
                                        onClick={closeChat}
                                        style={{ marginRight: 4 }}>
                                        <HiArrowLeft />
                                    </button>
                                    <img src={avatar} className="avatar avatar-sm" alt="" />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                                            {other?.username}
                                            {other?.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 14 }} />}
                                        </div>
                                        {peerTyping
                                            ? <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>typing…</div>
                                            : <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>● Active now</div>
                                        }
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="messages-box">
                                    {messages.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
                                            <div style={{ fontSize: 36, marginBottom: 12 }}>👋</div>
                                            <p style={{ fontSize: 14 }}>Say hello to <strong style={{ color: 'var(--text-2)' }}>@{other?.username}</strong>!</p>
                                        </div>
                                    )}
                                    {messages.map((m) => {
                                        const isMine = m.sender === user?._id || m.sender?._id === user?._id
                                        return (
                                            <div key={m._id} className={`message-wrap ${isMine ? 'mine' : ''}`}>
                                                <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                                                    {m.body}
                                                    {m.mediaUrl && <img src={m.mediaUrl} style={{ marginTop: 8, borderRadius: 10, maxWidth: '100%' }} alt="" />}
                                                </div>
                                                <div className="message-time">
                                                    {timeago(m.createdAt)}
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {peerTyping && <TypingIndicator />}
                                    <div ref={bottomRef} />
                                </div>

                                {/* Input */}
                                <form className="chat-input-bar" onSubmit={handleSend}>
                                    <input
                                        ref={inputRef}
                                        className="input"
                                        placeholder={`Message @${other?.username}…`}
                                        value={text}
                                        onChange={handleTyping}
                                        style={{ borderRadius: 'var(--r-full)' }}
                                    />
                                    <button className="btn btn-primary btn-icon" type="submit"
                                        disabled={!text.trim()}
                                        style={{ flexShrink: 0 }}>
                                        <HiPaperAirplane style={{ transform: 'rotate(90deg)' }} />
                                    </button>
                                </form>
                            </>
                        )
                    })() : (
                        <div className="flex-col justify-center items-center" style={{ flex: 1, color: 'var(--text-3)', gap: 16 }}>
                            <div style={{ fontSize: 56, animation: 'float 3s ease-in-out infinite' }}>💬</div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-2)', fontFamily: "'Syne',sans-serif", marginBottom: 8 }}>
                                    Your Messages
                                </p>
                                <p style={{ fontSize: 14, marginBottom: 20 }}>Send a message to start a conversation</p>
                                <button className="btn btn-primary" onClick={() => setShowNewConvo(true)}>
                                    <HiPencilAlt /> New Message
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── New Conversation Modal ── */}
            {showNewConvo && (
                <NewConvoModal
                    onClose={() => setShowNewConvo(false)}
                    onStart={startConvoWith}
                />
            )}
        </>
    )
}
