import { HiOutlineChatAlt2 } from 'react-icons/hi'

export default function EmptyState({ onNewMessage }) {
    return (
        <div className="dm-empty-state">
            <div className="dm-empty-state-content">
                <div className="dm-empty-icon-ring">
                    <HiOutlineChatAlt2 className="dm-empty-icon-main" />
                </div>
                <h2 className="dm-empty-title">Your Messages</h2>
                <p className="dm-empty-text">
                    Send private photos and messages to a friend or group.
                </p>
                <button className="btn btn-primary dm-empty-cta" onClick={onNewMessage}>
                    Send Message
                </button>
            </div>
        </div>
    )
}
