import React from 'react'
import { 
    HiArrowLeft, HiBadgeCheck, HiEmojiHappy, HiPhotograph, 
    HiDocument, HiPaperAirplane, HiDownload, HiTrash, 
    HiX, HiPencilAlt, HiChatAlt2 
} from 'react-icons/hi'
import EmojiPicker from 'emoji-picker-react'
import { MessageBubblesSkeleton } from '../../components/SkeletonLoader'

const TypingBubble = () => (
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

export default function ChatArea({
    user,
    activeConvo,
    messages,
    loadingMessages,
    text,
    setText,
    peerTyping,
    handleType,
    handleSend,
    handleFileSelect,
    onBack,
    onNavigateProfile,
    timeago,
    filePreview,
    setFilePreview,
    showEmoji,
    setShowEmoji,
    insertEmoji,
    isUploading,
    editingMessageId,
    setEditingMessageId,
    editBody,
    setEditBody,
    startEditing,
    saveEdit,
    cancelEditing,
    deleteMessage,
    suggestions,
    bottomRef,
    inputRef,
    fileRef,
    docRef
}) {
    if (!activeConvo) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', textAlign: 'center', padding: 32, gap: 16 }}>
                <div style={{
                    width: 96, height: 96, borderRadius: '50%',
                    border: '2px solid var(--border-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 48, marginBottom: 8,
                    background: 'var(--accent-subtle)',
                    color: 'var(--accent)'
                }}>
                    <HiChatAlt2 />
                </div>
                <h2 style={{ color: 'var(--text-1)', fontWeight: 800, fontSize: 22, margin: 0 }}>Your Messages</h2>
                <p style={{ maxWidth: 280, fontSize: 15, margin: 0 }}>Send private photos and messages to a friend or group.</p>
                <button className="btn btn-primary" style={{ marginTop: 8 }}>Send Message</button>
            </div>
        )
    }

    const getOther = (c) => c.participants?.find(p => p._id !== user?._id)
    const other = getOther(activeConvo)
    const otherAvatar = other?.avatarUrl || (other ? `https://ui-avatars.com/api/?name=${other.username}&background=6366F1&color=fff` : null)

    return (
        <div className="dm-chat-view" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg)', height: '100%' }}>
            {/* Header */}
            <div className="chat-area-header" style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 20px', borderBottom: '1px solid var(--border)',
                background: 'var(--surface)', flexShrink: 0, zIndex: 10
            }}>
                <button className="dm-back-btn btn btn-ghost btn-icon" onClick={onBack} style={{ marginRight: 4 }}>
                    <HiArrowLeft size={20} />
                </button>
                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onNavigateProfile(other?._id)}>
                    <img src={otherAvatar} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', display: 'block' }} alt="" />
                    {activeConvo.isOnline && (
                        <div style={{ position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, background: 'var(--success)', borderRadius: '50%', border: '2.5px solid var(--surface)' }} />
                    )}
                </div>
                <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => onNavigateProfile(other?._id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 16 }}>
                        <span className="truncate">{other?.username}</span>
                        {other?.isVerified && <HiBadgeCheck style={{ color: 'var(--accent)', fontSize: 14 }} />}
                    </div>
                    <div style={{ fontSize: 12, color: (activeConvo.isOnline || peerTyping) ? 'var(--success)' : 'var(--text-3)', marginTop: 1, fontWeight: (activeConvo.isOnline || peerTyping) ? 600 : 400 }}>
                        {peerTyping ? 'typing…' : activeConvo.isOnline ? 'Active now' : 'Offline'}
                    </div>
                </div>
            </div>

            {/* Messages body */}
            <div className="messages-box no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {loadingMessages ? (
                    <MessageBubblesSkeleton />
                ) : messages.length === 0 && (
                    <div style={{ textAlign: 'center', margin: 'auto', padding: '40px 0', color: 'var(--text-3)' }}>
                        <img src={otherAvatar} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 20px', display: 'block', border: '4px solid var(--surface)', boxShadow: 'var(--shadow-md)' }} alt="" />
                        <h3 style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-1)', marginBottom: 8 }}>{other?.username}</h3>
                        <p style={{ fontSize: 14 }}>PeerNet Explorer · 240.5k followers</p>
                        <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={() => onNavigateProfile(other?._id)}>View Profile</button>
                    </div>
                )}

                {!loadingMessages && messages.map((m, i) => {
                    const mSenderId = m.sender?._id || m.sender
                    const isMine = mSenderId === user?._id
                    const nextSender = messages[i + 1]?.sender?._id || messages[i + 1]?.sender
                    const prevSender = messages[i - 1]?.sender?._id || messages[i - 1]?.sender
                    const isFirst = prevSender !== mSenderId
                    const isLast = nextSender !== mSenderId

                    const r = 22
                    const rSmall = 5
                    const borderRadius = isMine
                        ? `${r}px ${isFirst ? r : rSmall}px ${isLast ? r : rSmall}px ${r}px`
                        : `${isFirst ? r : rSmall}px ${r}px ${r}px ${isLast ? r : rSmall}px`

                    return (
                        <div key={m._id || i} style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: isMine ? 'flex-end' : 'flex-start',
                            marginBottom: isLast ? 10 : 2,
                            position: 'relative'
                        }}
                        className="message-row">
                            {!isMine && isFirst && (
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginLeft: 38, marginBottom: 4 }}>
                                    {other?.username}
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '85%' }}>
                                {!isMine && (
                                    <div style={{ width: 28, flexShrink: 0 }}>
                                        {isLast && (
                                            <img src={otherAvatar}
                                                onClick={() => onNavigateProfile(other?._id)}
                                                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                                                alt="" />
                                        )}
                                    </div>
                                )}
                                
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius,
                                        background: isMine ? 'var(--accent)' : 'var(--dm-theirs)',
                                        color: isMine ? '#fff' : 'var(--text-1)',
                                        fontSize: 14.5, lineHeight: 1.5,
                                        wordBreak: 'break-word',
                                        boxShadow: isMine ? '0 2px 10px var(--accent-ring)' : 'none',
                                        position: 'relative'
                                    }}
                                    className="message-bubble">
                                        {editingMessageId === m._id ? (
                                            <div style={{ minWidth: 200 }}>
                                                <textarea
                                                    autoFocus
                                                    value={editBody}
                                                    onChange={e => setEditBody(e.target.value)}
                                                    rows={Math.min(5, editBody.split('\n').length || 1)}
                                                    style={{
                                                        width: '100%', padding: '10px', borderRadius: 10,
                                                        border: '1px solid var(--border-md)', background: 'var(--input-bg)',
                                                        color: 'var(--text-1)', fontSize: 14, outline: 'none', resize: 'none'
                                                    }}
                                                />
                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                                    <button onClick={cancelEditing} className="btn btn-ghost btn-xs">Cancel</button>
                                                    <button onClick={() => saveEdit(m)} className="btn btn-primary btn-xs" style={{ background: '#fff', color: '#000' }}>Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {m.body && <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>}
                                                
                                                {m.mediaUrl && (
                                                    <div style={{ marginTop: m.body ? 10 : 0 }}>
                                                        {m.mediaUrl.match(/\.(mp4|mov|webm)(\?.*)?$/i) ? (
                                                            <video src={m.mediaUrl} controls style={{ borderRadius: 14, maxWidth: '100%', maxHeight: 350, display: 'block' }} />
                                                        ) : m.mediaUrl.match(/\.(pdf|doc|docx|xls|xlsx|txt|csv|zip)(\?.*)?$/i) ? (
                                                            <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: isMine ? 'rgba(255,255,255,0.15)' : 'var(--hover)', borderRadius: 12, textDecoration: 'none', color: 'inherit', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                                <HiDocument style={{ fontSize: 28, flexShrink: 0 }} />
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Document</div>
                                                                    <div style={{ fontSize: 11, opacity: 0.8 }}>File Attachment</div>
                                                                </div>
                                                                <HiDownload style={{ fontSize: 20 }} />
                                                            </a>
                                                        ) : (
                                                            <img src={m.mediaUrl} style={{ borderRadius: 14, maxWidth: '100%', maxHeight: 400, display: 'block', objectFit: 'contain', background: 'rgba(0,0,0,0.05)' }} alt="Attachment" />
                                                        )}
                                                    </div>
                                                )}
                                                {m.isEdited && <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>(edited)</div>}
                                            </>
                                        )}
                                    </div>
                                    
                                    {isLast && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingInline: 4 }}>
                                            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                                                {timeago(m.createdAt)}
                                            </span>
                                            {isMine && (
                                                <span style={{ fontSize: 11, color: m.isRead ? 'var(--accent)' : 'var(--text-3)', fontWeight: m.isRead ? 700 : 500 }}>
                                                    {m.status === 'sending' ? 'Sending...' : m.status === 'failed' ? 'Failed' : (m.isRead ? 'Seen' : 'Sent')}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {isMine && !editingMessageId && (
                                    <div className="message-actions" style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.2s' }}>
                                        <button onClick={() => startEditing(m)} style={{ color: 'var(--text-3)', padding: 4 }}><HiPencilAlt size={16} /></button>
                                        <button onClick={() => deleteMessage(m)} style={{ color: 'var(--error)', padding: 4 }}><HiTrash size={16} /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
                {peerTyping && <TypingBubble />}
                <div ref={bottomRef} />
            </div>

            {/* Bottom Section */}
            <div style={{ flexShrink: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                {/* Suggestions */}
                {!loadingMessages && suggestions.length > 0 && !peerTyping && !showEmoji && !filePreview && (
                    <div className="no-scrollbar" style={{
                        display: 'flex', gap: 10, padding: '12px 16px', 
                        overflowX: 'auto', background: 'transparent'
                    }}>
                        {suggestions.map((s, i) => (
                            <button key={i} 
                                onClick={() => { setText(s); inputRef.current?.focus(); }}
                                style={{
                                    padding: '8px 16px', borderRadius: 20,
                                    fontSize: 13, fontWeight: 700, color: 'var(--text-1)',
                                    background: 'var(--hover)',
                                    border: '1px solid var(--border-md)', cursor: 'pointer',
                                    whiteSpace: 'nowrap', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-subtle)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.borderColor = 'var(--border-md)'; }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input Area */}
                <div style={{ position: 'relative', padding: '12px 16px' }}>
                    {/* Emoji picker */}
                    {showEmoji && (
                        <div style={{ position: 'absolute', bottom: '100%', left: 16, marginBottom: 12, zIndex: 100 }}>
                            <div className="glass-card" style={{ boxShadow: 'var(--shadow-lg)', borderRadius: 16, overflow: 'hidden' }}>
                                <EmojiPicker
                                    onEmojiClick={insertEmoji}
                                    theme="auto"
                                    height={380}
                                    width={320}
                                />
                            </div>
                        </div>
                    )}

                    {/* File Preview */}
                    {filePreview && (
                        <div className="glass-card" style={{
                            position: 'absolute', bottom: '100%', left: 16, marginBottom: 12,
                            padding: 10, display: 'flex', alignItems: 'center', gap: 12, 
                            borderRadius: 16, minWidth: 260
                        }}>
                            {filePreview.type === 'image' && <img src={filePreview.url} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10 }} alt="" />}
                            {filePreview.type === 'video' && <video src={filePreview.url} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10 }} />}
                            {filePreview.type === 'doc' && <div style={{ width: 64, height: 64, background: 'var(--hover)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}><HiDocument /></div>}

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-1)' }}>{filePreview.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{(filePreview.file.size / 1024 / 1024).toFixed(2)} MB</div>
                            </div>
                            <button onClick={() => setFilePreview(null)} style={{ background: 'var(--hover)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <HiX />
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button type="button" 
                            onClick={() => setShowEmoji(s => !s)}
                            style={{ 
                                fontSize: 28, color: showEmoji ? 'var(--accent)' : 'var(--text-1)', 
                                padding: 4, display: 'flex', cursor: 'pointer' 
                            }}>
                            <HiEmojiHappy />
                        </button>

                        <div style={{
                            flex: 1, display: 'flex', alignItems: 'center',
                            background: 'var(--hover)', border: '1px solid var(--border-md)',
                            borderRadius: 26, padding: '4px 8px 4px 18px', gap: 10
                        }}>
                            <input
                                ref={inputRef}
                                value={text} onChange={handleType}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
                                placeholder="Message..."
                                style={{
                                    flex: 1, background: 'none', border: 'none',
                                    outline: 'none', color: 'var(--text-1)', fontSize: 15, height: 44
                                }}
                            />

                            <div style={{ display: 'flex', gap: 4 }}>
                                <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                                <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost btn-icon-sm" style={{ color: 'var(--text-1)' }}>
                                    <HiPhotograph size={22} />
                                </button>
                                
                                <input ref={docRef} type="file" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip" style={{ display: 'none' }} />
                                <button type="button" onClick={() => docRef.current?.click()} className="btn btn-ghost btn-icon-sm" style={{ color: 'var(--text-1)' }}>
                                    <HiDocument size={22} />
                                </button>
                            </div>
                        </div>

                        {isUploading ? (
                            <div className="spinner-sm" style={{ margin: '0 8px' }} />
                        ) : (
                            <button type="submit" 
                                disabled={!text.trim() && !filePreview}
                                style={{
                                    background: (text.trim() || filePreview) ? 'var(--accent)' : 'transparent',
                                    color: (text.trim() || filePreview) ? '#fff' : 'var(--accent)',
                                    opacity: (text.trim() || filePreview) ? 1 : 0.5,
                                    border: 'none', borderRadius: '50%',
                                    width: 44, height: 44,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    boxShadow: (text.trim() || filePreview) ? 'var(--shadow-accent)' : 'none'
                                }}>
                                <HiPaperAirplane style={{ transform: 'rotate(90deg)', fontSize: 20 }} />
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}
