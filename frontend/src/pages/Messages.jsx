import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { chatApi } from '../api/axios'
import { useSocket } from '../hooks/useSocket'
import { timeago } from '../utils/timeago'
import toast from 'react-hot-toast'

import ChatList from './messages/ChatList'
import ChatArea from './messages/ChatArea'
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
    const [peerTyping, setPeerTyping] = useState(false)
    const [showNewConvo, setShowNewConvo] = useState(false)
    const [showEmoji, setShowEmoji] = useState(false)
    const [filePreview, setFilePreview] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const [editingMessageId, setEditingMessageId] = useState(null)
    const [editBody, setEditBody] = useState('')
    const [suggestions, setSuggestions] = useState([])
    const [mobilePanel, setMobilePanel] = useState('list') // 'list' | 'chat'

    const bottomRef = useRef()
    const fileRef = useRef()
    const docRef = useRef()
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
        } catch (err) {
            console.error("Failed to load conversations:", err)
        } finally {
            setInitialLoad(false)
        }
    }

    const fetchSuggestions = useCallback(async (convoId) => {
        if (!convoId) return setSuggestions([])
        try {
            const { data } = await chatApi.get(`${convoId}/suggestions`)
            setSuggestions(data.suggestions || [])
        } catch (err) {
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
            window.dispatchEvent(new CustomEvent('peernet:sync-counts'))
            fetchSuggestions(convoId)
            scrollToBottom('instant')
        } catch (err) {
            toast.error("Failed to load messages")
        } finally {
            setLoadingMessages(false)
        }
    }, [fetchSuggestions])

    // ─── Effects ────────────────────────────────────────────────

    useEffect(() => {
        loadConvos(true)
    }, [])

    useEffect(() => {
        if (!conversations.length) return
        if (paramConvoId) {
            const match = conversations.find(c => c._id === paramConvoId)
            if (match) {
                setActiveConvo(match)
                setMobilePanel('chat')
                return
            }
        }
    }, [paramConvoId, conversations])

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
                // Not in current chat, just update sidebar
                setConversations(prev => prev.map(c => 
                    c._id === msg.conversationId 
                    ? { ...c, lastMessage: msg, unreadCount: (c.unreadCount || 0) + 1 } 
                    : c
                ))
                return
            }

            // In current chat
            setMessages(prev => {
                const exists = prev.find(m => m._id === msg._id || m._id === `opt_${msg.tempId}`)
                if (exists) return prev.map(m => m._id === exists._id ? msg : m)
                return [...prev, msg]
            })
            
            chatApi.patch(`${msg.conversationId}/messages/read`, {})
            fetchSuggestions(msg.conversationId)
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
        socket.on('user_typing', onTyping) // legacy
        socket.on('user_stop_typing', onStopTyping) // legacy

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
            socket.off('user_typing')
            socket.off('user_stop_typing')
            socket.off('message_edited')
            socket.off('message_deleted')
        }
    }, [socket, user?._id, fetchSuggestions])

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

            const { data } = await chatApi.post(`conversations/${activeConvo._id}/messages`, {
                body: text,
                mediaUrl,
                tempId
            })

            // new_message socket will handle the replacement of optimistic message
        } catch (err) {
            setMessages(prev => prev.map(m => m._id === optimisticMsg._id ? { ...m, status: 'failed' } : m))
            toast.error("Failed to send message")
        } finally {
            setIsUploading(false)
        }
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
            const { data } = await chatApi.post('conversations', { recipientId: otherUser._id })
            const newC = data.data
            setConversations(prev => {
                if (prev.find(c => c._id === newC._id)) return prev
                return [newC, ...prev]
            })
            handleSelectConvo(newC)
        } catch (err) {
            toast.error("Failed to start conversation")
        } finally {
            setStarting(false)
        }
    }

    const deleteMessage = async (m) => {
        if (!window.confirm("Delete this message?")) return
        try {
            await chatApi.delete(`conversations/${activeConvo._id}/messages/${m._id}`)
            setMessages(prev => prev.filter(x => x._id !== m._id))
        } catch {
            toast.error("Delete failed")
        }
    }

    const saveEdit = async (m) => {
        if (!editBody.trim()) return
        try {
            const { data } = await chatApi.patch(`conversations/${activeConvo._id}/messages/${m._id}`, { body: editBody })
            setMessages(prev => prev.map(x => x._id === m._id ? data.data : x))
            setEditingMessageId(null)
        } catch {
            toast.error("Edit failed")
        }
    }

    return (
        <div className="dm-layout-root" style={{
            height: '100%',
            display: 'flex',
            overflow: 'hidden',
            background: 'var(--bg)'
        }}>
            <ChatList 
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
                className={mobilePanel === 'chat' ? 'dm-mobile-hidden' : ''}
            />

            <ChatArea 
                user={user}
                activeConvo={activeConvo}
                messages={messages}
                loadingMessages={loadingMessages}
                text={text}
                setText={setText}
                peerTyping={peerTyping}
                handleType={handleType}
                handleSend={handleSend}
                handleFileSelect={handleFileSelect}
                onBack={() => setMobilePanel('list')}
                onNavigateProfile={(uid) => navigate(`/profile/${uid}`)}
                timeago={timeago}
                filePreview={filePreview}
                setFilePreview={setFilePreview}
                showEmoji={showEmoji}
                setShowEmoji={setShowEmoji}
                insertEmoji={(e) => setText(prev => prev + e.emoji)}
                isUploading={isUploading}
                editingMessageId={editingMessageId}
                setEditingMessageId={setEditingMessageId}
                editBody={editBody}
                setEditBody={setEditBody}
                startEditing={(m) => { setEditingMessageId(m._id); setEditBody(m.body); }}
                saveEdit={saveEdit}
                cancelEditing={() => setEditingMessageId(null)}
                deleteMessage={deleteMessage}
                suggestions={suggestions}
                bottomRef={bottomRef}
                inputRef={inputRef}
                fileRef={fileRef}
                docRef={docRef}
                className={mobilePanel === 'list' ? 'dm-mobile-hidden' : ''}
            />

            {showNewConvo && (
                <NewConvoModal 
                    onClose={() => setShowNewConvo(false)}
                    onStart={startNewConvo}
                />
            )}
        </div>
    )
}
