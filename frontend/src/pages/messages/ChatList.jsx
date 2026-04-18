import React from 'react'
import { HiPencilAlt, HiSearch, HiBadgeCheck } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'

const ChatListSkeleton = () => (
    <div className="chat-list-skeleton">
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton-item animate-shimmer" style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px'
            }}>
                <div className="skeleton-avatar" style={{
                    width: 52, height: 52, borderRadius: '50%', background: 'var(--hover)'
                }} />
                <div className="skeleton-info" style={{ flex: 1 }}>
                    <div style={{ width: '40%', height: 14, background: 'var(--hover)', marginBottom: 8, borderRadius: 4 }} />
                    <div style={{ width: '70%', height: 12, background: 'var(--hover)', borderRadius: 4 }} />
                </div>
            </div>
        ))}
    </div>
)

export default function ChatList({ 
    user, 
    conversations, 
    activeConvo, 
    onSelectConvo, 
    onNewConvo, 
    initialLoad, 
    starting,
    convoSearch,
    setConvoSearch,
    timeago
}) {
    const navigate = useNavigate()

    const getOther = (c) => c.participants?.find(p => p._id !== user?._id)

    const filteredConvos = (conversations || []).filter(c => {
        if (!c) return false;
        if (!convoSearch.trim()) return true;
        const peer = getOther(c);
        if (!peer) return false;
        const s = convoSearch.toLowerCase();
        return (peer.username || '').toLowerCase().includes(s) || (peer.fullName || '').toLowerCase().includes(s);
    })

    return (
        <div className="dm-panel dm-list-panel"
            style={{ 
                flexShrink: 0, 
                width: '350px',
                borderRight: '1px solid var(--border)', 
                display: 'flex', 
                flexDirection: 'column', 
                background: 'var(--surface)',
                height: '100%'
            }}>

            {/* List header */}
            <div className="chat-list-header" style={{ 
                padding: '20px 20px 14px', 
                borderBottom: '1px solid var(--border)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                flexShrink: 0 
            }}>
                <div className="flex items-center gap-2">
                    <span style={{ fontFamily: "'Syne','Inter',sans-serif", fontWeight: 800, fontSize: 20 }}>
                        {user?.username}
                    </span>
                </div>
                <button onClick={onNewConvo}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-1)', fontSize: 22, display: 'flex', alignItems: 'center', padding: 4 }}>
                    <HiPencilAlt />
                </button>
            </div>

            {/* Messages label */}
            <div style={{ padding: '14px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>Messages</span>
                {conversations.length > 0 && (
                    <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>
                        {conversations.length} total
                    </span>
                )}
            </div>

            {/* Search */}
            <div style={{ padding: '0 16px 14px', flexShrink: 0 }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--hover)', borderRadius: 12, padding: '10px 14px',
                    border: '1px solid transparent',
                    transition: 'all 0.2s ease',
                }}
                className="search-input-wrap">
                    <HiSearch style={{ color: 'var(--text-3)', fontSize: 16, flexShrink: 0 }} />
                    <input
                        value={convoSearch}
                        onChange={e => setConvoSearch(e.target.value)}
                        placeholder="Search conversations"
                        style={{
                            background: 'none', border: 'none', outline: 'none',
                            fontSize: 14, color: 'var(--text-1)', width: '100%'
                        }}
                    />
                </div>
            </div>

            {/* Convo items */}
            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
                {(initialLoad || starting) ? (
                    <ChatListSkeleton />
                ) : null}
                
                {!initialLoad && filteredConvos.map(c => {
                    const peer = getOther(c)
                    const pav = peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=6366F1&color=fff`
                    const isActive = activeConvo?._id === c._id
                    const lastMsg = c.lastMessage
                    const isUnread = c.unreadCount > 0

                    return (
                        <div key={c._id} onClick={() => onSelectConvo(c)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '12px 16px', cursor: 'pointer',
                                background: isActive ? 'var(--accent-subtle)' : 'transparent',
                                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                                transition: 'all 0.2s ease',
                                position: 'relative'
                            }}
                            className="convo-item">
                            
                            <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => { e.stopPropagation(); navigate(`/profile/${peer?._id}`) }}>
                                <img src={pav} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', display: 'block' }} alt="" />
                                {c.isOnline && (
                                    <div style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, background: 'var(--success)', borderRadius: '50%', border: '2.5px solid var(--surface)' }} />
                                )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: isUnread ? 800 : 600, fontSize: 15 }}>
                                        <span className="truncate">{peer?.username}</span>
                                        {peer?.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 14 }} />}
                                    </div>
                                    {lastMsg?.createdAt && (
                                        <span style={{ fontSize: 12, color: isUnread ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0, fontWeight: isUnread ? 700 : 400 }}>
                                            {timeago(lastMsg.createdAt)}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ 
                                        fontSize: 13, 
                                        color: isUnread ? 'var(--text-1)' : 'var(--text-3)', 
                                        whiteSpace: 'nowrap', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis',
                                        flex: 1,
                                        fontWeight: isUnread ? 700 : 400
                                    }}>
                                        {lastMsg?.sender === user?._id && <span style={{ marginRight: 4 }}>You:</span>}
                                        {lastMsg?.body || 'Sent an attachment'}
                                    </div>
                                    {isUnread && (
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, boxShadow: '0 0 10px var(--accent-ring)' }} />
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}

                {!initialLoad && !conversations.length && !starting && (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-3)' }}>
                        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>✉️</div>
                        <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)', marginBottom: 8 }}>No messages yet</p>
                        <p style={{ fontSize: 13, marginBottom: 24 }}>Connect with peers to start a conversation</p>
                        <button className="btn btn-primary btn-sm" onClick={onNewConvo}>New Message</button>
                    </div>
                )}
            </div>
        </div>
    )
}
