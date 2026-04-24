export default function MessagesLayout({ children }) {
    return (
        <div className="dm-premium-container">
            <div className="dm-premium-content">
                <div className="dm-list-panel">
                    {children[0]}
                </div>
                <div className="dm-chat-panel">
                    {children[1]}
                </div>
            </div>
        </div>
    )
}
