import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { chatApi } from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import { timeago } from '../utils/timeago'
import toast from 'react-hot-toast'

// New Modular Components
import MessagesLayout from './messages/MessagesLayout'
import ConversationList from './messages/ConversationList'
import ChatHeader from './messages/ChatHeader'
import MessageBubble from './messages/MessageBubble'
import MessageComposer from './messages/MessageComposer'
import EmptyState from './messages/EmptyState'
import NewConvoModal from './messages/NewConvoModal'

export default function Messages() {
    const { id: paramConvoId } = useParams()
    const { user } = useAuth()
    const navigate = useNavigate()
    const socket = useSocket(user)

    const [conversations, setConversations] = useState([])
    const [activeConvo, setActiveConvo] = useState(null)
    const [messages, setMessages] = useState([])
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [initialLoad, setInitialLoad] = useState(true)
    const [starting, setStarting] = useState(false)
    const [convoSearch, setConvoSearch] = useState('')
    const [text, setText] = useState('')
    const [editingMessage, setEditingMessage] = useState(null)
    const [peerTyping, setPeerTyping] = useState(false)
    const [showNewConvo, setShowNewConvo] = useState(false)
    const [showEmoji, setShowEmoji] = useState(false)
    const [filePreview, setFilePreview] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const [mobilePanel, setMobilePanel] = useState('list') // 'list' | 'chat'

    const bottomRef = useRef()
    const fileRef = useRef()
    const inputRef = useRef()
    const typingTimer = useRef()
    
    // Refs for socket callbacks (to avoid stale closures)
    const activeConvoRef = useRef(activeConvo)
    useEffect(() => { activeConvoRef.current = activeConvo }, [activeConvo])

    const scrollToBottom = (behavior = 'smooth') => {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior }), 50)
    }

    // ─── Data Loading ──────────────────────────────────────────

    const loadConvos = async (isFirst = false) => {
        if (isFirst) setInitialLoad(true)
        try {
            const { data } = await chatApi.get('')
            setConversations(data.data || [])
        } catch {
            console.error("Failed to load conversations")
        } finally {
            setInitialLoad(false)
        }
    }

    const loadMessages = useCallback(async (convoId) => {
        if (!convoId) return
        setLoadingMessages(true)
        try {
            // FIX: chatApi already has /conversations base
            const { data } = await chatApi.get(`${convoId}/messages`, { params: { limit: 50 } })
            setMessages(data.data || [])
            await chatApi.patch(`${convoId}/messages/read`, {})
            window.dispatchEvent(new CustomEvent('peernet:sync-counts'))
            scrollToBottom('instant')
        } catch {
            console.error("Failed to load messages")
        } finally {
            setLoadingMessages(false)
        }
    }, [])

    useEffect(() => {
        loadConvos(true)
    }, [])

    useEffect(() => {
        if (paramConvoId && conversations.length > 0) {
            const match = conversations.find(c => c._id === paramConvoId)
            if (match) {
                setActiveConvo(match)
                setMobilePanel('chat')
            } else if (!initialLoad) {
                // If not found and not loading, maybe it's a new convo from profile
                // Try reloading convos once to see if it appeared
                loadConvos()
            }
        }
    }, [paramConvoId, conversations, initialLoad])

    useEffect(() => {
        if (activeConvo?._id) {
            loadMessages(activeConvo._id)
            socket?.emit('join_conversation', activeConvo._id)
        }
        return () => {
            if (activeConvo?._id) socket?.emit('leave_conversation', activeConvo._id)
        }
    }, [activeConvo?._id, loadMessages, socket])

    // ─── Socket Event Handlers ───────────────────────────────────

    useEffect(() => {
        if (!socket) return

        const onNewMsg = (msg) => {
            if (msg.conversationId !== activeConvoRef.current?._id) {
                setConversations(prev => prev.map(c => 
                    c._id === msg.conversationId 
                    ? { ...c, lastMessage: msg, unreadCount: (c.unreadCount || 0) + 1 } 
                    : c
                ).sort((a, b) => (a._id === msg.conversationId ? -1 : (b._id === msg.conversationId ? 1 : 0))))
                return
            }

            setMessages(prev => {
                const exists = prev.find(m => m._id === msg._id || m._id === `opt_${msg.tempId}`)
                if (exists) return prev.map(m => m._id === exists._id ? msg : m)
                return [...prev, msg]
            })
            
            chatApi.patch(`${msg.conversationId}/messages/read`, {})
            scrollToBottom()
            
            setConversations(prev => prev.map(c => 
                c._id === msg.conversationId ? { ...c, lastMessage: msg } : c
            ))
        }

        const onTyping = ({ userId }) => {
            if (userId !== user?._id) setPeerTyping(true)
        }
        const onStopTyping = ({ userId }) => {
            if (userId !== user?._id) setPeerTyping(false)
        }

        socket.on('new_message', onNewMsg)
        socket.on('user_typing_start', onTyping)
        socket.on('user_typing_stop', onStopTyping)

        socket.on('message_edited', (msg) => {
            if (msg.conversationId === activeConvoRef.current?._id) {
                setMessages(prev => prev.map(m => m._id === msg._id ? msg : m))
            }
        })

        socket.on('message_deleted', ({ messageId }) => {
            setMessages(prev => prev.filter(m => m._id !== messageId))
        })

        return () => {
            socket.off('new_message', onNewMsg)
            socket.off('user_typing_start')
            socket.off('user_typing_stop')
            socket.off('message_edited')
            socket.off('message_deleted')
        }
    }, [socket, user?._id])

    // ─── Action Handlers ────────────────────────────────────────

    const handleSelectConvo = (c) => {
        setActiveConvo(c)
        setMobilePanel('chat')
        navigate(`/messages/${c._id}`)
    }

    const handleType = (e) => {
        setText(e.target.value)
        if (!socket || !activeConvo) return
        
        socket.emit('typing_start', { conversationId: activeConvo._id })
        clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => {
            socket.emit('typing_stop', { conversationId: activeConvo._id })
        }, 2000)
    }

    const handleSend = async (e) => {
        e?.preventDefault()
        if ((!text.trim() && !filePreview) || isUploading) return

        const currentConvoId = activeConvo?._id;
        if (!currentConvoId) return;

        if (editingMessage) {
            const originalId = editingMessage._id
            const newBody = text
            setMessages(prev => prev.map(m => m._id === originalId ? { ...m, body: newBody } : m))
            setEditingMessage(null)
            setText('')
            
            try {
                await chatApi.patch(`${currentConvoId}/messages/${originalId}`, { body: newBody })
            } catch {
                toast.error("Failed to update message")
                // Rollback not strictly necessary here as socket will eventually sync, but good for UX
            }
            return
        }

        const tempId = Date.now()
        const optimisticMsg = {
            _id: `opt_${tempId}`,
            body: text,
            sender: user._id,
            createdAt: new Date().toISOString(),
            status: 'sending'
        }

        setMessages(prev => [...prev, optimisticMsg])
        setText('')
        setFilePreview(null)
        scrollToBottom()

        try {
            let mediaUrl = null
            if (filePreview) {
                setIsUploading(true)
                const formData = new FormData()
                formData.append('file', filePreview.file)
                const uploadRes = await api.post('/upload', formData)
                mediaUrl = uploadRes.data.url
            }

            // FIX: chatApi already has /conversations base
            await chatApi.post(`${currentConvoId}/messages`, {
                body: text,
                mediaUrl,
                tempId
            })
        } catch {
            setMessages(prev => prev.map(m => m._id === optimisticMsg._id ? { ...m, status: 'failed' } : m))
            toast.error("Failed to send message")
        } finally {
            setIsUploading(false)
        }
    }

    const startEditing = (m) => {
        setEditingMessage(m)
        setText(m.body)
        inputRef.current?.focus()
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'doc'
        const url = URL.createObjectURL(file)
        setFilePreview({ file, url, type, name: file.name })
    }

    const startNewConvo = async (otherUser) => {
        setShowNewConvo(false)
        setStarting(true)
        try {
            // FIX: chatApi already has /conversations base
            // Use api.post('/conversations') or chatApi.post('')
            const { data } = await chatApi.post('', { targetUserId: otherUser._id })
            const newC = data.data
            setConversations(prev => {
                if (prev.find(c => c._id === newC._id)) return prev
                return [newC, ...prev]
            })
            handleSelectConvo(newC)
        } catch {
            toast.error("Failed to start conversation")
        } finally {
            setStarting(false)
        }
    }

    const deleteMessage = async (m) => {
        if (!window.confirm("Delete this message?")) return
        try {
            await chatApi.delete(`${activeConvo._id}/messages/${m._id}`)
            setMessages(prev => prev.filter(x => x._id !== m._id))
        } catch {
            toast.error("Delete failed")
        }
    }


    const peer = activeConvo?.participants?.find(p => (p._id || p) !== user?._id) || activeConvo?.participant;

    return (
        <MessagesLayout>
            <ConversationList 
                user={user}
                conversations={conversations}
                activeConvo={activeConvo}
                onSelectConvo={handleSelectConvo}
                onNewConvo={() => setShowNewConvo(true)}
                initialLoad={initialLoad}
                starting={starting}
                convoSearch={convoSearch}
                setConvoSearch={setConvoSearch}
                timeago={timeago}
                className={mobilePanel === 'chat' ? 'dm-list-mobile-hidden' : ''}
            />

            <main className={`dm-chat-area-root ${mobilePanel === 'list' ? 'dm-chat-mobile-hidden' : ''}`}>
                {activeConvo ? (
                    <>
                        <ChatHeader 
                            participant={peer}
                            isOnline={activeConvo.isOnline}
                            onBack={() => setMobilePanel('list')}
                            onNavigateProfile={(uid) => navigate(`/profile/${uid}`)}
                        />
                        
                        <div className="dm-messages-scroll dark-scrollbar">
                            {loadingMessages ? (
                                <div className="dm-loading-center">
                                    <div className="dm-loading-spinner" />
                                </div>
                            ) : (
                                <div className="dm-messages-inner">
                                    <div className="dm-messages-header-info">
                                        <img src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=6366F1&color=fff`} className="dm-info-avatar" alt="" />
                                        <h2>{peer?.fullName || peer?.username}</h2>
                                        <p>{peer?.username} · PeerNet Member</p>
                                        <button className="dm-info-view-btn" onClick={() => navigate(`/profile/${peer?._id}`)}>View Profile</button>
                                    </div>

                                    {messages.map((m) => (
                                        <MessageBubble 
                                            key={m._id}
                                            message={m}
                                            isSelf={(m.sender?._id || m.sender) === user?._id}
                                            peer={peer}
                                            onDelete={deleteMessage}
                                            onEdit={startEditing}
                                            timeago={timeago}
                                        />
                                    ))}
                                    {peerTyping && (
                                        <div className="dm-typing-indicator">
                                            <span>{peer?.username} is typing...</span>
                                        </div>
                                    )}
                                    {messages.length === 0 && !loadingMessages && (
                                        <div className="dm-no-messages-yet">
                                            <div className="dm-no-messages-icon">✉️</div>
                                            <p>No messages here yet...</p>
                                            <span className="t-small">Send a message to start the conversation</span>
                                        </div>
                                    )}
                                    <div ref={bottomRef} style={{ height: 20 }} />
                                </div>
                            )}
                        </div>

                        <MessageComposer 
                            text={text}
                            setText={setText}
                            handleType={handleType}
                            handleSend={handleSend}
                            handleFileSelect={handleFileSelect}
                            filePreview={filePreview}
                            setFilePreview={setFilePreview}
                            showEmoji={showEmoji}
                            setShowEmoji={setShowEmoji}
                            insertEmoji={(e) => setText(prev => prev + (e.native || e.emoji))}
                            isUploading={isUploading}
                            inputRef={inputRef}
                            fileRef={fileRef}
                            editingMessage={editingMessage}
                            onCancelEdit={() => {
                                setEditingMessage(null)
                                setText('')
                            }}
                        />
                    </>
                ) : (
                    <EmptyState onNewMessage={() => setShowNewConvo(true)} />
                )}
            </main>

            {showNewConvo && (
                <NewConvoModal 
                    onClose={() => setShowNewConvo(false)}
                    onStart={startNewConvo}
                />
            )}
        </MessagesLayout>
    )
}
