import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import api, { CHAT_BASE_URL } from '../api/axios'
import toast from 'react-hot-toast'
import { HiViewGrid, HiFilm, HiBookmark, HiHeart, HiChat, HiBadgeCheck, HiChatAlt2 } from 'react-icons/hi'
import UserListModal from '../components/UserListModal'
import EditProfileModal from '../components/EditProfileModal'

function useCountUp(target, duration = 800) {
    const [count, setCount] = useState(0)
    useEffect(() => {
        if (!target) return
        const step = Math.ceil(target / (duration / 16))
        let current = 0
        const timer = setInterval(() => {
            current = Math.min(current + step, target)
            setCount(current)
            if (current >= target) clearInterval(timer)
        }, 16)
        return () => clearInterval(timer)
    }, [target, duration])
    return count
}

function StatItem({ value, label, onClick }) {
    const count = useCountUp(value)
    const fmt = (n) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n
    return (
        <div className="profile-stat" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
            <div className="profile-stat-num">{fmt(count)}</div>
            <div className="profile-stat-label">{label}</div>
        </div>
    )
}

export default function Profile() {
    const { id } = useParams()
    const { user: me } = useAuth()
    const navigate = useNavigate()
    const [profile, setProfile] = useState(null)
    const [posts, setPosts] = useState([])
    const [savedPosts, setSavedPosts] = useState([])
    const [savedLoading, setSavedLoading] = useState(false)
    const [tab, setTab] = useState('posts')
    const [loading, setLoading] = useState(true)
    const [following, setFollowing] = useState(false)
    const [messaging, setMessaging] = useState(false)
    const [showFollowers, setShowFollowers] = useState(false)
    const [showFollowing, setShowFollowing] = useState(false)
    const [editProfile, setEditProfile] = useState(false)

    const isMe = me?._id === id

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true)
            try {
                const [{ data: pd }, { data: postsD }] = await Promise.all([
                    api.get(`/users/${id}`),
                    api.get(`/users/${id}/posts`),
                ])
                setProfile(pd.data)
                setFollowing(pd.data.isFollowing)
                setPosts(postsD.data || [])
            } catch { toast.error('User not found') }
            finally { setLoading(false) }
        }
        fetchAll()
    }, [id])

    // Fetch saved posts only when Saved tab is opened (and only for own profile)
    useEffect(() => {
        if (tab !== 'saved' || !isMe) return
        setSavedLoading(true)
        api.get('/posts/saved')
            .then(({ data }) => setSavedPosts(data.data || []))
            .catch(() => setSavedPosts([]))
            .finally(() => setSavedLoading(false))
    }, [tab, isMe])

    const handleFollow = async () => {
        const was = following
        setFollowing(!was)
        setProfile(p => ({ ...p, followersCount: p.followersCount + (was ? -1 : 1) }))
        try {
            if (was) await api.delete(`/users/${id}/follow`)
            else await api.post(`/users/${id}/follow`)
        } catch {
            setFollowing(was)
            setProfile(p => ({ ...p, followersCount: p.followersCount + (was ? 1 : -1) }))
        }
    }

    // Start or open a conversation with this user
    const handleMessage = async () => {
        setMessaging(true)
        try {
            const { data } = await api.post(`${CHAT_BASE_URL}/conversations`, { targetUserId: id })
            navigate(`/messages/${data.data._id}`)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not open chat')
        } finally {
            setMessaging(false)
        }
    }

    if (loading) return (
        <div className="flex justify-center items-center" style={{ padding: '80px 0' }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
    )
    if (!profile) return (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 60 }}>User not found</p>
    )

    const avatar = profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.username}&size=200&background=6366F1&color=fff`

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="profile-header">
                {/* Avatar with gradient ring */}
                <div style={{ position: 'relative', width: 'fit-content' }}>
                    <div style={{
                        position: 'absolute', inset: -4, borderRadius: '50%',
                        background: 'var(--gradient-story)', padding: 3,
                        opacity: profile.isVerified ? 1 : 0.6,
                    }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-primary)' }} />
                    </div>
                    <img src={avatar} className="avatar avatar-2xl"
                        alt={profile.username}
                        style={{ position: 'relative', zIndex: 1 }} />
                </div>

                <div>
                    {/* Username + verified + buttons */}
                    <div className="flex items-center gap-3" style={{ flexWrap: 'wrap', marginBottom: 4 }}>
                        <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne','Inter',sans-serif" }}>
                            {profile.username}
                        </h1>
                        {profile.isVerified && (
                            <HiBadgeCheck style={{ fontSize: 20, color: 'var(--accent)', filter: 'drop-shadow(0 0 6px var(--accent-glow))' }} />
                        )}
                        {isMe ? (
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditProfile(true)}>Edit profile</button>
                        ) : (
                            <>
                                <motion.button
                                    className={`btn btn-sm ${following ? 'btn-secondary' : 'btn-primary'}`}
                                    onClick={handleFollow}
                                    style={{ minWidth: 100 }}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}>
                                    {following ? '✓ Following' : '+ Follow'}
                                </motion.button>
                                <motion.button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleMessage}
                                    disabled={messaging}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}>
                                    {messaging
                                        ? <span className="spinner" style={{ width: 14, height: 14 }} />
                                        : <><HiChatAlt2 /> Message</>
                                    }
                                </motion.button>
                            </>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="profile-stats">
                        <StatItem value={posts.length} label="posts" />
                        <StatItem value={profile.followersCount || 0} label="followers" onClick={() => setShowFollowers(true)} />
                        <StatItem value={profile.followingCount || 0} label="following" onClick={() => setShowFollowing(true)} />
                    </div>

                    {profile.fullName && (
                        <p style={{ marginTop: 14, fontSize: 15, fontWeight: 600 }}>{profile.fullName}</p>
                    )}
                    {profile.bio && (
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.6 }}>
                            {profile.bio}
                        </p>
                    )}
                    {profile.website && (
                        <a href={profile.website} target="_blank" rel="noreferrer"
                            style={{ fontSize: 14, color: 'var(--accent)', marginTop: 6, display: 'block', fontWeight: 500 }}>
                            {profile.website}
                        </a>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="profile-tabs">
                {[
                    { key: 'posts', icon: <HiViewGrid />, label: 'Posts' },
                    { key: 'dscrolls', icon: <HiFilm />, label: 'Dscrolls' },
                    { key: 'saved', icon: <HiBookmark />, label: 'Saved' },
                ].map(({ key, icon, label }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`profile-tab-btn ${tab === key ? 'active' : ''}`}>
                        {icon}
                        <span style={{ fontSize: 12, marginLeft: 5 }}>{label}</span>
                    </button>
                ))}
            </div>

            {/* Post Grid */}
            {(() => {
                // Determine which list to display
                let displayPosts = []
                let emptyIcon = '📷'
                let emptyTitle = 'No posts yet'
                let emptyDesc = isMe ? 'Share your first photo or video' : ''
                let isLoading = false

                if (tab === 'posts') {
                    displayPosts = posts.filter(p => p.mediaType !== 'video')
                    emptyTitle = 'No posts yet'
                } else if (tab === 'dscrolls') {
                    displayPosts = posts.filter(p => p.mediaType === 'video')
                    emptyIcon = '🎬'
                    emptyTitle = 'No Dscrolls yet'
                    emptyDesc = isMe ? 'Share your first video' : ''
                } else if (tab === 'saved') {
                    displayPosts = savedPosts
                    isLoading = savedLoading
                    emptyIcon = '🔖'
                    emptyTitle = isMe ? 'Nothing saved yet' : 'Private'
                    emptyDesc = isMe ? 'Save posts to view them here' : ''
                }

                if (isLoading) return (
                    <div className="flex justify-center" style={{ padding: 60 }}>
                        <div className="spinner" style={{ width: 36, height: 36 }} />
                    </div>
                )

                return (
                    <>
                        <div className="profile-grid">
                            {displayPosts.map((p, i) => (
                                <Link key={p._id} to={`/posts/${p._id}`} className="profile-grid-item"
                                    style={{ animationDelay: `${i * 40}ms` }}>
                                    {p.mediaType === 'video'
                                        ? <video src={p.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                        : <img src={p.mediaUrl} alt="" loading="lazy" />
                                    }
                                    <div className="profile-grid-overlay">
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <HiHeart /> {p.likesCount || 0}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <HiChat /> {p.commentsCount || 0}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {displayPosts.length === 0 && (
                            <div className="empty-state" style={{ paddingTop: 60 }}>
                                <div className="empty-state-icon" style={{ animation: 'float 3s ease-in-out infinite' }}>{emptyIcon}</div>
                                <p className="empty-state-title">{emptyTitle}</p>
                                {emptyDesc && <p className="empty-state-desc">{emptyDesc}</p>}
                            </div>
                        )}
                    </>
                )
            })()}

            <UserListModal
                isOpen={showFollowers}
                onClose={() => setShowFollowers(false)}
                title="Followers"
                userId={profile._id}
                type="followers"
            />
            <UserListModal
                isOpen={showFollowing}
                onClose={() => setShowFollowing(false)}
                title="Following"
                userId={profile._id}
                type="following"
            />
            {editProfile && (
                <EditProfileModal
                    profile={profile}
                    onClose={() => setEditProfile(false)}
                    onSave={(updated) => {
                        setProfile(p => ({ ...p, ...updated }))
                        setEditProfile(false)
                    }}
                />
            )}
        </div>
    )
}
