import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IoCheckmark, IoCheckmarkDone } from 'react-icons/io5'
import {
    HiDotsVertical, HiPaperClip, HiEmojiHappy,
    HiReply, HiPencil, HiTrash, HiSearch,
    HiX, HiClock, HiMail, HiArrowRight, HiArrowLeft
} from 'react-icons/hi'
import { motion, AnimatePresence } from 'framer-motion'
import EmojiPicker from 'emoji-picker-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../hooks/useSocket'

import {
    useConvos, useMessages, useSendMessage,
    useMessageActions, useConvoActions, useChatState, useMarkRead, useDeleteChat
} from '../hooks/useChat'
import { timeago as formatTime } from '../utils/timeago'
import toast from 'react-hot-toast'

/**
 * CONVERSATION ITEM
 */
const ConvoItem = ({ c, isActive, user, onClick }) => {
    const peer = useMemo(() => c.participants?.find(p => p._id !== user?._id), [c.participants, user?._id])
    const lastMsg = c.lastMessage
    const isUnread = c.unreadCount > 0 || c.isMarkedUnread

    return (
        <div
            onClick={onClick}
            className={`zn-convo-row${isActive ? ' active' : ''}`}
        >
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                    src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=0095f6&color=fff`}
                    className="zn-convo-avatar"
                    alt={peer?.username}
                />
                {peer?.isOnline && <div className="zn-online-dot" />}
            </div>
            <div className="zn-convo-info">
                <div className="zn-convo-top-row">
                    <span className={`zn-convo-name${isUnread ? ' unread' : ''}`}>
                        {peer?.username || 'Unknown User'}
                    </span>
                    <span className="zn-convo-time">{formatTime(c.updatedAt)}</span>
                </div>
                <p className={`zn-convo-msg${isUnread ? ' unread' : ''}`}>
                    {lastMsg?.sender === user?._id ? 'You: ' : ''}
                    {lastMsg?.body || 'Started a conversation'}
                </p>
            </div>
            {isUnread && <div className="zn-unread-dot" />}
        </div>
    )
}

/**
 * MESSAGE BUBBLE
 */
const MessageBubble = ({ m, isSelf, onReply, onEdit, onDelete, onReact, searchQuery, isNewGroup }) => {
    const reactions = useMemo(() => {
        const raw = m.reactions || []
        const map = {}
        raw.forEach(r => {
            if (!map[r.emoji]) {
                map[r.emoji] = { emoji: r.emoji, count: 0, me: false }
            }
            map[r.emoji].count += (r.count || 1)
            if (r.me) map[r.emoji].me = true
        })
        return Object.values(map)
    }, [m.reactions])

    const quickEmojis = ['❤️', '😂', '🔥', '👍', '😢', '😮']

    const renderContent = () => {
        if (!searchQuery) return m.body
        const parts = m.body.split(new RegExp(`(${searchQuery})`, 'gi'))
        return parts.map((part, i) =>
            part.toLowerCase() === searchQuery.toLowerCase()
                ? <mark key={i} className="zn-search-highlight">{part}</mark>
                : part
        )
    }

    return (
        <div
            className={`zn-row${isSelf ? ' self' : ' peer'}${isNewGroup ? ' new-group' : ''}${reactions.length > 0 ? ' has-reactions' : ''}`}
        >
            <div className="zn-bubble-container">
                {m.replyTo && (
                    <div className="zn-bubble-reply">
                        <div className="zn-reply-label">Replying to</div>
                        <div className="zn-reply-text">{m.replyTo.body || 'Media'}</div>
                    </div>
                )}

                <div className={`zn-bubble${m.isOptimistic ? ' optimistic' : ''}`}>
                    <div className="zn-bubble-text">{renderContent()}</div>

                    <div className={`zn-bubble-meta${isSelf ? ' self' : ''}`}>
                        <span>{formatTime(m.createdAt)}</span>
                        {isSelf && (
                            <span className={`zn-msg-status ${m.status}`}>
                                {m.status === 'seen' ? (
                                    <span className="zn-msg-status seen">
                                        <IoCheckmarkDone size={14} />
                                    </span>
                                ) : m.status === 'delivered' ? (
                                    <span className="zn-msg-status delivered">
                                        <IoCheckmarkDone size={14} />
                                    </span>
                                ) : m.status === 'sending' || m.isOptimistic ? (
                                    <HiClock size={11} style={{ opacity: 0.5 }} />
                                ) : (
                                    <span className="zn-msg-status sent">
                                        <IoCheckmark size={14} />
                                    </span>
                                )}
                            </span>
                        )}
                        {m.isEdited && <span className="zn-edited">(edited)</span>}
                    </div>

                    <AnimatePresence>
                        {reactions.length > 0 && (
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="zn-reactions">
                                {reactions.map(r => (
                                    <button
                                        key={r.emoji}
                                        className={`zn-reaction-chip${r.me ? ' active' : ''}`}
                                        onClick={() => onReact(r.emoji)}
                                    >
                                        <span>{r.emoji}</span>
                                        {r.count > 1 && <span className="zn-reaction-count">{r.count}</span>}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="zn-bubble-actions">
                    <div className="zn-action-bar">
                        <button onClick={() => onReply(m)} className="zn-action-btn" title="Reply">
                            <HiReply size={16} />
                        </button>
                        {isSelf && (Date.now() - new Date(m.createdAt).getTime() < 15 * 60 * 1000) && (
                            <button onClick={() => onEdit(m)} className="zn-action-btn" title="Edit">
                                <HiPencil size={16} />
                            </button>
                        )}
                        {isSelf && (Date.now() - new Date(m.createdAt).getTime() < 15 * 60 * 1000) && (
                            <button onClick={() => onDelete(m._id)} className="zn-action-btn delete" title="Delete">
                                <HiTrash size={16} />
                            </button>
                        )}
                        <div className="zn-action-divider" />
                        <div className="zn-quick-emojis">
                            {quickEmojis.slice(0, 3).map(e => (
                                <button
                                    key={e}
                                    onClick={() => onReact(e)}
                                    className="zn-emoji-btn"
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * MAIN MESSAGES PAGE
 */
export default function Messages() {
    const { convoId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { isDark } = useTheme()

    const {
        data: convos = [],
        isLoading: loadingConvos
    } = useConvos()
    const { data: messages = [], isLoading: loadingMsgs } = useMessages(convoId)
    const socket = useSocket(user)

    const [searchQuery, setSearchQuery] = useState('')
    const [replyingTo, setReplyingTo] = useState(null)
    const [isSearchingInChat, setIsSearchingInChat] = useState(false)
    const [chatSearchQuery, setChatSearchQuery] = useState('')
    const fileInputRef = useRef(null)
    const textareaRef = useRef(null)

    const { getDraft, setDraft } = useChatState(convoId)
    const sendMutation = useSendMessage(convoId)
    const { react: reactMutation, edit: editMutation, remove: deleteMutation } = useMessageActions(convoId)
    const { pin: pinMutation, mute: muteMutation, archive: archiveMutation } = useConvoActions()
    const deleteChatMutation = useDeleteChat()

    const [inputText, setInputText] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editingText, setEditingText] = useState('')
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showChatMenu, setShowChatMenu] = useState(false)
    const viewportRef = useRef(null)
    const { mutate: markRead } = useMarkRead(convoId)
    const prevMsgCount = useRef(0)
    const isInitialLoad = useRef(true)

    const activeConvo = useMemo(() => convos.find(c => c._id === convoId), [convos, convoId])

    useEffect(() => {
        if (convoId && messages.length > 0) {
            const lastMsg = messages[messages.length - 1]
            const isFromPeer = lastMsg.sender?._id !== user?._id && lastMsg.sender !== 'me'
            
            if (isFromPeer && lastMsg.status !== 'seen') {
                markRead()
                socket?.emit('mark_seen', { conversationId: convoId })
            }
        }
    }, [convoId, messages, socket, user?._id, markRead])

    // Join/Leave room
    useEffect(() => {
        if (socket && convoId) {
            socket.emit('join_conversation', convoId)
            return () => socket.emit('leave_conversation', convoId)
        }
    }, [socket, convoId])

    const peer = useMemo(() => activeConvo?.participants?.find(p => p._id !== user?._id), [activeConvo, user?._id])

    const filteredConvos = useMemo(() => {
        return convos
            .filter(c => {
                const p = c.participants?.find(p => p._id !== user?._id)
                return p?.username?.toLowerCase().includes(searchQuery.toLowerCase()) && !c.isArchived
            })
            .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.updatedAt) - new Date(a.updatedAt))
    }, [convos, searchQuery, user?._id])

    const groupedMessages = useMemo(() => {
        const groups = []
        
        // DEDUPLICATE MESSAGES BY ID
        const uniqueMessages = []
        const seenIds = new Set()
        
        // We want oldest first for standard column flow
        const sorted = [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

        sorted.forEach(m => {
            if (!seenIds.has(m._id)) {
                seenIds.add(m._id)
                uniqueMessages.push(m)
            }
        })

        uniqueMessages.forEach((m, idx) => {
            const senderId = m.sender?._id || m.sender
            const prev = uniqueMessages[idx - 1] 
            const next = uniqueMessages[idx + 1] 
            
            const isSameAsPrev = prev && (prev.sender?._id || prev.sender) === senderId
            const isSameAsNext = next && (next.sender?._id || next.sender) === senderId
            
            const currTime = new Date(m.createdAt).getTime()
            const prevTime = prev ? new Date(prev.createdAt).getTime() : 0
            const isTimeGap = prev && (currTime - prevTime) > 15 * 60 * 1000

            let pos = 'single'
            if (isSameAsPrev && isSameAsNext && !isTimeGap) pos = 'middle'
            else if (isSameAsPrev && !isTimeGap) pos = 'top'
            else if (isSameAsNext) pos = 'bottom'

            groups.push({ type: 'message', value: m, id: m._id, pos, isNewGroup: !isSameAsPrev || isTimeGap })

            // Date divider
            const date = new Date(m.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
            const prevDate = prev ? new Date(prev.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : ''
            
            if (date !== prevDate) {
                // Insert divider before the current message
                groups.splice(groups.length - 1, 0, { type: 'date', value: date, id: `date-${m._id}` })
            }
        })
        return groups
    }, [messages])

    const scrollToBottom = useCallback((instant = false) => {
        if (viewportRef.current) {
            viewportRef.current.scrollTo({
                top: viewportRef.current.scrollHeight,
                behavior: instant ? 'auto' : 'smooth'
            })
        }
    }, [])

    useEffect(() => {
        if (!loadingMsgs && messages.length > 0) {
            if (isInitialLoad.current) {
                scrollToBottom(true)
                isInitialLoad.current = false
            } else if (messages.length > prevMsgCount.current) {
                scrollToBottom(false)
            }
            prevMsgCount.current = messages.length
        }
    }, [messages, loadingMsgs, scrollToBottom])

    // Reset initial load flag when convo changes
    useEffect(() => {
        isInitialLoad.current = true
        prevMsgCount.current = 0
    }, [convoId])

    useEffect(() => {
        const draft = getDraft()
        setInputText(draft)
    }, [convoId, getDraft])

    useEffect(() => {
        setDraft(inputText)
    }, [inputText, setDraft])

    useEffect(() => {
        if (convoId) localStorage.setItem('zn_last_convo_id', convoId)
    }, [convoId])

    const handleSend = async () => {
        if (!inputText.trim() && !replyingTo) return
        const body = inputText
        const replyId = replyingTo?._id
        setInputText('')
        setReplyingTo(null)
        try {
            await sendMutation.mutateAsync({ text: body, replyToId: replyId })
            scrollToBottom()
        } catch {
            toast.error('Failed to send message')
            setInputText(body)
        }
    }

    const onReact = (messageId, emoji) => reactMutation.mutate({ messageId, emoji })

    // Toggle body class for mobile layout overrides
    useEffect(() => {
        if (convoId) {
            document.body.classList.add('chat-active-mode');
        } else {
            document.body.classList.remove('chat-active-mode');
        }
        return () => document.body.classList.remove('chat-active-mode');
    }, [convoId]);

    const handleEmojiClick = (emojiData) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = inputText
        const before = text.substring(0, start)
        const after = text.substring(end)
        
        const newText = before + emojiData.emoji + after
        setInputText(newText)
        
        // Use a timeout to ensure focus and cursor placement after React update
        setTimeout(() => {
            textarea.focus()
            const newPos = start + emojiData.emoji.length
            textarea.setSelectionRange(newPos, newPos)
        }, 0)
        
        // Senior Dev: Don't close on every pick unless it's a small screen and we want to be aggressive, 
        // but typically users want to pick multiple. We'll keep it open.
    }

    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (file) toast.success(`Selected "${file.name}" - Uploading soon...`)
    }

    // Determine if showing chat or list on mobile
    const showingChat = !!convoId

    return (
        <div className={`zn-messages-root ${showingChat ? 'chat-active' : ''} ${showEmojiPicker ? 'emoji-open' : ''}`}>
            {/* Global emoji backdrop moved to root level for reliable full-screen intercept */}
            {showEmojiPicker && <div className="zn-emoji-backdrop" onClick={() => setShowEmojiPicker(false)} />}

            {/* Emoji Picker - Moved to root to avoid parent transform issues on mobile */}
            <AnimatePresence>
                {showEmojiPicker && (
                    <motion.div 
                        initial={{ opacity: 0, y: 15, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 15, scale: 0.92 }}
                        className="zn-emoji-popover"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <EmojiPicker 
                            onEmojiClick={handleEmojiClick}
                            theme={isDark ? 'dark' : 'light'}
                            searchDisabled={false}
                            skinTonesDisabled
                            width="100%"
                            height={400}
                            previewConfig={{ showPreview: false }}
                            searchPlaceholder="Search emojis..."
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SIDEBAR - Conversation List */}
            <aside className="zn-messages-sidebar">
                <div className="zn-sidebar-header">
                    <div className="zn-sidebar-title-row">
                        <h1 className="zn-sidebar-title">Messages</h1>
                        <button
                            className="zn-icon-btn"
                            onClick={() => navigate('/search')}
                            aria-label="New Message"
                        >
                            <HiPencil size={20} />
                        </button>
                    </div>
                    <div className="zn-sidebar-search">
                        <HiSearch size={16} className="zn-search-icon" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="zn-search-input"
                            placeholder="Search chats..."
                        />
                    </div>
                </div>

                <div className="zn-sidebar-scroll">
                        {loadingConvos ? (
                            <div key="skeleton" className="zn-skeleton-list">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="zn-skeleton-row">
                                        <div className="skeleton zn-skeleton-avatar" />
                                        <div className="zn-skeleton-lines">
                                            <div className="skeleton zn-skeleton-name" />
                                            <div className="skeleton zn-skeleton-msg" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredConvos.length > 0 ? (
                            <div key="list">
                                {filteredConvos.map(c => (
                                    <ConvoItem
                                        key={c._id}
                                        c={c} isActive={convoId === c._id} user={user}
                                        onClick={() => navigate(`/messages/${c._id}`)}
                                        onPin={() => pinMutation.mutate(c._id)}
                                        onMute={() => muteMutation.mutate(c._id)}
                                        onArchive={() => archiveMutation.mutate(c._id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div key="empty" className="zn-empty-state">
                                <div className="zn-empty-icon">
                                    <HiMail size={36} />
                                </div>
                                <p className="zn-empty-title">No chats found</p>
                                <p className="zn-empty-sub">Search for a user or start a conversation.</p>
                            </div>
                        )}
                </div>
            </aside>

            {/* CHAT MAIN AREA */}
            <main className="zn-chat-main">
                    {convoId ? (
                        <div key={`chat-${convoId}`} className="zn-chat-inner">
                            {/* Chat Header */}
                            <header className="zn-chat-header">
                                <div className="zn-chat-header-left">
                                    <button
                                        onClick={() => navigate('/messages')}
                                        className="zn-back-btn"
                                        aria-label="Back to messages"
                                    >
                                        <HiArrowLeft size={22} />
                                    </button>
                                    <div
                                        className="zn-chat-peer-info"
                                        onClick={() => navigate(`/profile/${peer?._id}`)}
                                    >
                                        <div style={{ position: 'relative' }}>
                                            <img
                                                src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=0095f6&color=fff`}
                                                className="zn-chat-peer-avatar"
                                                alt=""
                                            />
                                            {peer?.isOnline && <div className="zn-online-dot-sm" />}
                                        </div>
                                        <div>
                                            <div className="zn-chat-peer-name">{peer?.username || 'Chatting...'}</div>
                                            <div className="zn-chat-peer-status">
                                                <div className={`zn-status-dot${peer?.isOnline ? ' online' : ''}`} />
                                                <span>{peer?.isOnline ? 'Online' : peer?.lastSeen ? `Last seen ${formatTime(peer.lastSeen)}` : 'Offline'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="zn-chat-header-actions">
                                    <button
                                        onClick={() => { setIsSearchingInChat(!isSearchingInChat); if (!isSearchingInChat) setChatSearchQuery('') }}
                                        className={`zn-icon-btn${isSearchingInChat ? ' active' : ''}`}
                                    >
                                        <HiSearch size={18} />
                                    </button>
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => setShowChatMenu(!showChatMenu)}
                                            className={`zn-icon-btn${showChatMenu ? ' active' : ''}`}
                                        >
                                            <HiDotsVertical size={18} />
                                        </button>

                                        <AnimatePresence>
                                            {showChatMenu && (
                                                <>
                                                    <div className="zn-menu-backdrop" onClick={() => setShowChatMenu(false)} />
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                                        className="zn-chat-menu"
                                                    >
                                                        <button onClick={() => { pinMutation.mutate(convoId); setShowChatMenu(false) }}>
                                                            {activeConvo?.isPinned ? 'Unpin Chat' : 'Pin Chat'}
                                                        </button>
                                                        <button onClick={() => { muteMutation.mutate(convoId); setShowChatMenu(false) }}>
                                                            {activeConvo?.isMuted ? 'Unmute' : 'Mute Notifications'}
                                                        </button>
                                                        <button onClick={() => { archiveMutation.mutate(convoId); navigate('/messages'); setShowChatMenu(false) }}>
                                                            Archive Chat
                                                        </button>
                                                        <div className="zn-chat-menu-divider" style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                                                        <button onClick={() => { deleteChatMutation.mutate(convoId); navigate('/messages'); setShowChatMenu(false) }} style={{ color: 'var(--danger, #ff4d4f)' }}>
                                                            Delete Chat
                                                        </button>
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </header>

                            {/* Inline Search */}
                            <AnimatePresence>
                                {isSearchingInChat && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="zn-chat-search-bar"
                                    >
                                        <HiSearch size={16} />
                                        <input
                                            autoFocus
                                            value={chatSearchQuery}
                                            onChange={(e) => setChatSearchQuery(e.target.value)}
                                            placeholder="Search in conversation..."
                                            className="zn-search-input"
                                        />
                                        <button onClick={() => { setIsSearchingInChat(false); setChatSearchQuery('') }} className="zn-icon-btn-sm">
                                            <HiX size={16} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Message Viewport */}
                            <div ref={viewportRef} className="zn-viewport">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {loadingMsgs ? (
                                        <div key="chat-skeleton" className="zn-chat-skeleton">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className={`zn-chat-skeleton-row${i % 2 === 0 ? ' self' : ''}`}>
                                                    <div className="skeleton zn-chat-skeleton-bubble" style={{ width: i % 3 === 0 ? '180px' : i % 2 === 0 ? '120px' : '240px' }} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : groupedMessages.length > 0 ? (
                                        groupedMessages.map((item) => (
                                            item.type === 'date' ? (
                                                <div key={item.id} className="zn-date-divider">
                                                    <span className="zn-date-label">{item.value}</span>
                                                </div>
                                            ) : (
                                                <MessageBubble
                                                    key={item.id}
                                                    m={item.value}
                                                    searchQuery={chatSearchQuery}
                                                    isSelf={
                                                        item.value.sender === 'me' ||
                                                        item.value.sender?._id === user?._id ||
                                                        item.value.sender === user?._id
                                                    }
                                                    isNewGroup={item.isNewGroup}
                                                    onReply={setReplyingTo}
                                                    onEdit={(msg) => { setEditingId(msg._id); setEditingText(msg.body) }}
                                                    onDelete={deleteMutation.mutate}
                                                    onReact={(emoji) => onReact(item.value._id, emoji)}
                                                />
                                            )
                                        ))
                                    ) : (
                                        <div className="zn-empty-chat">
                                            <HiMail size={28} className="zn-empty-chat-icon" />
                                            <p>Beginning of your conversation with {peer?.username || 'your contact'}.</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                                <div className="zn-viewport-spacer" />
                            </div>

                            {/* Composer Footer */}
                            <footer className="zn-footer">
                                <div className="zn-composer-wrapper">
                                    {replyingTo && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="zn-reply-preview"
                                        >
                                            <div className="zn-reply-bar" />
                                            <div className="zn-reply-content">
                                                <p className="zn-reply-name">Replying to {replyingTo.sender?.username || 'user'}</p>
                                                <p className="zn-reply-body">{replyingTo.body}</p>
                                            </div>
                                            <button onClick={() => setReplyingTo(null)} className="zn-icon-btn-sm">
                                                <HiX size={16} />
                                            </button>
                                        </motion.div>
                                    )}
                                    <div className="zn-composer-pill">
                                        <div className="zn-emoji-picker-container">
                                            <button 
                                                className={`zn-composer-action-btn${showEmojiPicker ? ' active' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
                                            >
                                                <HiEmojiHappy size={22} />
                                            </button>
                                        </div>

                                        <button className="zn-composer-action-btn" onClick={() => fileInputRef.current?.click()}>
                                            <HiPaperClip size={22} />
                                        </button>
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} hidden />

                                        <textarea
                                            ref={textareaRef}
                                            rows="1"
                                            value={inputText}
                                            onChange={(e) => {
                                                setInputText(e.target.value)
                                                e.target.style.height = 'auto'
                                                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleSend()
                                                    e.target.style.height = 'auto'
                                                }
                                            }}
                                            placeholder="Message..."
                                            className="zn-composer-input"
                                        />

                                        <motion.button
                                            disabled={!inputText.trim() && !replyingTo}
                                            onClick={() => {
                                                handleSend()
                                                const ta = document.querySelector('.zn-composer-input')
                                                if (ta) ta.style.height = 'auto'
                                            }}
                                            whileTap={{ scale: 0.9 }}
                                            className="zn-send-btn"
                                        >
                                            <HiArrowRight size={20} />
                                        </motion.button>
                                    </div>
                                </div>
                            </footer>
                        </div>
                    ) : (
                        <div key="select-convo" className="zn-select-convo">
                            <div className="zn-select-convo-icon">
                                <HiMail size={40} />
                            </div>
                            <h2 className="zn-select-convo-title">Your messages</h2>
                            <p className="zn-select-convo-sub">Pick a conversation, or start a new one.</p>
                        </div>
                    )}
            </main>

            {/* Edit Message Modal */}
            <AnimatePresence>
                {editingId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="zn-edit-overlay"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="zn-edit-modal"
                        >
                            <div className="zn-edit-modal-header">
                                <div>
                                    <h3 className="zn-edit-modal-title">Edit Message</h3>
                                    <p className="zn-edit-modal-sub">Update your message</p>
                                </div>
                                <button onClick={() => setEditingId(null)} className="zn-icon-btn">
                                    <HiX size={20} />
                                </button>
                            </div>

                            <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="zn-edit-textarea"
                                placeholder="Type your message..."
                                autoFocus
                            />

                            <div className="zn-edit-modal-actions">
                                <button onClick={() => setEditingId(null)} className="zn-btn-secondary">
                                    Discard
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!editingText.trim()) return
                                        try {
                                            await editMutation.mutateAsync({ messageId: editingId, text: editingText })
                                            setEditingId(null)
                                            toast.success('Message updated')
                                        } catch { toast.error('Update failed') }
                                    }}
                                    className="zn-btn-primary"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
