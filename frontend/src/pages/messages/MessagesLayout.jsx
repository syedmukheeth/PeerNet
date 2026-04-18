import React from 'react'

export default function MessagesLayout({ children }) {
    return (
        <div className="dm-premium-container">
            <div className="dm-premium-sidebar-column">
                {/* Reserved for potential 3rd column or info panel in future */}
            </div>
            <div className="dm-premium-content">
                {children}
            </div>
        </div>
    )
}
