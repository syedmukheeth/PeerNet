import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { io } from 'socket.io-client'
import { HiPaperAirplane, HiBadgeCheck, HiSearch, HiX, HiPencilAlt, HiArrowLeft, HiPhotograph, HiEmojiHappy } from 'react-icons/hi'
import { timeago } from '../utils/timeago'
import toast from 'react-hot-toast'

let socket = null

/* ── Typing Bubbles ─────────────────────────────────────── */
function TypingBubble() {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '2px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--hover)', flexShrink: 0 }} />
            <div style={{
                display: 'flex', gap: 4, padding: '12px 16px',
                background: 'var(--dm-theirs)', borderRadius: 22, borderBottomLeftRadius: 4,
                width: 56,
            }}>
                {[0, 200, 400].map((d, i) => (
                    <span key={i} style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--text-3)', display: 'block',
                        animation: `pulseDot 1.2s ease-in-out ${d}ms infinite`,
                    }} />
                ))}
            </div>
        </div>
    )
}

/* ── New Message Modal ──────────────────────────────────── */
function NewConvoModal({ onClose, onStart }) {
    const [q, setQ] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)

    const search = async (e) => {
        const v = e.target.value; setQ(v)
        if (v.length < 2) return setResults([])
        setLoading(true)
        try { const { data } = await api.get('/users/search', { params: { q: v, limit: 15 } }); setResults(data.data || []) }
        catch { /* silent */ } finally { setLoading(false) }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'var(--surface)', borderRadius: 16,
                width: '100%', maxWidth: 400,
                border: '1px solid var(--border-md)',
                boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
            }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>New message</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center' }}><HiX /></button>
                </div>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--text-3)', fontSize: 14 }}>To:</span>
                    <input
                        autoFocus value={q} onChange={search}
                        placeholder="Search..."
                        style={{
                            flex: 1, background: 'none', border: 'none',
                            outline: 'none', color: 'var(--text-1)', fontSize: 14,
                        }} />
                    {loading && <div className="spinner" style={{ width: 14, height: 14 }} />}
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {results.map(u => (
                        <div key={u._id} onClick={() => onStart(u)}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', transition: 'background 150ms' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`}
                                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {u.username} {u.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13 }} />}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{u.fullName}</div>
                            </div>
                        </div>
                    ))}
                    {q.length >= 2 && !results.length && !loading && (
                        <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 14 }}>No accounts found.</p>
                    )}
                    {q.length < 2 && (
                        <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 14 }}>Search for people</p>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ── Main ─────────────────────────────────────────────────── */
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
    const [mobilePanel, setMobilePanel] = useState('list')
    const bottomRef = useRef()
    const typingTimer = useRef()
    const inputRef = useRef()
    const userRef = useRef(user)
    useEffect(() => { userRef.current = user }, [user])

    /* socket */
    useEffect(() => {
        const token = localStorage.getItem('accessToken')
        socket = io(window.location.origin, { auth: { token }, path: '/socket.io', transports: ['websocket', 'polling'] })
        socket.on('new_message', (msg) => {
            const senderId = msg.sender?._id || msg.sender
            if (senderId === userRef.current?._id) return
            setMessages(m => [...m, msg])
            setConversations(cs => cs.map(c => c._id === msg.conversationId ? { ...c, lastMessage: msg } : c))
        })
        socket.on('user_typing', () => setPeerTyping(true))
        socket.on('user_stop_typing', () => setPeerTyping(false))
        return () => { socket?.disconnect(); socket = null }
    }, [])

    const loadConvos = async () => {
        const { data } = await api.get('/conversations')
        const convos = data.data || []; setConversations(convos); return convos
    }

    useEffect(() => {
        loadConvos().then(convos => {
            if (paramConvoId) { const f = convos.find(c => c._id === paramConvoId); if (f) selectConvo(f) }
        }).catch(() => { })
    }, []) // eslint-disable-line

    const selectConvo = async (convo) => {
        if (activeConvo?._id === convo._id) { setMobilePanel('chat'); return }
        if (activeConvo) socket?.emit('leave_conversation', activeConvo._id)
        setActiveConvo(convo); setMessages([]); setMobilePanel('chat')
        socket?.emit('join_conversation', convo._id)
        navigate(`/messages/${convo._id}`, { replace: true })
        try { const { data } = await api.get(`/conversations/${convo._id}/messages`, { params: { limit: 50 } }); setMessages(data.data || []) }
        catch { toast.error('Failed to load messages') }
        setTimeout(() => inputRef.current?.focus(), 200)
    }

    const startConvoWith = async (u) => {
        setShowNewConvo(false); setStarting(true)
        try {
            const { data } = await api.post('/conversations', { targetUserId: u._id })
            const fresh = await loadConvos()
            const found = fresh.find(c => c._id === data.data._id) || { ...data.data, participants: [user, u] }
            await selectConvo(found)
        } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
        finally { setStarting(false) }
    }

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, peerTyping])

    const handleSend = async (e) => {
        e.preventDefault()
        if (!text.trim() || !activeConvo) return
        const body = text.trim(); setText('')
        clearTimeout(typingTimer.current)
        socket?.emit('stop_typing', { conversationId: activeConvo._id })
        try {
            const { data } = await api.post(`/conversations/${activeConvo._id}/messages`, { body })
            setMessages(m => [...m, data.data])
            setConversations(cs => cs.map(c => c._id === activeConvo._id ? { ...c, lastMessage: { body } } : c))
        } catch { toast.error('Failed to send'); setText(body) }
    }

    const handleType = (e) => {
        setText(e.target.value)
        if (activeConvo) {
            socket?.emit('typing', { conversationId: activeConvo._id })
            clearTimeout(typingTimer.current)
            typingTimer.current = setTimeout(() => socket?.emit('stop_typing', { conversationId: activeConvo._id }), 2000)
        }
    }

    const getOther = (c) => c.participants?.find(p => p._id !== user?._id)
    const other = activeConvo ? getOther(activeConvo) : null
    const otherAvatar = other?.avatarUrl || (other ? `https://ui-avatars.com/api/?name=${other.username}&background=6366F1&color=fff` : null)

    return (
        <>
            {/* Full-screen fixed DM overlay, starts right of the sidebar */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                left: 'var(--sidebar-w, 240px)',
                display: 'flex', background: 'var(--bg)', zIndex: 20,
            }}>

                {/* ─── LEFT: conversation list ─────────────────── */}
                <div className={`dm-panel dm-list-panel${mobilePanel === 'chat' ? ' dm-mobile-hidden' : ''}`}
                    style={{ width: 350, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>

                    {/* List header */}
                    <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <div>
                            <span style={{ fontFamily: "'Syne','Inter',sans-serif", fontWeight: 800, fontSize: 20 }}>
                                {user?.username}
                            </span>
                        </div>
                        <button onClick={() => setShowNewConvo(true)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-1)', fontSize: 22, display: 'flex', alignItems: 'center', padding: 4 }}>
                            <HiPencilAlt />
                        </button>
                    </div>

                    {/* Messages label */}
                    <div style={{ padding: '14px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>Messages</span>
                    </div>

                    {/* Search */}
                    <div style={{ padding: '0 16px 10px', flexShrink: 0 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'var(--hover)', borderRadius: 10, padding: '9px 14px',
                        }}>
                            <HiSearch style={{ color: 'var(--text-3)', fontSize: 15, flexShrink: 0 }} />
                            <span style={{ fontSize: 14, color: 'var(--text-3)' }}>Search</span>
                        </div>
                    </div>

                    {/* Convo items */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {starting && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="spinner" /></div>}
                        {conversations.map(c => {
                            const peer = getOther(c)
                            const pav = peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=6366F1&color=fff`
                            const isActive = activeConvo?._id === c._id
                            return (
                                <div key={c._id} onClick={() => selectConvo(c)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 14,
                                        padding: '10px 16px', cursor: 'pointer',
                                        background: isActive ? 'var(--hover)' : 'transparent',
                                        transition: 'background 120ms',
                                    }}
                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--hover)' }}
                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <img src={pav} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', display: 'block' }} alt="" />
                                        <div style={{ position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, background: 'var(--success)', borderRadius: '50%', border: '2.5px solid var(--surface)' }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 14 }}>
                                                {peer?.username}
                                                {peer?.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13 }} />}
                                            </div>
                                            {c.lastMessage?.createdAt && (
                                                <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{timeago(c.lastMessage.createdAt)}</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {c.lastMessage?.body || 'Say hi 👋'}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {!conversations.length && !starting && (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
                                <div style={{ fontSize: 44, marginBottom: 14 }}>✉️</div>
                                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)', marginBottom: 8 }}>Your messages</p>
                                <p style={{ fontSize: 13, marginBottom: 20 }}>Send a message to start a conversation</p>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowNewConvo(true)}>Send message</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── RIGHT: chat area ─────────────────────────── */}
                <div className={`dm-panel dm-chat-panel${mobilePanel === 'list' ? ' dm-mobile-hidden' : ''}`}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg)' }}>

                    {activeConvo && other ? (
                        <>
                            {/* Chat header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '12px 20px', borderBottom: '1px solid var(--border)',
                                background: 'var(--surface)', flexShrink: 0,
                            }}>
                                <button className="dm-back-btn btn btn-ghost btn-icon" onClick={() => { setMobilePanel('list'); navigate('/messages', { replace: true }) }}>
                                    <HiArrowLeft />
                                </button>
                                <div style={{ position: 'relative' }}>
                                    <img src={otherAvatar} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }} alt="" />
                                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, background: 'var(--success)', borderRadius: '50%', border: '2px solid var(--surface)' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 14 }}>
                                        {other.username}
                                        {other.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13 }} />}
                                    </div>
                                    <div style={{ fontSize: 12, color: peerTyping ? 'var(--accent)' : 'var(--success)', marginTop: 1 }}>
                                        {peerTyping ? 'typing…' : '● Active now'}
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {messages.length === 0 && (
                                    <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-3)' }}>
                                        <img src={otherAvatar} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 14px', display: 'block' }} alt="" />
                                        <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)', marginBottom: 4 }}>{other.username}</p>
                                        <p style={{ fontSize: 13 }}>Send a message to start the conversation</p>
                                    </div>
                                )}

                                {messages.map((m, i) => {
                                    const isMine = m.sender === user?._id || m.sender?._id === user?._id
                                    const nextSender = messages[i + 1]?.sender?._id || messages[i + 1]?.sender
                                    const prevSender = messages[i - 1]?.sender?._id || messages[i - 1]?.sender
                                    const curSender = m.sender?._id || m.sender
                                    const isFirst = prevSender !== curSender
                                    const isLast = nextSender !== curSender

                                    const r = 20
                                    const rSmall = 4
                                    const borderRadius = isMine
                                        ? `${r}px ${isFirst ? r : rSmall}px ${isLast ? r : rSmall}px ${r}px`
                                        : `${isFirst ? r : rSmall}px ${r}px ${r}px ${isLast ? r : rSmall}px`

                                    return (
                                        <div key={m._id || i} style={{
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: isMine ? 'flex-end' : 'flex-start',
                                            marginBottom: isLast ? 6 : 1,
                                        }}>
                                            {/* Avatar for theirs, first in group */}
                                            {!isMine && isFirst && (
                                                <img src={otherAvatar}
                                                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginBottom: 2, display: 'block' }}
                                                    alt="" />
                                            )}

                                            <div style={{
                                                maxWidth: '65%',
                                                padding: '10px 14px',
                                                borderRadius,
                                                background: isMine ? 'var(--accent)' : 'var(--dm-theirs)',
                                                color: isMine ? '#fff' : 'var(--text-1)',
                                                fontSize: 14.5, lineHeight: 1.5,
                                                wordBreak: 'break-word',
                                                boxShadow: isMine ? '0 1px 8px var(--accent-ring)' : 'none',
                                            }}>
                                                {m.body}
                                                {m.mediaUrl && <img src={m.mediaUrl} style={{ marginTop: 8, borderRadius: 10, maxWidth: '100%', display: 'block' }} alt="" />}
                                            </div>
                                            {isLast && (
                                                <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, paddingInline: 2 }}>
                                                    {timeago(m.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                                {peerTyping && <TypingBubble />}
                                <div ref={bottomRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSend} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '12px 16px', borderTop: '1px solid var(--border)',
                                background: 'var(--surface)', flexShrink: 0,
                            }}>
                                <button type="button" style={{ color: 'var(--text-3)', fontSize: 22, background: 'none', border: 'none', flexShrink: 0, display: 'flex', cursor: 'pointer' }}>
                                    <HiEmojiHappy />
                                </button>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--hover)', border: '1px solid var(--border-md)', borderRadius: 24, padding: '8px 16px', transition: 'border-color 150ms' }}
                                    onFocus={() => { }}>
                                    <input
                                        ref={inputRef}
                                        value={text} onChange={handleType}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
                                        placeholder={`Message...`}
                                        style={{
                                            flex: 1, background: 'none', border: 'none', outline: 'none',
                                            color: 'var(--text-1)', fontSize: 14,
                                        }}
                                    />
                                    {!text.trim() && (
                                        <button type="button" style={{ color: 'var(--text-3)', fontSize: 20, background: 'none', border: 'none', display: 'flex', cursor: 'pointer', flexShrink: 0 }}>
                                            <HiPhotograph />
                                        </button>
                                    )}
                                </div>
                                {text.trim() ? (
                                    <button type="submit" style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--accent)', fontWeight: 700, fontSize: 15, flexShrink: 0,
                                    }}>Send</button>
                                ) : (
                                    <button type="button" style={{ color: 'var(--text-3)', fontSize: 24, background: 'none', border: 'none', display: 'flex', cursor: 'pointer', flexShrink: 0 }}>
                                        ❤️
                                    </button>
                                )}
                            </form>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', textAlign: 'center', padding: 32, gap: 16 }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: '50%',
                                border: '2px solid var(--text-2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 32,
                            }}>✉️</div>
                            <div>
                                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Your messages</p>
                                <p style={{ fontSize: 14, marginBottom: 20 }}>Send private photos and messages to a friend or group</p>
                                <button className="btn btn-primary" onClick={() => setShowNewConvo(true)}>
                                    Send message
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Spacer behind the fixed panel */}
            <div style={{ height: '100dvh' }} />

            {showNewConvo && <NewConvoModal onClose={() => setShowNewConvo(false)} onStart={startConvoWith} />}
        </>
    )
}
