import { HiChatAlt2 } from 'react-icons/hi'

export default function EmptyState({ onNewMessage }) {
    return (
        <div className="dm-empty-state">
            <div className="dm-empty-state-content animate-fade-in">
                <div className="dm-empty-illustration">
                    <div className="dm-empty-circle-large" />
                    <div className="dm-empty-circle-medium" />
                    <div className="dm-empty-icon-ring">
                        <HiChatAlt2 className="dm-empty-icon-main" />
                    </div>
                </div>
                <h2 className="dm-empty-title">Your Messages</h2>
                <p className="dm-empty-text">
                    Send private photos and messages to a peer. Start a conversation to collaborate on your next project.
                </p>
                <button className="dm-empty-cta" onClick={onNewMessage}>
                    Send Message
                </button>
            </div>
        </div>
    )
}
