import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { chatApi } from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import { HiBadgeCheck, HiSearch, HiX, HiPencilAlt, HiArrowLeft, HiPhotograph, HiEmojiHappy, HiDocument, HiDownload, HiPaperAirplane, HiTrash } from 'react-icons/hi'
import { timeago } from '../utils/timeago'
import toast from 'react-hot-toast'
import EmojiPicker from 'emoji-picker-react'
import { ChatListSkeleton, MessageBubblesSkeleton } from '../components/SkeletonLoader'





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
        catch (err) { console.error("Search error:", err) } finally { setLoading(false) }
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
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [text, setText] = useState('')
    const [peerTyping, setPeerTyping] = useState(false)
    const [showNewConvo, setShowNewConvo] = useState(false)
    const [starting, setStarting] = useState(false)
    const [mobilePanel, setMobilePanel] = useState('list')
    const [showEmoji, setShowEmoji] = useState(false)
    const [initialLoad, setInitialLoad] = useState(true)
    const [convoSearch, setConvoSearch] = useState('')
    const [filePreview, setFilePreview] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const [editingMessageId, setEditingMessageId] = useState(null)
    const [editBody, setEditBody] = useState('')
    const fileRef = useRef()
    const docRef = useRef()
    const bottomRef = useRef()
    const typingTimer = useRef()
    const inputRef = useRef()
    const userRef = useRef(user)
    const [suggestions, setSuggestions] = useState([])
    const activeConvoRef = useRef(activeConvo)
    
    useEffect(() => { userRef.current = user }, [user])
    useEffect(() => { activeConvoRef.current = activeConvo }, [activeConvo])

    const insertEmoji = (emojiObj) => {
        setText(t => t + emojiObj.emoji)
        // Kept open for multiple emojis
        inputRef.current?.focus()
    }

    const socket = useSocket(user)

    useEffect(() => {
        if (!socket) return

        socket.on('new_message', (msg) => {
            const senderId = msg.sender?._id || msg.sender
            
            // Reconcile optimistic messages
            setMessages(m => {
                const existing = m.find(x => x._id === msg._id || x._id === `opt_${msg.tempId}`)
                if (existing) {
                    return m.map(x => (x._id === existing._id) ? msg : x)
                }
                return [...m, msg]
            })

            if (senderId !== userRef.current?._id) {
                if (activeConvoRef.current?._id === msg.conversationId) {
                    // Mark as read immediately on the server
                    chatApi.patch(`${msg.conversationId}/messages/read`, {})
                    
                    fetchSuggestions(msg.conversationId)
                } else {
                    // Handled by Layout.jsx socket listener now!
                }
            }

            setConversations(cs => cs.map(c => c._id === msg.conversationId ? { ...c, lastMessage: msg } : c))
        })
        socket.on('messages_read', ({ conversationId, readBy }) => {
            if (activeConvoRef.current?._id === conversationId && readBy !== userRef.current?._id) {
                setMessages(m => m.map(msg => msg.sender === userRef.current?._id ? { ...msg, isRead: true } : msg))
            }
        })
        socket.on('message_edited', (msg) => {
            setMessages(m => m.map(x => x._id === msg._id ? msg : x))
            setConversations(cs => cs.map(c => 
                (c.lastMessage?._id === msg._id || c._id === msg.conversation) 
                ? { ...c, lastMessage: msg } : c
            ))
        })
        socket.on('message_deleted', ({ messageId }) => {
            setMessages(m => m.filter(x => x._id !== messageId))
        })
        
        // Support both old and new typing patterns
        socket.on('user_typing_start', () => setPeerTyping(true))
        socket.on('user_typing_stop', () => setPeerTyping(false))
        socket.on('user_typing', () => setPeerTyping(true))
        socket.on('user_stop_typing', () => setPeerTyping(false))

        socket.on('notification_removed', () => {
            // Optional: if messages had an associated notification, clear it
            setConversations(cs => cs.map(c => ({ ...c, unreadCount: Math.max(0, (c.unreadCount || 0) - 1) })))
        });
        
        return () => {
            socket.off('new_message')
            socket.off('messages_read')
            socket.off('message_edited')
            socket.off('message_deleted')
            socket.off('user_typing_start')
            socket.off('user_typing_stop')
            socket.off('user_typing')
            socket.off('user_stop_typing')
            socket.off('notification_removed')
        }
    }, [socket, fetchSuggestions])

    useEffect(() => { activeConvoRef.current = activeConvo }, [activeConvo])

    const loadConvos = async () => {
        try {
            const { data } = await chatApi.get('')
            const convos = data.data || []; setConversations(convos); return convos
        } finally {
            setInitialLoad(false)
        }
    }

    // Initial load of conversations only
    useEffect(() => {
        loadConvos().catch(() => { setInitialLoad(false) })
    }, []) // initial load only

    // Single source of truth for active conversation: URL param + conversations list
    useEffect(() => {
        if (!conversations.length) {
            setActiveConvo(null)
            return
        }

        if (paramConvoId) {
            const match = conversations.find(c => c._id === paramConvoId)
            if (match) {
                setActiveConvo(match)
                return
            }
        }

        // Fallback: first conversation in the list
        setActiveConvo(conversations[0])
    }, [paramConvoId, conversations])

    // Periodic poll to keep status/unread accurate
    useEffect(() => {
        const poll = setInterval(loadConvos, 30_000)
        return () => clearInterval(poll)
    }, [])

    // Handle Room Joining
    useEffect(() => {
        if (!socket || !activeConvo) return
        
        socket.emit('join_conversation', activeConvo._id)
        
        return () => {
            socket.emit('leave_conversation', activeConvo._id)
        }
    }, [socket, activeConvo?._id, activeConvo])

    const fetchSuggestions = useCallback(async (convoId) => {
        if (!convoId) return setSuggestions([])
        try {
            const { data } = await chatApi.get(`${convoId}/suggestions`)
            setSuggestions(data.suggestions || [])
        } catch (err) {
            console.warn("AI: Suggestion fetch failed:", err)
            setSuggestions([])
        }
    }, [])

    const loadMessages = useCallback(async (convoId) => {
        if (!convoId) return
        setLoadingMessages(true)
        try {
            const { data } = await chatApi.get(`${convoId}/messages`, { params: { limit: 50 } })
            setMessages(data.data || [])
            await chatApi.patch(`${convoId}/messages/read`, {})
            
            // Tell the sidebar to refresh its message count instantly
            window.dispatchEvent(new CustomEvent('peernet:sync-counts'))

            // Smart replies
            if (convoId) fetchSuggestions(convoId)
        } finally { 
            setLoadingMessages(false) 
        }
    }, [fetchSuggestions])

    // Effect: Load messages when active convo changes
    useEffect(() => {
        if (activeConvo?._id) {
            loadMessages(activeConvo._id)
            socket?.emit('join_conversation', activeConvo._id)
        }
        return () => {
            if (activeConvo?._id) {
                socket?.emit('leave_conversation', activeConvo._id)
            }
        }
    }, [activeConvo?._id, activeConvo, loadMessages, socket])

    const selectConvo = async (convo) => {
        if (activeConvo?._id === convo._id) { setMobilePanel('chat'); return }
        
        setActiveConvo(convo)
        setMessages([])
        setLoadingMessages(true)
        setMobilePanel('chat')
        setSuggestions([]) 
        
        setConversations(cs => cs.map(c => c._id === convo._id ? { ...c, unreadCount: 0 } : c))
        navigate(`/messages/${convo._id}`, { replace: true })

        // useEffect handles data loading!
        
        setTimeout(() => inputRef.current?.focus(), 200)
    }

    const startConvoWith = async (u) => {
        setShowNewConvo(false); setStarting(true)
        try {
            const { data } = await chatApi.post('', { targetUserId: u._id })
            const fresh = await loadConvos()
            const found = fresh.find(c => c._id === data.data._id) || { ...data.data, participants: [user, u] }
            await selectConvo(found)
        } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
        finally { setStarting(false) }
    }

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'auto' }) }, [messages, peerTyping])

    const handleSend = async (e) => {
        e?.preventDefault()
        if ((!text.trim() && !filePreview) || !activeConvo) return
        if (isUploading) return

        const body = text.trim()
        const attachedFile = filePreview?.file
        const tempId = Date.now().toString()

        // 1. CLEAR INPUTS
        setText('')
        setFilePreview(null)
        clearTimeout(typingTimer.current)
        socket?.emit('stop_typing', { conversationId: activeConvo._id })

        // 2. OPTIMISTIC UPDATE
        const optimisticMsg = {
            _id: `opt_${tempId}`,
            tempId,
            conversationId: activeConvo._id,
            sender: user,
            body,
            mediaUrl: filePreview?.url || null,
            status: 'sending',
            createdAt: new Date().toISOString()
        }
        setMessages(m => [...m, optimisticMsg])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 10)

        // 3. PROTOCOL SELECTION
        try {
            if (attachedFile) {
                setIsUploading(true)
                const formData = new FormData()
                if (body) formData.append('body', body)
                formData.append('media', attachedFile)
                formData.append('tempId', tempId)

                await chatApi.post(`${activeConvo._id}/messages`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                // Socket 'new_message' will handle state update
            } else {
                // Text-only: Fast path via Socket.io
                socket.emit('send_message', { 
                    conversationId: activeConvo._id, 
                    body,
                    tempId
                })
            }
            setSuggestions([])
        } catch (err) {
            console.error("Send failed:", err)
            toast.error('Failed to send')
            setMessages(m => m.map(x => x._id === `opt_${tempId}` ? { ...x, status: 'failed' } : x))
        } finally {
            setIsUploading(false)
        }
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return

        // 50MB limit
        if (file.size > 50 * 1024 * 1024) {
            toast.error('File too large (max 50MB)')
            return
        }

        const type = file.type.startsWith('image/') ? 'image'
            : file.type.startsWith('video/') ? 'video'
                : 'doc'

        setFilePreview({
            file,
            type,
            url: type !== 'doc' ? URL.createObjectURL(file) : null,
            name: file.name
        })
        e.target.value = '' // reset
        inputRef.current?.focus()
    }

    const handleType = (e) => {
        setText(e.target.value)
        if (activeConvo) {
            socket?.emit('typing_start', activeConvo._id)
            clearTimeout(typingTimer.current)
            typingTimer.current = setTimeout(() => socket?.emit('typing_stop', activeConvo._id), 2500)
        }
    }

    const startEditing = (m) => {
        setEditingMessageId(m._id)
        setEditBody(m.body || '')
    }

    const cancelEditing = () => {
        setEditingMessageId(null)
        setEditBody('')
    }

    const saveEdit = async (m) => {
        if (!editBody.trim()) return
        try {
            const { data } = await chatApi.put(`conversations/${activeConvo._id}/messages/${m._id}`, { body: editBody })
            setMessages(ms => ms.map(x => x._id === m._id ? data.data : x))
            setConversations(cs => cs.map(c => c.lastMessage?._id === m._id ? { ...c, lastMessage: data.data } : c))
            setEditingMessageId(null)
            setEditBody('')
        } catch {
            toast.error('Failed to edit message')
        }
    }

    const deleteMessage = async (m) => {
        if (!window.confirm("Delete this message for everyone?")) return
        try {
            await chatApi.delete(`conversations/${activeConvo._id}/messages/${m._id}`)
            setMessages(ms => ms.filter(x => x._id !== m._id))
            toast.success('Message deleted')
        } catch {
            toast.error('Failed to delete message')
        }
    }

    const getOther = (c) => c.participants?.find(p => p._id !== user?._id)
    const other = activeConvo ? getOther(activeConvo) : null
    const otherAvatar = other?.avatarUrl || (other ? `https://ui-avatars.com/api/?name=${other.username}&background=6366F1&color=fff` : null)

    const filteredConvos = (conversations || []).filter(c => {
        if (!c) return false;
        if (!convoSearch.trim()) return true;
        const peer = getOther(c);
        if (!peer) return false;
        const s = convoSearch.toLowerCase();
        return (peer.username || '').toLowerCase().includes(s) || (peer.fullName || '').toLowerCase().includes(s);
    })

    return (
        <>
            {/* Full-screen fixed DM overlay, starts right of the sidebar */}
            <div className="dm-wrapper" style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                left: 'var(--sidebar-w, 240px)',
                display: 'flex', background: 'var(--bg)', zIndex: 20,
            }}>

                {/* ─── LEFT: conversation list ─────────────────── */}
                <div className={`dm-panel dm-list-panel${mobilePanel === 'chat' ? ' dm-mobile-hidden' : ''}`}
                    style={{ flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>

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
                            <input
                                value={convoSearch}
                                onChange={e => setConvoSearch(e.target.value)}
                                placeholder="Search"
                                style={{
                                    background: 'none', border: 'none', outline: 'none',
                                    fontSize: 14, color: 'var(--text-1)', width: '100%'
                                }}
                            />
                        </div>
                    </div>

                    {/* Convo items */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {(initialLoad || starting) ? (
                            <ChatListSkeleton />
                        ) : null}
                        
                        {!initialLoad && filteredConvos.map(c => {
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
                                    <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => { e.stopPropagation(); navigate(`/profile/${peer?._id}`) }}>
                                        <img src={pav} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', display: 'block' }} alt="" />
                                        {c.isOnline && (
                                            <div style={{ position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, background: 'var(--success)', borderRadius: '50%', border: '2.5px solid var(--surface)' }} />
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: c.unreadCount > 0 ? 800 : 600, fontSize: 14 }}>
                                                {peer?.username}
                                                {peer?.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13 }} />}
                                            </div>
                                            {c.lastMessage?.createdAt && (
                                                <span style={{ fontSize: 11, color: c.unreadCount > 0 ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0, fontWeight: c.unreadCount > 0 ? 700 : 400 }}>
                                                    {timeago(c.lastMessage.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ 
                                                fontSize: 13, 
                                                color: c.unreadCount > 0 ? 'var(--text-1)' : 'var(--text-3)', 
                                                whiteSpace: 'nowrap', 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis',
                                                flex: 1,
                                                fontWeight: c.unreadCount > 0 ? 700 : 400
                                            }}>
                                                {c.lastMessage?.body || 'Say hi 👋'}
                                            </div>
                                            {c.unreadCount > 0 && (
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {!initialLoad && !conversations.length && !starting && (
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
                                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate(`/profile/${other?._id}`)}>
                                    <img src={otherAvatar} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }} alt="" />
                                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, background: 'var(--success)', borderRadius: '50%', border: '2px solid var(--surface)' }} />
                                </div>
                                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/profile/${other?._id}`)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 14 }}>
                                        {other.username}
                                        {other.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 13 }} />}
                                    </div>
                                    <div style={{ fontSize: 12, color: (activeConvo.isOnline || peerTyping) ? 'var(--success)' : 'var(--text-3)', marginTop: 1 }}>
                                        {peerTyping ? 'typing…' : activeConvo.isOnline ? '● Active now' : 'Offline'}
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {loadingMessages ? (
                                    <MessageBubblesSkeleton />
                                ) : messages.length === 0 && (
                                    <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-3)' }}>
                                        <img src={otherAvatar} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 14px', display: 'block' }} alt="" />
                                        <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)', marginBottom: 4 }}>{other.username}</p>
                                        <p style={{ fontSize: 13 }}>Send a message to start the conversation</p>
                                    </div>
                                )}

                                {!loadingMessages && messages.map((m, i) => {
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
                                            position: 'relative'
                                        }}>

                                            {/* (Edit/Delete moved below message) */}

                                            {/* Avatar for theirs, first in group */}
                                            {!isMine && isFirst && (
                                                <img src={otherAvatar}
                                                    onClick={() => navigate(`/profile/${other?._id}`)}
                                                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginBottom: 2, display: 'block', cursor: 'pointer' }}
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
                                                {editingMessageId === m._id ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        <input 
                                                            autoFocus
                                                            value={editBody}
                                                            onChange={e => setEditBody(e.target.value)}
                                                            onKeyDown={e => { if(e.key === 'Enter') saveEdit(m); if(e.key === 'Escape') cancelEditing(); }}
                                                            style={{
                                                                width: '100%', padding: '6px 10px', borderRadius: 6,
                                                                border: '1px solid var(--border)', background: 'var(--surface)',
                                                                color: 'var(--text-1)', fontSize: 14, outline: 'none'
                                                            }}
                                                        />
                                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                            <button onClick={cancelEditing} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, background: 'var(--hover)', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>Cancel</button>
                                                            <button onClick={() => saveEdit(m)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, background: '#fff', color: '#000', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {m.body && <span>{m.body}</span>}
                                                        
                                                        {m.mediaUrl && (
                                                            <div style={{ marginTop: m.body ? 8 : 0 }}>
                                                                {m.mediaUrl.match(/\.(mp4|mov|webm)(\?.*)?$/i) ? (
                                                                    <video src={m.mediaUrl} controls style={{ borderRadius: 10, maxWidth: '100%', maxHeight: 300, display: 'block' }} />
                                                                ) : m.mediaUrl.match(/\.(pdf|doc|docx|xls|xlsx|txt|csv|zip)(\?.*)?$/i) ? (
                                                                    <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: isMine ? 'rgba(255,255,255,0.2)' : 'var(--hover)', borderRadius: 8, textDecoration: 'none', color: 'inherit' }}>
                                                                        <HiDocument style={{ fontSize: 24, flexShrink: 0 }} />
                                                                        <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Document attached</span>
                                                                        <HiDownload style={{ fontSize: 18 }} />
                                                                    </a>
                                                                ) : (
                                                                    <img src={m.mediaUrl} style={{ borderRadius: 10, maxWidth: '100%', maxHeight: 300, display: 'block', objectFit: 'contain', background: 'rgba(0,0,0,0.1)' }} alt="Attachment" />
                                                                )}
                                                            </div>
                                                        )}
                                                        {m.isEdited && <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>(edited)</div>}
                                                    </>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, paddingInline: 2 }}>
                                                {isMine && !editingMessageId && Date.now() - new Date(m.createdAt).getTime() <= 15 * 60 * 1000 && (
                                                    <div style={{ display: 'flex', gap: 6, opacity: 0.7 }}>
                                                        <button onClick={() => startEditing(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-1)', display: 'flex', alignItems: 'center', fontSize: 11, gap: 3 }} title="Edit">
                                                            <HiPencilAlt size={13} /> Edit
                                                        </button>
                                                        <button onClick={() => deleteMessage(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', display: 'flex', alignItems: 'center', fontSize: 11, gap: 3 }} title="Delete">
                                                            <HiTrash size={13} /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                                {isLast && (
                                                    <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {timeago(m.createdAt)}
                                                        {isMine && m.status === 'sending' && (
                                                            <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Sending...</span>
                                                        )}
                                                        {isMine && m.status === 'failed' && (
                                                            <span style={{ color: 'var(--error)', fontWeight: 600 }}>Failed</span>
                                                        )}
                                                        {isMine && (m.status === 'sent' || m.isRead) && (
                                                            <span style={{ color: m.isRead ? 'var(--accent)' : 'var(--text-3)', fontWeight: m.isRead ? 600 : 400 }}>
                                                                {m.isRead ? 'Seen' : 'Sent'}
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                                {peerTyping && <TypingBubble />}
                                <div ref={bottomRef} />
                            </div>

                            {/* AI Suggestions Chips */}
                            {!loadingMessages && suggestions.length > 0 && !peerTyping && !showEmoji && !filePreview && (
                                <div className="fade-in" style={{
                                    display: 'flex', gap: 8, padding: '12px 16px', 
                                    overflowX: 'auto', background: 'transparent',
                                    scrollbarWidth: 'none', msOverflowStyle: 'none'
                                }}>
                                    {suggestions.map((s, i) => (
                                        <button key={i} 
                                            onClick={() => { setText(s); inputRef.current?.focus(); }}
                                            className="glass-card"
                                            style={{
                                                padding: '8px 16px', borderRadius: 18,
                                                fontSize: 13, fontWeight: 600, color: 'var(--text-1)',
                                                background: 'var(--hover)',
                                                border: '1px solid var(--border-md)', cursor: 'pointer',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input */}
                            <div style={{ flexShrink: 0, position: 'relative' }}>
                                {/* Emoji picker */}
                                {showEmoji && (
                                    <div style={{ position: 'absolute', bottom: '100%', left: 16, marginBottom: 12, zIndex: 50, boxShadow: 'var(--shadow-xl)', borderRadius: 8, overflow: 'hidden' }}>
                                        <EmojiPicker
                                            onEmojiClick={insertEmoji}
                                            theme="auto"
                                            searchDisabled={true}
                                            skinTonesDisabled={true}
                                            height={350}
                                            width={300}
                                        />
                                    </div>
                                )}

                                {/* File Preview Overlay */}
                                {filePreview && (
                                    <div style={{
                                        position: 'absolute', bottom: '100%', left: 16, marginBottom: 8,
                                        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                                        padding: 8, display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-lg)'
                                    }}>
                                        {filePreview.type === 'image' && <img src={filePreview.url} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} alt="" />}
                                        {filePreview.type === 'video' && <video src={filePreview.url} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />}
                                        {filePreview.type === 'doc' && <div style={{ width: 60, height: 60, background: 'var(--hover)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}><HiDocument /></div>}

                                        <div style={{ flex: 1, minWidth: 100 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filePreview.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{(filePreview.file.size / 1024 / 1024).toFixed(2)} MB</div>
                                        </div>
                                        <button onClick={() => setFilePreview(null)} style={{ background: 'var(--hover)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)' }}>
                                            <HiX />
                                        </button>
                                    </div>
                                )}

                                <form onSubmit={handleSend} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '12px 16px',
                                    paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
                                    borderTop: '1px solid var(--border)',
                                    background: 'var(--surface)',
                                    flexWrap: 'nowrap',
                                    minHeight: 60,
                                }}>
                                    {/* Emoji button */}
                                    <button type="button"
                                        onClick={() => setShowEmoji(s => !s)}
                                        style={{
                                            color: showEmoji ? 'var(--accent)' : 'var(--text-1)',
                                            fontSize: 26, background: 'none', border: 'none',
                                            flexShrink: 0, display: 'flex', cursor: 'pointer',
                                            transition: 'color 150ms',
                                        }}>
                                        <HiEmojiHappy />
                                    </button>

                                    {/* Text input pill */}
                                    <div style={{
                                        flex: 1, display: 'flex', alignItems: 'center',
                                        background: 'transparent', border: '1px solid var(--border-md)',
                                        borderRadius: 24, padding: '10px 16px', gap: 8, minWidth: 0
                                    }}>
                                        <input
                                            ref={inputRef}
                                            value={text} onChange={handleType}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
                                            onFocus={() => setShowEmoji(false)}
                                            placeholder={`Message...`}
                                            style={{
                                                flex: 1, background: 'none', border: 'none',
                                                outline: 'none', color: 'var(--text-1)', fontSize: 15, minWidth: 0
                                            }}
                                            disabled={isUploading}
                                        />

                                        {/* Attachment Buttons (Inside pill if empty) */}
                                        {!text.trim() && !filePreview && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                                                <button type="button" onClick={() => fileRef.current?.click()} style={{ color: 'var(--text-1)', fontSize: 24, background: 'none', border: 'none', display: 'flex', cursor: 'pointer', flexShrink: 0 }}>
                                                    <HiPhotograph />
                                                </button>

                                                <input ref={docRef} type="file" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip" style={{ display: 'none' }} />
                                                <button type="button" onClick={() => docRef.current?.click()} style={{ color: 'var(--text-1)', fontSize: 24, background: 'none', border: 'none', display: 'flex', cursor: 'pointer', flexShrink: 0 }}>
                                                    <HiDocument />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Send button — always visible, replaces heart */}
                                    {isUploading ? (
                                        <div className="spinner" style={{ width: 22, height: 22, flexShrink: 0, margin: '0 4px' }} />
                                    ) : (
                                        <button type="submit" style={{
                                            background: (text.trim() || filePreview) ? 'var(--accent)' : 'var(--hover)',
                                            border: 'none', borderRadius: '50%',
                                            width: 38, height: 38,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: (text.trim() || filePreview) ? '#fff' : 'var(--text-3)',
                                            flexShrink: 0,
                                            transition: 'all 0.2s',
                                            fontSize: 18,
                                        }}>
                                            <HiPaperAirplane style={{ transform: 'rotate(90deg)' }} />
                                        </button>
                                    )}
                                </form>
                            </div>
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
