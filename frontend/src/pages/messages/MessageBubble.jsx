import { HiDotsVertical, HiPencil, HiTrash } from 'react-icons/hi'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'

export default function MessageBubble({ 
    message, 
    isSelf, 
    peer,
    onDelete, 
    onEdit, 
    timeago,
    showActions = true 
}) {
    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef(null)
    const isFailed = message.status === 'failed'
    const isSending = message.status === 'sending'

    useEffect(() => {
        if (!showMenu) return
        const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [showMenu])

    return (
        <div className={`dm-message-row ${isSelf ? 'self' : 'peer'}`}>
            {!isSelf && (
                <img 
                    src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=6366F1&color=fff`} 
                    alt="" 
                    className="dm-bubble-avatar" 
                />
            )}
            
            <div className="dm-message-container">
                <motion.div 
                    layout
                    className={`dm-bubble ${isSelf ? 'dm-bubble-primary' : 'dm-bubble-secondary'}`}
                >
                    {message.mediaUrl && (
                        <div className="dm-message-media">
                            {message.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                                <video src={message.mediaUrl} controls className="dm-media-img" />
                            ) : (
                                <img src={message.mediaUrl} alt="" className="dm-media-img" />
                            )}
                        </div>
                    )}
                    {message.body && (
                        <div className="dm-message-text">
                            {message.body}
                        </div>
                    )}
                </motion.div>

                <div className="dm-message-meta">
                    <span className="dm-message-time">
                        {isSending ? 'Sending...' : isFailed ? 'Failed' : timeago(message.createdAt)}
                        {message.isEdited && <span className="ml-1 opacity-50">(edited)</span>}
                    </span>
                    
                    {isSelf && showActions && !isSending && !isFailed && (
                        <div className="dm-message-actions-wrap" ref={menuRef}>
                            <button 
                                className={`dm-msg-action-trigger ${showMenu ? 'active' : ''}`}
                                onClick={() => setShowMenu(!showMenu)}
                            >
                                <HiDotsVertical size={14}/>
                            </button>
                            
                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div 
                                        className="dm-msg-context-menu"
                                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                    >
                                        <button onClick={() => { onEdit(message); setShowMenu(false) }}>
                                            <HiPencil size={14} /> <span>Edit</span>
                                        </button>
                                        <button className="text-error" onClick={() => { onDelete(message); setShowMenu(false) }}>
                                            <HiTrash size={14} /> <span>Delete</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
