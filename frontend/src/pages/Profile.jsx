import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import api, { CHAT_BASE_URL } from '../api/axios'
import toast from 'react-hot-toast'
import { HiViewGrid, HiFilm, HiBookmark, HiHeart, HiChat, HiBadgeCheck, HiChatAlt2 } from 'react-icons/hi'
import UserListModal from '../components/UserListModal'
import EditProfileModal from '../components/EditProfileModal'
import { StoryViewer } from '../components/StoryRail'

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
    const [hasStory, setHasStory] = useState(false)
    const [storyGroupData, setStoryGroupData] = useState(null)
    const [viewerOpen, setViewerOpen] = useState(false)

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

    // Check if this profile user has active stories
    useEffect(() => {
        api.get('/stories').then(({ data }) => {
            const allStories = data.data || []
            // Find stories authored by the profile user
            const userStories = allStories.filter(s => s.author?._id === id || s.author === id)
            setHasStory(userStories.length > 0)
            if (userStories.length > 0) {
                // Build a group object that StoryViewer can use
                const author = userStories[0].author
                setStoryGroupData({ author: typeof author === 'object' ? author : { _id: id, username: profile?.username, avatarUrl: profile?.avatarUrl }, stories: userStories })
            }
        }).catch(() => { })
    }, [id]) // eslint-disable-line

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
            const { data } = await api.post(`conversations`, { targetUserId: id }, { baseURL: CHAT_BASE_URL })
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
        <div className="profile-page-wrap fade-in">
            {/* ── Header ── */}
            <div className="profile-header">

                {/* Avatar */}
                <div className="profile-avatar-col">
                    <div
                        onClick={() => hasStory && setViewerOpen(true)}
                        style={{
                            position: 'relative',
                            cursor: hasStory ? 'pointer' : 'default',
                            display: 'inline-block',
                        }}
                    >
                        {/* Gradient story ring — only shown when user has stories */}
                        {hasStory && (
                            <div style={{
                                position: 'absolute',
                                inset: -3,
                                borderRadius: '50%',
                                background: 'linear-gradient(215deg, #6559CA 0%, #C13584 25%, #E1306C 50%, #F77737 75%, #FCAF45 100%)',
                                animation: 'rotateBorder 3s linear infinite',
                                padding: 2,
                                zIndex: 0,
                            }} />
                        )}
                        <div className={hasStory ? '' : 'profile-avatar-ring'} style={{
                            position: 'relative',
                            zIndex: 1,
                            borderRadius: '50%',
                            background: 'var(--bg)',
                            padding: hasStory ? 3 : 0,
                            display: 'inline-block',
                        }}>
                            <img
                                src={avatar}
                                alt={profile.username}
                                style={{
                                    width: hasStory ? 100 : undefined,
                                    height: hasStory ? 100 : undefined,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="profile-info-col">

                    {/* Row 1: username + buttons */}
                    <div className="profile-username-row">
                        <h1>{profile.username}</h1>
                        {profile.isVerified && (
                            <HiBadgeCheck style={{ fontSize: 18, color: 'var(--accent)', flexShrink: 0 }} />
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
                                    {following ? 'Following' : 'Follow'}
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

                    {/* Row 2: stats — Instagram inline style */}
                    <div className="profile-stats">
                        <div className="profile-stat">
                            <span className="profile-stat-num">{posts.length}</span>
                            <span className="profile-stat-label">posts</span>
                        </div>
                        <div className="profile-stat" onClick={() => setShowFollowers(true)} style={{ cursor: 'pointer' }}>
                            <span className="profile-stat-num">{profile.followersCount || 0}</span>
                            <span className="profile-stat-label">followers</span>
                        </div>
                        <div className="profile-stat" onClick={() => setShowFollowing(true)} style={{ cursor: 'pointer' }}>
                            <span className="profile-stat-num">{profile.followingCount || 0}</span>
                            <span className="profile-stat-label">following</span>
                        </div>
                    </div>

                    {/* Row 3: name + bio + website */}
                    <div className="profile-bio-row">
                        {profile.fullName && <p className="profile-full-name">{profile.fullName}</p>}
                        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
                        {profile.website && (
                            <a href={profile.website} target="_blank" rel="noreferrer" className="profile-website">
                                {profile.website}
                            </a>
                        )}
                    </div>

                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="profile-tabs">
                {[
                    { key: 'posts', icon: <HiViewGrid />, label: 'Posts' },
                    { key: 'dscrolls', icon: <HiFilm />, label: 'Dscrolls' },
                    ...(isMe ? [{ key: 'saved', icon: <HiBookmark />, label: 'Saved' }] : []),
                ].map(({ key, icon, label }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`profile-tab-btn ${tab === key ? 'active' : ''}`}>
                        {icon}
                        <span>{label}</span>
                    </button>
                ))}
            </div>

            {/* ── Grid ── */}
            {(() => {
                let displayPosts = []
                let emptyIcon = '📷'
                let emptyTitle = 'No posts yet'
                let emptyDesc = isMe ? 'Share your first photo or video' : ''
                let isLoading = false

                if (tab === 'posts') {
                    displayPosts = posts.filter(p => p.mediaType !== 'video')
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
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <HiHeart /> {p.likesCount || 0}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <HiChat /> {p.commentsCount || 0}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {displayPosts.length === 0 && (
                            <div className="empty-state" style={{ paddingTop: 60 }}>
                                <div className="empty-state-icon">{emptyIcon}</div>
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

            {/* Story viewer — only shown when profile has active stories */}
            <AnimatePresence>
                {viewerOpen && storyGroupData && (
                    <StoryViewer
                        groups={[storyGroupData]}
                        startGroupIdx={0}
                        onClose={() => setViewerOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
