import { HiChevronLeft, HiPhone, HiVideoCamera, HiInformationCircle, HiBadgeCheck } from 'react-icons/hi'

export default function ChatHeader({ participant, isOnline, onBack, onNavigateProfile }) {
    if (!participant) return null

    const avatar = participant.avatarUrl || `https://ui-avatars.com/api/?name=${participant.username}&background=6366F1&color=fff`

    return (
        <header className="dm-chat-header">
            <div className="dm-header-left">
                <button className="dm-back-btn" onClick={onBack}>
                    <HiChevronLeft />
                </button>
                <div className="dm-header-user" onClick={() => onNavigateProfile(participant._id)}>
                    <div className="dm-avatar-wrap-sm">
                        <img src={avatar} className="dm-avatar-sm" alt="" />
                        {isOnline && <span className="dm-online-indicator-sm" />}
                    </div>
                    <div className="dm-user-meta">
                        <div className="dm-user-name">
                            {participant.username}
                            {participant.isVerified && <HiBadgeCheck className="dm-verified-icon" />}
                        </div>
                        <span className="dm-user-status">
                            {isOnline ? 'Active now' : 'Offline'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="dm-header-actions">
                <button className="dm-action-icon"><HiPhone /></button>
                <button className="dm-action-icon"><HiVideoCamera /></button>
                <button className="dm-action-icon"><HiInformationCircle /></button>
            </div>
        </header>
    )
}
