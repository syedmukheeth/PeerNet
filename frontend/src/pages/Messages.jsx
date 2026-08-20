import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react'
import { useNavigate, useParams } from 'react-router'
import { IoCheckmark, IoCheckmarkDone, HiDotsVertical, HiPaperClip, HiEmojiHappy, HiReply, HiPencil, HiTrash, HiSearch, HiX, HiClock, HiMail, HiArrowRight, HiArrowLeft, HiExclamationCircle } from '../components/ui/icons'
import { motion, AnimatePresence } from 'framer-motion'

import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from '../hooks/useSocket'

import {
    useConvos, useMessages, useSendMessage, useSendMedia,
    useMessageActions, useConvoActions, useChatState, useMarkRead, useDeleteChat
} from '../hooks/useChat'
import { timeago as formatTime } from '../utils/timeago'
import { splitOnQuery } from '../utils/highlight'
import toast from 'react-hot-toast'
import avatarFallback from '../components/ui/avatarFallback'
import ConfirmDialog from '../components/ConfirmDialog'
import { Icon } from '../components/ui/icons'
import { optimizeCloudinaryUrl, optimizeCloudinaryVideo } from '../utils/cloudinary'

/**
 * CONVERSATION ITEM
 */
/*
 * emoji-picker-react is 308KB, the single largest chunk in the app, and it was
 * imported statically here and in CreateStoryModal, so it was pulled in on
 * every visit to Messages or the story composer whether or not the picker was
 * ever opened. Both render it behind a boolean, so it loads on first open.
 */
const EmojiPicker = lazy(() => import('emoji-picker-react'))

// Mirrors EDIT_WINDOW in backend/src/modules/chat/chat.service.js.
const EDIT_WINDOW_MS = 15 * 60 * 1000
const withinEditWindow = (createdAt) =>
    Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS

const ConvoItem = ({ c, isActive, user, onClick }) => {
    const peer = useMemo(() => c.participants?.find(p => p._id !== user?._id), [c.participants, user?._id])
    const lastMsg = c.lastMessage
    const isUnread = c.unreadCount > 0 || c.isMarkedUnread

    const preview = `${lastMsg?.sender === user?._id ? 'You: ' : ''}${lastMsg?.body || 'Started a conversation'}`

    return (
        /*
         * A button, not a div with a click handler. The row had no role, no
         * tabIndex and no key handling, so the conversation list could not be
         * reached or opened from a keyboard at all.
         */
        <button
            type="button"
            onClick={onClick}
            aria-current={isActive ? 'true' : undefined}
            aria-label={`${peer?.username || 'Unknown user'}${isUnread ? ', unread' : ''}. ${preview}`}
            className={`zn-convo-row${isActive ? ' active' : ''}`}
        >
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                    src={peer?.avatarUrl || avatarFallback(peer?.username)}
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
                    <span className="zn-convo-meta">
                        {/* The state existed and the row showed no sign of it,
                            so a pinned or muted thread looked like any other. */}
                        {c.isPinned && (
                            <Icon name="bookmark" size={12} solid className="zn-convo-flag"
                                title="Pinned" />
                        )}
                        {c.isMuted && (
                            <Icon name="volume-off" size={12} className="zn-convo-flag"
                                title="Muted" />
                        )}
                        <span className="zn-convo-time">{formatTime(c.updatedAt)}</span>
                    </span>
                </div>
                <p className={`zn-convo-msg${isUnread ? ' unread' : ''}`}>
                    {previewLabel(lastMsg, user)}
                </p>
            </div>
            {isUnread && <div className="zn-unread-dot" />}
        </button>
    )
}

/*
 * The list preview. A media message has an empty body, so a photo showed as
 * "Started a conversation" in the sidebar, the same as a brand new thread.
 */
const previewLabel = (lastMsg, user) => {
    if (!lastMsg) return 'Started a conversation'
    const mine = (lastMsg.sender?._id || lastMsg.sender) === user?._id ? 'You: ' : ''
    if (lastMsg.body) return `${mine}${lastMsg.body}`
    if (lastMsg.mediaType === 'video') return `${mine}Video`
    if (lastMsg.mediaType === 'image') return `${mine}Photo`
    return 'Started a conversation'
}

/**
 * MESSAGE BUBBLE
 */
/*
 * A divider says what day it is the way a person would. It used to print the
 * full absolute date on every separator, so a conversation from an hour ago was
 * introduced by "August 19, 2026".
 */
const dayLabel = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''

    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000)

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return date.toLocaleDateString([], { weekday: 'long' })
    if (date.getFullYear() === new Date().getFullYear()) {
        return date.toLocaleDateString([], { month: 'long', day: 'numeric' })
    }
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
}

const MessageBubble = ({ m, isSelf, onReply, onEdit, onDelete, onReact, searchQuery, isNewGroup, pos = 'single' }) => {
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

    // Only the first three were ever rendered; the other three were dead.
    const quickEmojis = ['❤️', '😂', '🔥']

    const hasMedia = Boolean(m.mediaUrl) && m.mediaType && m.mediaType !== 'none'

    const renderContent = () => {
        // splitOnQuery escapes the query and tolerates a null body. Building the
        // RegExp inline here meant typing "(" into the in-chat search threw a
        // SyntaxError mid-render and blanked the whole app.
        const segments = splitOnQuery(m.body, searchQuery)
        return segments.map((seg, i) =>
            seg.match
                ? <mark key={i} className="zn-search-highlight">{seg.text}</mark>
                : seg.text
        )
    }

    return (
        <div
            /* pos was computed for every message and then never applied, so the
               eight grouping rules in messages.css were dead and consecutive
               messages from one person all got identical corners. */
            className={`zn-row${isSelf ? ' self' : ' peer'} pos-${pos}${isNewGroup ? ' new-group' : ''}${reactions.length > 0 ? ' has-reactions' : ''}`}
        >
            <div className="zn-bubble-container">
                {m.replyTo && (
                    <div className="zn-bubble-reply">
                        <div className="zn-reply-label">Replying to</div>
                        <div className="zn-reply-text">{m.replyTo.body || 'Media'}</div>
                    </div>
                )}

                <div className={`zn-bubble${m.isOptimistic ? ' optimistic' : ''}${hasMedia ? ' has-media' : ''}${!m.body ? ' media-only' : ''}`}>
                    {/* Media was uploaded, stored and sent, and then never
                        rendered: the bubble drew m.body alone, so an image or a
                        video arrived as an empty bubble at both ends. */}
                    {hasMedia && (
                        <div className="zn-bubble-media">
                            {m.mediaType === 'video' ? (
                                <video
                                    src={optimizeCloudinaryVideo(m.mediaUrl)}
                                    controls
                                    playsInline
                                    preload="metadata"
                                />
                            ) : (
                                <img
                                    src={optimizeCloudinaryUrl(m.mediaUrl, 600)}
                                    alt={m.body || 'Shared image'}
                                    loading="lazy"
                                />
                            )}
                        </div>
                    )}

                    {m.body && <div className="zn-bubble-text">{renderContent()}</div>}

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
                        {/* Evaluated at render, so the buttons can linger a
                            little past the window if nothing re-renders. The
                            server is the authority and rejects a late edit or
                            delete with a 400, which the handlers surface. */}
                        {isSelf && withinEditWindow(m.createdAt) && (
                            <button onClick={() => onEdit(m)} className="zn-action-btn" title="Edit">
                                <HiPencil size={16} />
                            </button>
                        )}
                        {isSelf && withinEditWindow(m.createdAt) && (
                            <button onClick={() => onDelete(m._id)} className="zn-action-btn delete" title="Delete">
                                <HiTrash size={16} />
                            </button>
                        )}
                        <div className="zn-action-divider" />
                        <div className="zn-quick-emojis">
                            {quickEmojis.map(e => (
                                <button
                                    key={e}
                                    type="button"
                                    onClick={() => onReact(e)}
                                    className="zn-emoji-btn"
                                    aria-label={`React with ${e}`}
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
        isLoading: loadingConvos,
        isError: convosFailed,
        refetch: refetchConvos,
    } = useConvos({ archived: showArchived })
    const {
        data: messages = [],
        isLoading: loadingMsgs,
        isError: messagesFailed,
        refetch: refetchMessages,
    } = useMessages(convoId)
    const socket = useSocket(user)

    const [searchQuery, setSearchQuery] = useState('')
    const [replyingTo, setReplyingTo] = useState(null)
    const [isSearchingInChat, setIsSearchingInChat] = useState(false)
    const [chatSearchQuery, setChatSearchQuery] = useState('')
    const fileInputRef = useRef(null)
    const textareaRef = useRef(null)

    const { getDraft, setDraft } = useChatState(convoId)
    const sendMutation = useSendMessage(convoId)
    const sendMediaMutation = useSendMedia(convoId)
    const { react: reactMutation, edit: editMutation, remove: deleteMutation } = useMessageActions(convoId)
    const { pin: pinMutation, mute: muteMutation, archive: archiveMutation } = useConvoActions()
    const deleteChatMutation = useDeleteChat()

    const [inputText, setInputText] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editingText, setEditingText] = useState('')
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showChatMenu, setShowChatMenu] = useState(false)
    const [peerTyping, setPeerTyping] = useState(false)
    const [confirmDeleteChat, setConfirmDeleteChat] = useState(false)
    // Archived conversations were filtered out of the list and had no view of
    // their own, so archiving one hid it permanently.
    const [showArchived, setShowArchived] = useState(false)
    const [isAtBottom, setIsAtBottom] = useState(true)
    const [unseenBelow, setUnseenBelow] = useState(0)
    const queryClient = useQueryClient()
    const viewportRef = useRef(null)
    const typingSentAt = useRef(0)
    const typingStopTimer = useRef(null)
    const { mutate: markRead } = useMarkRead(convoId)
    const prevMsgCount = useRef(0)
    const isInitialLoad = useRef(true)

    const activeConvo = useMemo(() => convos.find(c => c._id === convoId), [convos, convoId])

    // Last message this component has already marked read. The effect depends on
    // the whole messages array, and marking read invalidates the conversation
    // list, which changes that array's identity; since the local message status
    // is never flipped to 'seen', the guard below stayed true and the PATCH
    // re-fired on every one of those identity changes.
    const lastMarkedRef = useRef(null)

    useEffect(() => {
        if (!convoId || messages.length === 0) return

        const lastMsg = messages[messages.length - 1]
        const isFromPeer = lastMsg.sender?._id !== user?._id && lastMsg.sender !== 'me'
        if (!isFromPeer || lastMsg.status === 'seen') return
        if (lastMarkedRef.current === lastMsg._id) return

        lastMarkedRef.current = lastMsg._id
        markRead()
        socket?.emit('mark_seen', { conversationId: convoId })
    }, [convoId, messages, socket, user?._id, markRead])

    // Join/Leave room
    useEffect(() => {
        if (socket && convoId) {
            // The server now refuses a join for a conversation the user is not
            // part of, and acks the result.
            socket.emit('join_conversation', convoId, (ack) => {
                if (ack && ack.ok === false) toast.error(ack.message || 'Cannot open that conversation')
            })
            return () => socket.emit('leave_conversation', convoId)
        }
    }, [socket, convoId])

    /*
     * Live updates from the other end.
     *
     * chat.socket.js has always emitted all four of these and the client
     * listened for none of them, so a peer typing showed nothing, and their
     * edits, deletions and reactions did not appear until something else
     * happened to invalidate the query.
     */
    useEffect(() => {
        if (!socket || !convoId) return

        const onTypingStart = ({ conversationId, userId }) => {
            if (conversationId !== convoId || userId === user?._id) return
            setPeerTyping(true)
        }
        const onTypingStop = ({ conversationId, userId }) => {
            if (conversationId !== convoId || userId === user?._id) return
            setPeerTyping(false)
        }
        const refreshThread = () => {
            queryClient.invalidateQueries({ queryKey: ['messages', convoId] })
        }

        socket.on('user_typing_start', onTypingStart)
        socket.on('user_typing_stop', onTypingStop)
        socket.on('message_edited', refreshThread)
        socket.on('message_deleted', refreshThread)
        socket.on('message_reacted', refreshThread)

        return () => {
            socket.off('user_typing_start', onTypingStart)
            socket.off('user_typing_stop', onTypingStop)
            socket.off('message_edited', refreshThread)
            socket.off('message_deleted', refreshThread)
            socket.off('message_reacted', refreshThread)
        }
    }, [socket, convoId, user?._id, queryClient])

    /*
     * Escape backs out of whatever is open, innermost first.
     *
     * The only key handler on this whole surface was the composer's Enter. The
     * emoji picker, the chat menu, the inline search and the reply preview all
     * had to be dismissed by clicking exactly the right thing.
     */
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return

            if (editingId) return setEditingId(null)
            if (showEmojiPicker) return setShowEmojiPicker(false)
            if (showChatMenu) return setShowChatMenu(false)
            if (isSearchingInChat) {
                setIsSearchingInChat(false)
                return setChatSearchQuery('')
            }
            if (replyingTo) return setReplyingTo(null)
        }

        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [editingId, showEmojiPicker, showChatMenu, isSearchingInChat, replyingTo])

    // The peer's indicator is cleared by their typing_stop, but a dropped
    // connection never sends one, so it also expires on its own.
    useEffect(() => {
        if (!peerTyping) return
        const timer = setTimeout(() => setPeerTyping(false), 6000)
        return () => clearTimeout(timer)
    }, [peerTyping])

    // Leaving the conversation while mid-word would otherwise leave the other
    // person looking at a typing indicator forever.
    useEffect(() => () => {
        if (socket && convoId) socket.emit('typing_stop', convoId)
    }, [socket, convoId])

    const peer = useMemo(() => activeConvo?.participants?.find(p => p._id !== user?._id), [activeConvo, user?._id])

    /*
     * Only the search filter is left here. The archived split and the
     * pinned-first ordering are the server's job now: it knows the flags, and
     * doing the ordering there means paging cannot drop a pinned thread off the
     * end of the list.
     */
    const filteredConvos = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return convos
        return convos.filter(c => {
            const p = c.participants?.find(p => p._id !== user?._id)
            return p?.username?.toLowerCase().includes(q)
        })
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

            /*
             * Where this message sits in a run by the same person.
             *
             * These were called top/middle/bottom/single, but 'top' was set
             * when a message FOLLOWED another one, so it meant the last of a
             * run, and 'bottom' meant the first. The CSS written against those
             * names was flattening the wrong corners - which nobody noticed,
             * because the class was never applied to the element at all.
             */
            const continuesAbove = isSameAsPrev && !isTimeGap
            const continuesBelow = Boolean(isSameAsNext)

            let pos = 'only'
            if (continuesAbove && continuesBelow) pos = 'inner'
            else if (continuesAbove) pos = 'last'
            else if (continuesBelow) pos = 'first'

            groups.push({ type: 'message', value: m, id: m._id, pos, isNewGroup: !isSameAsPrev || isTimeGap })

            // Date divider. The key is the calendar day so two messages on the
            // same day never produce two dividers; the label is what a person
            // would actually say about that day.
            const dayKey = new Date(m.createdAt).toDateString()
            const prevDayKey = prev ? new Date(prev.createdAt).toDateString() : ''

            if (dayKey !== prevDayKey) {
                // Insert the divider before the message it introduces.
                groups.splice(groups.length - 1, 0, {
                    type: 'date',
                    value: dayLabel(m.createdAt),
                    id: `date-${m._id}`,
                })
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

    /*
     * Follow the conversation only while the reader is already at the bottom.
     *
     * Every new message used to scroll unconditionally, so reading back through
     * history and receiving a message threw you to the end mid-sentence. Your
     * own message always scrolls: you just sent it.
     */
    useEffect(() => {
        if (loadingMsgs || messages.length === 0) return

        if (isInitialLoad.current) {
            scrollToBottom(true)
            isInitialLoad.current = false
        } else if (messages.length > prevMsgCount.current) {
            const last = messages[messages.length - 1]
            const isMine = last?.sender === 'me' || (last?.sender?._id || last?.sender) === user?._id
            if (isMine || isAtBottom) scrollToBottom(false)
            else setUnseenBelow(n => n + 1)
        }
        prevMsgCount.current = messages.length
    }, [messages, loadingMsgs, scrollToBottom, isAtBottom, user?._id])

    // Reset initial load flag when convo changes
    useEffect(() => {
        isInitialLoad.current = true
        prevMsgCount.current = 0
        setUnseenBelow(0)
        setIsAtBottom(true)
    }, [convoId])

    // Track whether the reader is parked at the end, which is what decides
    // whether an incoming message is allowed to move them.
    const handleViewportScroll = useCallback(() => {
        const el = viewportRef.current
        if (!el) return
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight
        const atBottom = distance < 80
        setIsAtBottom(atBottom)
        if (atBottom) setUnseenBelow(0)
    }, [])

    // Load the draft for the conversation being opened. The matching write is
    // in the composer's onChange, not in an effect: as two effects they raced on
    // every conversation switch, because both getDraft and setDraft change
    // identity with convoId, so the "save" effect ran again after the "load"
    // effect and wrote the outgoing conversation's text into the incoming one.
    useEffect(() => {
        setInputText(getDraft())
    }, [convoId, getDraft])

    useEffect(() => {
        if (convoId) localStorage.setItem('zn_last_convo_id', convoId)
    }, [convoId])

    /*
     * Tell the other end we are typing.
     *
     * Throttled to one start per 3s rather than one per keystroke, and a stop
     * follows 2s after the last one so the indicator clears when someone pauses
     * instead of hanging until they send.
     */
    const notifyTyping = useCallback(() => {
        if (!socket || !convoId) return

        const now = Date.now()
        if (now - typingSentAt.current > 3000) {
            typingSentAt.current = now
            socket.emit('typing_start', convoId)
        }

        clearTimeout(typingStopTimer.current)
        typingStopTimer.current = setTimeout(() => {
            typingSentAt.current = 0
            socket.emit('typing_stop', convoId)
        }, 2000)
    }, [socket, convoId])

    const handleSend = async () => {
        // A reply with no text used to pass this guard and post an empty body.
        if (!inputText.trim()) return
        const body = inputText
        clearTimeout(typingStopTimer.current)
        typingSentAt.current = 0
        socket?.emit('typing_stop', convoId)
        const replyId = replyingTo?._id
        setInputText('')
        // Clear the stored draft too. It was left behind, so the sent text
        // reappeared in the composer the next time the conversation was opened.
        setDraft('')
        setReplyingTo(null)
        try {
            await sendMutation.mutateAsync({ text: body, replyToId: replyId })
            scrollToBottom()
        } catch {
            toast.error('Failed to send message')
            setInputText(body)
            setDraft(body)
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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        // Reset immediately, so picking the same file twice in a row still
        // fires a change event. Without this the second pick did nothing.
        e.target.value = ''
        if (!file) return

        const isVideo = file.type.startsWith('video/')
        const limit = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024
        if (!isVideo && !file.type.startsWith('image/')) {
            return toast.error('Only images and videos can be attached')
        }
        if (file.size > limit) {
            return toast.error(`That file is too large. Limit is ${isVideo ? '100MB' : '10MB'}.`)
        }

        try {
            await sendMediaMutation.mutateAsync({ file, text: inputText.trim() })
            setInputText('')
            setDraft('')
            scrollToBottom()
        } catch {
            toast.error('Could not send the attachment')
        }
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
                        <Suspense fallback={<div className="zn-emoji-loading">Loading emojis…</div>}>
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
                        </Suspense>
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
                    <div className="field field-sm">
                        <HiSearch size={16} className="field-icon" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="field-input"
                            placeholder={showArchived ? 'Search archived...' : 'Search chats...'}
                        />
                    </div>

                    <div className="zn-inbox-tabs" role="tablist" aria-label="Conversation list">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={!showArchived}
                            className={!showArchived ? 'active' : ''}
                            onClick={() => setShowArchived(false)}
                        >
                            Inbox
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={showArchived}
                            className={showArchived ? 'active' : ''}
                            onClick={() => setShowArchived(true)}
                        >
                            Archived
                        </button>
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
                                    // ConvoItem accepts no onPin/onMute/onArchive
                                    // and has no per-row menu, so those three
                                    // props were dead. The same actions are
                                    // available from the open chat's header menu.
                                    <ConvoItem
                                        key={c._id}
                                        c={c} isActive={convoId === c._id} user={user}
                                        onClick={() => navigate(`/messages/${c._id}`)}
                                    />
                                ))}
                            </div>
                        ) : convosFailed ? (
                            /* A failed request used to render as "No chats
                               found", so an outage looked like an empty inbox. */
                            <div key="convos-error" className="zn-empty-state" role="alert">
                                <div className="zn-empty-icon">
                                    <HiExclamationCircle size={36} />
                                </div>
                                <p className="zn-empty-title">Could not load chats</p>
                                <p className="zn-empty-sub">Check your connection and try again.</p>
                                <button className="btn btn-secondary btn-sm" onClick={() => refetchConvos()}>
                                    Try again
                                </button>
                            </div>
                        ) : (
                            /* "You have no conversations" and "your search
                               matched nothing" are different situations and used
                               to share one message, with no way out of either. */
                            <div key="empty" className="zn-empty-state">
                                <div className="zn-empty-icon">
                                    {searchQuery ? <HiSearch size={32} /> : <HiMail size={32} />}
                                </div>
                                {searchQuery ? (
                                    <>
                                        <p className="zn-empty-title">No chats match</p>
                                        <p className="zn-empty-sub">
                                            Nothing here for &ldquo;{searchQuery}&rdquo;.
                                        </p>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setSearchQuery('')}
                                        >
                                            Clear search
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="zn-empty-title">No messages yet</p>
                                        <p className="zn-empty-sub">
                                            Find someone to start a conversation with.
                                        </p>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => navigate('/search')}
                                        >
                                            Find people
                                        </button>
                                    </>
                                )}
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
                                                src={peer?.avatarUrl || avatarFallback(peer?.username)}
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
                                    {/* Neither of these had an accessible name
                                        or announced its state. */}
                                    <button
                                        type="button"
                                        onClick={() => { setIsSearchingInChat(!isSearchingInChat); if (!isSearchingInChat) setChatSearchQuery('') }}
                                        className={`zn-icon-btn${isSearchingInChat ? ' active' : ''}`}
                                        aria-label="Search in conversation"
                                        aria-expanded={isSearchingInChat}
                                    >
                                        <HiSearch size={18} />
                                    </button>
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowChatMenu(!showChatMenu)}
                                            className={`zn-icon-btn${showChatMenu ? ' active' : ''}`}
                                            aria-label="Conversation options"
                                            aria-haspopup="menu"
                                            aria-expanded={showChatMenu}
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
                                                        {/* Each states the value it wants rather than
                                                            toggling, so a stale local flag cannot invert
                                                            the request. */}
                                                        <button onClick={() => { pinMutation.mutate({ id: convoId, value: !activeConvo?.isPinned }); setShowChatMenu(false) }}>
                                                            {activeConvo?.isPinned ? 'Unpin chat' : 'Pin chat'}
                                                        </button>
                                                        <button onClick={() => { muteMutation.mutate({ id: convoId, value: !activeConvo?.isMuted }); setShowChatMenu(false) }}>
                                                            {activeConvo?.isMuted ? 'Unmute notifications' : 'Mute notifications'}
                                                        </button>
                                                        <button onClick={() => { archiveMutation.mutate({ id: convoId, value: !activeConvo?.isArchived }); navigate('/messages'); setShowChatMenu(false) }}>
                                                            {activeConvo?.isArchived ? 'Move to inbox' : 'Archive chat'}
                                                        </button>
                                                        <div className="zn-chat-menu-divider" style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                                                        {/* Was a single click
                                                            straight to deletion,
                                                            with no confirmation,
                                                            while ConfirmDialog
                                                            already existed. */}
                                                        <button onClick={() => { setShowChatMenu(false); setConfirmDeleteChat(true) }} style={{ color: 'var(--error)' }}>
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
                                        <div className="field field-sm">
                                            <HiSearch size={16} className="field-icon" />
                                            <input
                                                autoFocus
                                                value={chatSearchQuery}
                                                onChange={(e) => setChatSearchQuery(e.target.value)}
                                                placeholder="Search in conversation..."
                                                className="field-input"
                                            />
                                        </div>
                                        <button onClick={() => { setIsSearchingInChat(false); setChatSearchQuery('') }} className="zn-icon-btn-sm" aria-label="Close search">
                                            <HiX size={16} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Message Viewport */}
                            <div
                                ref={viewportRef}
                                className="zn-viewport"
                                onScroll={handleViewportScroll}
                                role="log"
                                aria-live="polite"
                                aria-label={`Conversation with ${peer?.username || 'your contact'}`}
                            >
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
                                                    pos={item.pos}
                                                    onReply={setReplyingTo}
                                                    onEdit={(msg) => { setEditingId(msg._id); setEditingText(msg.body) }}
                                                    onDelete={(messageId) => deleteMutation.mutate(messageId, {
                                                        onError: (err) => toast.error(
                                                            err.response?.data?.message || 'Could not delete the message',
                                                        ),
                                                    })}
                                                    onReact={(emoji) => onReact(item.value._id, emoji)}
                                                />
                                            )
                                        ))
                                    ) : messagesFailed ? (
                                        /* Previously indistinguishable from an
                                           empty thread. */
                                        <div className="zn-empty-chat" role="alert">
                                            <HiExclamationCircle size={28} className="zn-empty-chat-icon" />
                                            <p>We could not load these messages.</p>
                                            <button className="btn btn-secondary btn-sm" onClick={() => refetchMessages()}>
                                                Try again
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="zn-empty-chat">
                                            <HiMail size={28} className="zn-empty-chat-icon" />
                                            <p>Beginning of your conversation with {peer?.username || 'your contact'}.</p>
                                        </div>
                                    )}
                                </AnimatePresence>

                                {/* The server has relayed typing events since
                                    this feature was built; nothing listened. */}
                                <AnimatePresence>
                                    {peerTyping && (
                                        <motion.div
                                            className="zn-row peer pos-only zn-typing-row"
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 4 }}
                                        >
                                            <div className="zn-bubble-container">
                                                <div className="zn-bubble zn-typing-bubble" aria-live="polite"
                                                    aria-label={`${peer?.username || 'They'} is typing`}>
                                                    <span className="zn-typing-dot" />
                                                    <span className="zn-typing-dot" />
                                                    <span className="zn-typing-dot" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="zn-viewport-spacer" />
                            </div>

                            {/* Jump back to the end. Without it, scrolling up
                                through history left no way back except dragging
                                all the way down. */}
                            <AnimatePresence>
                                {!isAtBottom && (
                                    <motion.button
                                        type="button"
                                        className={`zn-jump-bottom${unseenBelow > 0 ? ' has-unseen' : ''}`}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        onClick={() => { scrollToBottom(false); setUnseenBelow(0) }}
                                        aria-label={unseenBelow > 0
                                            ? `${unseenBelow} new ${unseenBelow === 1 ? 'message' : 'messages'}, jump to latest`
                                            : 'Jump to latest'}
                                    >
                                        <HiArrowLeft size={16} style={{ transform: 'rotate(-90deg)' }} />
                                        {unseenBelow > 0 && (
                                            <span className="zn-jump-count">{unseenBelow}</span>
                                        )}
                                    </motion.button>
                                )}
                            </AnimatePresence>

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
                                            <button onClick={() => setReplyingTo(null)} className="zn-icon-btn-sm" aria-label="Cancel reply">
                                                <HiX size={16} />
                                            </button>
                                        </motion.div>
                                    )}
                                    <div className="zn-composer-pill field-shell">
                                        <div className="zn-emoji-picker-container">
                                            <button 
                                                className={`zn-composer-action-btn${showEmojiPicker ? ' active' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
                                            >
                                                <HiEmojiHappy size={22} />
                                            </button>
                                        </div>

                                        <button className="zn-composer-action-btn" onClick={() => fileInputRef.current?.click()} aria-label="Attach a photo or video">
                                            <HiPaperClip size={22} />
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            accept="image/*,video/*"
                                            hidden
                                        />

                                        <textarea
                                            ref={textareaRef}
                                            rows="1"
                                            value={inputText}
                                            onChange={(e) => {
                                                setInputText(e.target.value)
                                                // Draft is persisted here rather than from an
                                                // effect, so it cannot race the load on switch.
                                                setDraft(e.target.value)
                                                e.target.style.height = 'auto'
                                                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
                                                notifyTyping()
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
                                            disabled={!inputText.trim()}
                                            onClick={() => {
                                                handleSend()
                                                // textareaRef is right there; this used to
                                                // reach into the DOM by class name instead.
                                                if (textareaRef.current) textareaRef.current.style.height = 'auto'
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
                            <p className="zn-select-convo-sub">
                                Pick a conversation from the list, or start a new one.
                            </p>
                            {/* "start a new one" was plain text. There was no
                                control on this panel at all. */}
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => navigate('/search')}
                            >
                                Start a new chat
                            </button>
                        </div>
                    )}
            </main>

            {confirmDeleteChat && (
                <ConfirmDialog
                    title={`Delete your conversation with ${peer?.username || 'this person'}?`}
                    body="The whole thread goes, for you and for them, and it cannot be brought back."
                    confirmLabel="Delete conversation"
                    destructive
                    onClose={() => setConfirmDeleteChat(false)}
                    onConfirm={() => { deleteChatMutation.mutate(convoId); navigate('/messages') }}
                />
            )}

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
                                <button onClick={() => setEditingId(null)} className="zn-icon-btn" aria-label="Close editor">
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
                                        } catch (err) {
                                            // The server owns the 15-minute window and
                                            // explains a refusal; a generic message here
                                            // hid the actual reason.
                                            toast.error(err.response?.data?.message || 'Update failed')
                                            if (err.response?.status === 400) setEditingId(null)
                                        }
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
