import { HiChevronLeft, HiBadgeCheck } from 'react-icons/hi'
import { motion } from 'framer-motion'

export default function ChatHeader({ participant, isOnline, onBack, onNavigateProfile }) {
    if (!participant) return null

    const avatar = participant.avatarUrl || `https://ui-avatars.com/api/?name=${participant.username}&background=6366F1&color=fff`

    return (
        <header className="dm-chat-header-revamped">
            <div className="dm-header-left">
                <motion.button 
                    className="dm-back-btn" 
                    onClick={onBack}
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <HiChevronLeft size={24} />
                </motion.button>
                
                <div className="dm-header-user" onClick={() => onNavigateProfile(participant._id)}>
                    <div className="dm-avatar-wrap-sm">
                        <img src={avatar} className="dm-avatar-sm" alt="" />
                        {isOnline && <span className="dm-online-indicator-sm" />}
                    </div>
                    <div className="dm-user-meta">
                        <div className="dm-user-name">
                            {participant.username}
                            {participant.isVerified && <HiBadgeCheck className="text-accent" style={{ marginLeft: 4 }} />}
                        </div>
                        <span className={`dm-user-status ${isOnline ? 'online' : ''}`}>
                            {isOnline ? 'Active now' : 'Offline'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="dm-header-actions">
                {/* redundant buttons removed for cleaner UX */}
            </div>
        </header>
    )
}
