import { HiDotsVertical } from 'react-icons/hi'

export default function MessageBubble({ 
    message, 
    isSelf, 
    peer,
    onDelete, 
    onEdit, 
    timeago,
    showActions = true 
}) {
    const isFailed = message.status === 'failed'
    const isSending = message.status === 'sending'

    return (
        <div className={`dm-message-row ${isSelf ? 'self' : 'peer'}`}>
            {!isSelf && (
                <img 
                    src={peer?.avatarUrl || `https://ui-avatars.com/api/?name=${peer?.username}&background=6366F1&color=fff`} 
                    alt={peer?.username || 'Peer'} 
                    className="dm-bubble-avatar" 
                />
            )}
            
            <div className="dm-message-container">
                <div className={`dm-bubble ${isSelf ? 'dm-bubble-primary' : 'dm-bubble-secondary'}`}>
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
                </div>

                <div className="dm-message-meta">
                    <span className="dm-message-time">
                        {isSending ? 'Sending...' : isFailed ? 'Failed' : timeago(message.createdAt)}
                    </span>
                    {isSelf && showActions && !isSending && !isFailed && (
                        <div className="dm-message-actions-dropdown">
                            <button className="dm-msg-action-btn"><HiDotsVertical size={14}/></button>
                            <div className="dm-msg-menu">
                                <button onClick={() => onEdit(message)}>Edit</button>
                                <button className="text-error" onClick={() => onDelete(message)}>Delete</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
