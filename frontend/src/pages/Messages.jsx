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

/* ── Typing Indicator ─────────────────────────────────────── */
function TypingIndicator() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <div style={{
                display: 'flex', gap: 4, alignItems: 'center',
                padding: '10px 14px', background: 'var(--card)',
                border: '1px solid var(--border-md)',
                borderRadius: 20, borderBottomLeftRadius: 4,
                width: 'fit-content'
            }}>
                {[0, 160, 320].map((delay, i) => (
                    <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--text-3)',
                        animation: `pulseDot 1.3s ease-in-out ${delay}ms infinite`
                    }} />
                ))}
            </div>
        </div>
    )
}

/* ── New Conversation Modal ───────────────────────────────── */
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
        } catch { /* silent */ } finally { setLoading(false) }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ maxWidth: 420, width: '90vw' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700 }}>New Message</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><HiX /></button>
                </div>
                <div className="search-bar" style={{ marginBottom: 16 }}>
                    <HiSearch style={{ color: 'var(--text-3)', fontSize: 18 }} />
                    <input placeholder="Search people…" value={q} onChange={handleSearch} autoFocus />
                    {loading && <div className="spinner" style={{ width: 14, height: 14 }} />}
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {results.map(u => {
                        const avatar = u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`
                        return (
                            <div key={u._id} className="user-row"
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                onClick={() => onStart(u)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <img src={avatar} className="avatar avatar-md" alt="" />
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 14 }}>
                                            {u.username}
                                            {u.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13 }} />}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{u.fullName}</div>
                                    </div>
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Message →</span>
                            </div>
                        )
                    })}
                    {q.length >= 2 && results.length === 0 && !loading && (
                        <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0', fontSize: 14 }}>
                            No results for "{q}"
                        </p>
                    )}
                    {q.length < 2 && (
                        <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0', fontSize: 14 }}>
                            Type at least 2 characters…
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ── Main Component ───────────────────────────────────────── */
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
    const [mobilePanel, setMobilePanel] = useState('list') // 'list' | 'chat'
    const bottomRef = useRef()
    const typingTimer = useRef()
    const inputRef = useRef()
    const userRef = useRef(user)
    useEffect(() => { userRef.current = user }, [user])

    /* ── Socket ───────────────────────────────────────────── */
    useEffect(() => {
        const token = localStorage.getItem('accessToken')
        socket = io(window.location.origin, {
            auth: { token }, path: '/socket.io',
            transports: ['websocket', 'polling'],
        })
        socket.on('new_message', (msg) => {
            const senderId = msg.sender?._id || msg.sender
            if (senderId === userRef.current?._id) return
            setMessages(m => [...m, msg])
            setConversations(cs => cs.map(c =>
                c._id === msg.conversationId ? { ...c, lastMessage: msg } : c
            ))
        })
        socket.on('user_typing', () => setPeerTyping(true))
        socket.on('user_stop_typing', () => setPeerTyping(false))
        return () => { socket?.disconnect(); socket = null }
    }, [])

    /* ── Load conversations ───────────────────────────────── */
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

    /* ── Select conversation ──────────────────────────────── */
    const selectConvo = async (convo) => {
        if (activeConvo?._id === convo._id) { setMobilePanel('chat'); return }
        if (activeConvo) socket?.emit('leave_conversation', activeConvo._id)
        setActiveConvo(convo)
        setMessages([])
        setMobilePanel('chat')
        socket?.emit('join_conversation', convo._id)
        navigate(`/messages/${convo._id}`, { replace: true })
        try {
            const { data } = await api.get(`/conversations/${convo._id}/messages`, { params: { limit: 50 } })
            setMessages(data.data || [])
        } catch { toast.error('Failed to load messages') }
        setTimeout(() => inputRef.current?.focus(), 200)
    }

    const goBackToList = () => {
        setMobilePanel('list')
        navigate('/messages', { replace: true })
    }

    /* ── Start new conversation ───────────────────────────── */
    const startConvoWith = async (targetUser) => {
        setShowNewConvo(false)
        setStarting(true)
        try {
            const { data } = await api.post('/conversations', { targetUserId: targetUser._id })
            const fresh = await loadConversations()
            const found = fresh.find(c => c._id === data.data._id) || { ...data.data, participants: [user, targetUser] }
            await selectConvo(found)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to start conversation')
        } finally { setStarting(false) }
    }

    /* ── Auto scroll ──────────────────────────────────────── */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, peerTyping])

    /* ── Send message ─────────────────────────────────────── */
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
            setConversations(cs => cs.map(c =>
                c._id === activeConvo._id ? { ...c, lastMessage: { body } } : c
            ))
        } catch { toast.error('Failed to send'); setText(body) }
    }

    const handleTyping = (e) => {
        setText(e.target.value)
        if (activeConvo) {
            socket?.emit('typing', { conversationId: activeConvo._id })
            clearTimeout(typingTimer.current)
            typingTimer.current = setTimeout(() =>
                socket?.emit('stop_typing', { conversationId: activeConvo._id }), 2000)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend(e)
        }
    }

    const getOther = (convo) => convo.participants?.find(p => p._id !== user?._id)

    const other = activeConvo ? getOther(activeConvo) : null
    const otherAvatar = other?.avatarUrl || (other?.username
        ? `https://ui-avatars.com/api/?name=${other.username}&background=6366F1&color=fff` : null)

    /* ─────────────────────────────────────────────────────── */
    return (
        <>
            {/* Fixed overlay that covers main-col only — uses CSS var for sidebar width */}
            <div style={{
                position: 'fixed',
                top: 0, right: 0, bottom: 0,
                left: 'var(--sidebar-w, 240px)',
                display: 'flex',
                background: 'var(--bg)',
                zIndex: 20,
            }}>
                {/* ── LEFT: Conversation List ─────────────── */}
                <div style={{
                    width: 320,
                    flexShrink: 0,
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--surface)',
                }} className={`dm-list-panel${mobilePanel === 'chat' ? ' dm-mobile-hidden' : ''}`}>

                    {/* Header */}
                    <div style={{
                        padding: '18px 20px 14px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexShrink: 0,
                    }}>
                        <span style={{
                            fontFamily: "'Syne','Inter',sans-serif",
                            fontWeight: 800, fontSize: 20,
                        }}>Messages</span>
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => setShowNewConvo(true)}
                            title="New message"
                            style={{ fontSize: 18 }}>
                            <HiPencilAlt />
                        </button>
                    </div>

                    {/* Search bar – decorative */}
                    <div style={{ padding: '10px 14px 6px', flexShrink: 0 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'var(--hover)',
                            borderRadius: 10, padding: '8px 12px',
                        }}>
                            <HiSearch style={{ color: 'var(--text-3)', fontSize: 15, flexShrink: 0 }} />
                            <span style={{ fontSize: 14, color: 'var(--text-3)' }}>Search</span>
                        </div>
                    </div>

                    {/* Conversation items */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {starting && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                                <div className="spinner" />
                            </div>
                        )}
                        {conversations.map(c => {
                            const peer = getOther(c)
                            const pAvatar = peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=6366F1&color=fff`
                            const isActive = activeConvo?._id === c._id
                            return (
                                <div key={c._id}
                                    onClick={() => selectConvo(c)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 13,
                                        padding: '12px 16px', cursor: 'pointer',
                                        background: isActive ? 'var(--accent-subtle)' : 'transparent',
                                        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                                        transition: 'background 150ms ease',
                                    }}
                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--hover)' }}
                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>

                                    {/* Avatar with online dot */}
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <img src={pAvatar} className="avatar avatar-md" alt=""
                                            style={{ border: isActive ? '2px solid var(--accent)' : '2px solid transparent' }} />
                                        <div style={{
                                            position: 'absolute', bottom: 0, right: 0,
                                            width: 11, height: 11,
                                            background: 'var(--success)', borderRadius: '50%',
                                            border: '2px solid var(--surface)',
                                        }} />
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 14 }}>
                                                {peer?.username}
                                                {peer?.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13 }} />}
                                            </div>
                                            {c.lastMessage?.createdAt && (
                                                <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
                                                    {timeago(c.lastMessage.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{
                                            fontSize: 13, color: 'var(--text-3)',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {c.lastMessage?.body || 'Say hello 👋'}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {conversations.length === 0 && !starting && (
                            <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-3)' }}>
                                <div style={{ fontSize: 40, marginBottom: 14 }}>💬</div>
                                <p style={{ fontWeight: 700, color: 'var(--text-2)', marginBottom: 6, fontSize: 15 }}>No messages yet</p>
                                <p style={{ fontSize: 13, marginBottom: 20 }}>Start a conversation</p>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowNewConvo(true)}>
                                    New Message
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Chat Panel ───────────────────── */}
                <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    minWidth: 0, background: 'var(--bg)',
                }} className={`dm-chat-panel${mobilePanel === 'list' ? ' dm-mobile-hidden' : ''}`}>

                    {activeConvo && other ? (
                        <>
                            {/* Chat Header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '12px 20px',
                                borderBottom: '1px solid var(--border)',
                                background: 'var(--surface)',
                                flexShrink: 0,
                            }}>
                                {/* Mobile back button */}
                                <button
                                    className="btn btn-ghost btn-icon dm-back-btn"
                                    onClick={goBackToList}>
                                    <HiArrowLeft />
                                </button>

                                <div style={{ position: 'relative' }}>
                                    <img src={otherAvatar} className="avatar avatar-sm" alt="" />
                                    <div style={{
                                        position: 'absolute', bottom: 0, right: 0,
                                        width: 10, height: 10,
                                        background: 'var(--success)', borderRadius: '50%',
                                        border: '2px solid var(--surface)',
                                    }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 15 }}>
                                        {other.username}
                                        {other.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 14 }} />}
                                    </div>
                                    <div style={{ fontSize: 12, color: peerTyping ? 'var(--accent)' : 'var(--success)', fontWeight: 500 }}>
                                        {peerTyping ? 'typing…' : '● Active now'}
                                    </div>
                                </div>
                            </div>

                            {/* Messages scroll area */}
                            <div style={{
                                flex: 1, overflowY: 'auto', overflowX: 'hidden',
                                padding: '20px 24px', display: 'flex',
                                flexDirection: 'column', gap: 2,
                            }}>
                                {messages.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
                                        <img src={otherAvatar} className="avatar avatar-xl"
                                            style={{ margin: '0 auto 16px' }} alt="" />
                                        <p style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 16, marginBottom: 4 }}>
                                            {other.username}
                                        </p>
                                        <p style={{ fontSize: 13 }}>Send a message to start the conversation</p>
                                    </div>
                                )}

                                {messages.map((m, i) => {
                                    const isMine = m.sender === user?._id || m.sender?._id === user?._id
                                    const nextMsg = messages[i + 1]
                                    const prevMsg = messages[i - 1]
                                    const isLastInGroup = !nextMsg ||
                                        (nextMsg.sender?._id || nextMsg.sender) !== (m.sender?._id || m.sender)
                                    const isFirstInGroup = !prevMsg ||
                                        (prevMsg.sender?._id || prevMsg.sender) !== (m.sender?._id || m.sender)

                                    return (
                                        <div key={m._id || i} style={{
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: isMine ? 'flex-end' : 'flex-start',
                                            marginBottom: isLastInGroup ? 8 : 1,
                                        }}>
                                            <div style={{
                                                maxWidth: '65%',
                                                padding: '10px 15px',
                                                borderRadius: 20,
                                                borderBottomRightRadius: isMine ? (isLastInGroup ? 5 : 20) : 20,
                                                borderBottomLeftRadius: !isMine ? (isLastInGroup ? 5 : 20) : 20,
                                                borderTopRightRadius: isMine ? (isFirstInGroup ? 20 : 5) : 20,
                                                borderTopLeftRadius: !isMine ? (isFirstInGroup ? 20 : 5) : 20,
                                                background: isMine ? 'var(--accent)' : 'var(--card)',
                                                color: isMine ? '#fff' : 'var(--text-1)',
                                                border: isMine ? 'none' : '1px solid var(--border-md)',
                                                fontSize: 14.5, lineHeight: 1.5,
                                                wordBreak: 'break-word',
                                                boxShadow: isMine ? '0 2px 12px var(--accent-ring)' : 'none',
                                            }}>
                                                {m.body}
                                                {m.mediaUrl && (
                                                    <img src={m.mediaUrl}
                                                        style={{ marginTop: 8, borderRadius: 10, maxWidth: '100%', display: 'block' }}
                                                        alt="" />
                                                )}
                                            </div>
                                            {isLastInGroup && (
                                                <span style={{
                                                    fontSize: 11,
                                                    color: isMine ? 'rgba(255,255,255,0.5)' : 'var(--text-3)',
                                                    marginTop: 3,
                                                    paddingInline: 4,
                                                }}>
                                                    {timeago(m.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}

                                {peerTyping && <TypingIndicator />}
                                <div ref={bottomRef} />
                            </div>

                            {/* Input Bar */}
                            <form
                                onSubmit={handleSend}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '12px 16px',
                                    borderTop: '1px solid var(--border)',
                                    background: 'var(--surface)',
                                    flexShrink: 0,
                                }}>
                                <input
                                    ref={inputRef}
                                    value={text}
                                    onChange={handleTyping}
                                    onKeyDown={handleKeyDown}
                                    placeholder={`Message ${other.username}…`}
                                    style={{
                                        flex: 1, background: 'var(--hover)',
                                        border: '1px solid var(--border-md)',
                                        borderRadius: 22, padding: '10px 16px',
                                        fontSize: 14, color: 'var(--text-1)',
                                        outline: 'none', transition: 'border-color 150ms',
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border-md)'}
                                />
                                <button
                                    type="submit"
                                    disabled={!text.trim()}
                                    style={{
                                        width: 40, height: 40, borderRadius: '50%',
                                        background: text.trim() ? 'var(--accent)' : 'var(--hover)',
                                        border: 'none', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', cursor: text.trim() ? 'pointer' : 'default',
                                        color: text.trim() ? '#fff' : 'var(--text-3)',
                                        flexShrink: 0, transition: 'background 200ms',
                                        fontSize: 18,
                                    }}>
                                    <HiPaperAirplane style={{ transform: 'rotate(90deg)' }} />
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Empty state */
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-3)', gap: 14, textAlign: 'center', padding: 32,
                        }}>
                            <div style={{ fontSize: 60, lineHeight: 1 }}>💬</div>
                            <div>
                                <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', fontFamily: "'Syne',sans-serif", marginBottom: 8 }}>
                                    Your Messages
                                </p>
                                <p style={{ fontSize: 14, marginBottom: 22 }}>Send private messages to a friend</p>
                                <button className="btn btn-primary" onClick={() => setShowNewConvo(true)}>
                                    <HiPencilAlt /> Send message
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Spacer so page doesn't show blank behind the fixed DM panel */}
            <div style={{ height: '100dvh' }} />

            {showNewConvo && (
                <NewConvoModal onClose={() => setShowNewConvo(false)} onStart={startConvoWith} />
            )}
        </>
    )
}
