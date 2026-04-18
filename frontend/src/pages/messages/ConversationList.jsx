import React from 'react'
import { HiPencilAlt, HiSearch, HiBadgeCheck } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'

const ListSkeleton = () => (
    <div className="dm-list-skeleton">
        {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="dm-skeleton-row animate-shimmer">
                <div className="dm-skeleton-avatar" />
                <div className="dm-skeleton-text">
                    <div className="dm-skeleton-line short" />
                    <div className="dm-skeleton-line long" />
                </div>
            </div>
        ))}
    </div>
)

export default function ConversationList({
    user,
    conversations,
    activeConvo,
    onSelectConvo,
    onNewConvo,
    initialLoad,
    starting,
    convoSearch,
    setConvoSearch,
    timeago,
    className = ''
}) {
    const navigate = useNavigate()

    const getOther = (c) => c.participants?.find(p => p._id !== user?._id)

    const filteredConvos = (conversations || []).filter(c => {
        if (!c) return false
        if (!convoSearch.trim()) return true
        const peer = getOther(c)
        if (!peer) return false
        const s = convoSearch.toLowerCase()
        return (peer.username || '').toLowerCase().includes(s) || (peer.fullName || '').toLowerCase().includes(s)
    })

    return (
        <aside className={`dm-list-panel ${className}`}>
            <div className="dm-list-header">
                <div className="dm-list-header-top">
                    <h1 className="dm-list-title">Messages</h1>
                    <button className="dm-new-btn" onClick={onNewConvo} title="New Message">
                        <HiPencilAlt />
                    </button>
                </div>
                
                <div className="dm-search-container">
                    <div className="dm-search-wrap">
                        <HiSearch className="dm-search-icon" />
                        <input
                            value={convoSearch}
                            onChange={e => setConvoSearch(e.target.value)}
                            placeholder="Search chats"
                            className="dm-search-input"
                        />
                    </div>
                </div>
            </div>

            <div className="dm-list-scroll no-scrollbar">
                {(initialLoad || starting) && <ListSkeleton />}
                
                {!initialLoad && filteredConvos.map(c => {
                    const peer = getOther(c)
                    const avatar = peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=6366F1&color=fff`
                    const isActive = activeConvo?._id === c._id
                    const lastMsg = c.lastMessage
                    const isUnread = c.unreadCount > 0

                    return (
                        <div 
                            key={c._id} 
                            onClick={() => onSelectConvo(c)}
                            className={`dm-convo-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                        >
                            <div className="dm-avatar-wrap">
                                <img src={avatar} className="dm-avatar" alt={peer?.username} />
                                {c.isOnline && <span className="dm-online-indicator" />}
                            </div>

                            <div className="dm-convo-info">
                                <div className="dm-convo-row">
                                    <span className="dm-username truncate">
                                        {peer?.username}
                                        {peer?.isVerified && <HiBadgeCheck className="dm-verified-icon" />}
                                    </span>
                                    {lastMsg?.createdAt && (
                                        <span className="dm-time">
                                            {timeago(lastMsg.createdAt)}
                                        </span>
                                    )}
                                </div>
                                <div className="dm-convo-row">
                                    <p className="dm-last-msg truncate">
                                        {lastMsg?.sender === user?._id && <span className="dm-you-prefix">You: </span>}
                                        {lastMsg?.body || (lastMsg?.mediaUrl ? 'Sent an attachment' : 'No messages yet')}
                                    </p>
                                    {isUnread && <span className="dm-unread-dot" />}
                                </div>
                            </div>
                        </div>
                    )
                })}

                {!initialLoad && !conversations.length && !starting && (
                    <div className="dm-empty-list">
                        <div className="dm-empty-icon">✉️</div>
                        <h3>No messages found</h3>
                        <p>Start a conversation with your peers to collaborate.</p>
                        <button className="dm-empty-btn" onClick={onNewConvo}>Send Message</button>
                    </div>
                )}
            </div>
        </aside>
    )
}
