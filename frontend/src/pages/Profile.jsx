import { useState, useEffect } from 'react'

import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import api, { CHAT_BASE_URL } from '../api/axios'
import toast from 'react-hot-toast'
import { HiViewGrid, HiFilm, HiBookmark, HiHeart, HiChat, HiBadgeCheck, HiChatAlt2, HiCog, HiPlus } from 'react-icons/hi'
import UserListModal from '../components/UserListModal'
import EditProfileModal from '../components/EditProfileModal'
import { StoryViewer } from '../components/StoryRail'


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

    const handleToggleVerify = async () => {
        try {
            const { data } = await api.patch(`/admin/users/${id}/verify`)
            setProfile(p => ({ ...p, isVerified: data.data.isVerified }))
            toast.success(data.message)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed')
        }
    }


    if (loading) return (
        <div key="profile-skeleton" className="profile-page-wrap animate-pulse">
            <div className="profile-header px-6 md:px-12 py-10 md:py-16">
                <div className="profile-avatar-col">
                    <div className="skeleton skeleton-circle w-[120px] h-[120px] md:w-[150px] md:h-[150px]" />
                </div>
                <div className="profile-info-col">
                    <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                        <div className="skeleton h-10 w-48 rounded-xl" />
                        <div className="flex gap-3">
                            <div className="skeleton h-10 w-28 rounded-xl" />
                            <div className="skeleton h-10 w-28 rounded-xl opacity-50" />
                        </div>
                    </div>
                    <div className="flex gap-10 mb-8">
                        <div className="skeleton h-5 w-20 rounded-md" />
                        <div className="skeleton h-5 w-20 rounded-md" />
                        <div className="skeleton h-5 w-20 rounded-md" />
                    </div>
                    <div className="space-y-4">
                        <div className="skeleton h-6 w-40 rounded-lg" />
                        <div className="skeleton h-4 w-full max-w-sm rounded-md opacity-40" />
                        <div className="skeleton h-4 w-32 rounded-md opacity-30" />
                    </div>
                </div>
            </div>
            <div className="profile-tabs border-t border-white/5 py-4">
                <div className="flex justify-center gap-12">
                    <div className="skeleton h-8 w-24 rounded-lg" />
                    <div className="skeleton h-8 w-24 rounded-lg opacity-40" />
                    <div className="skeleton h-8 w-24 rounded-lg opacity-30" />
                </div>
            </div>
            <div className="profile-grid px-4 md:px-6 mt-8">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="skeleton aspect-square rounded-xl opacity-[0.4]" />
                ))}
            </div>
        </div>
    )
    if (!profile) return (
        <div className="empty-state-wrap">
            <div className="empty-state-icon">🕵️‍♂️</div>
            <h2 className="t-h2">User not found</h2>
        </div>
    )

    const avatar = profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.username}&size=200&background=6366F1&color=fff`

    return (
        <div className="profile-page-wrap fade-in">
            {/* ── Header ── */}
            <header className="profile-header-v2">
                <div className="profile-avatar-wrap">
                    <div className={`avatar-ring ${hasStory ? 'has-stories' : ''}`} onClick={() => hasStory && setViewerOpen(true)}>
                        <img 
                            src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.username}&background=6366F1&color=fff`} 
                            className="profile-avatar-img" 
                            alt={profile.username} 
                        />
                    </div>
                </div>

                <div className="profile-info-col">

                {/* Desktop/Tablet Header Structure */}
                <div className="profile-info-main">
                    {/* Row 1: Username + Actions */}
                    <div className="profile-header-top">
                        <div className="flex items-center gap-2">
                            <h1 className="profile-username">{profile.username}</h1>
                            {profile.isVerified && <HiBadgeCheck className="text-accent text-[20px]" />}
                        </div>
                        <div className="profile-actions-row">
                            {isMe ? (
                                <>
                                    <button className="btn btn-secondary btn-sm px-5" onClick={() => setEditProfile(true)}>
                                        Edit Profile
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/settings')}>
                                        <HiCog size={18} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <motion.button
                                        className={`btn btn-sm min-w-[100px] ${following ? 'btn-secondary' : 'btn-primary'}`}
                                        onClick={handleFollow}
                                        whileTap={{ scale: 0.95 }}>
                                        {following ? 'Following' : 'Follow'}
                                    </motion.button>
                                    <motion.button
                                        className="btn btn-secondary btn-sm px-4 flex items-center gap-2"
                                        onClick={handleMessage}
                                        disabled={messaging}
                                        whileTap={{ scale: 0.95 }}>
                                        {messaging ? <span className="spinner-sm" /> : 'Message'}
                                    </motion.button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Stats */}
                    <div className="profile-stats-v2">
                        <div className="profile-stat-item">
                            <span className="stat-value">{posts.length}</span>
                            <span className="stat-label">posts</span>
                        </div>
                        <div className="profile-stat-item cursor-pointer" onClick={() => setShowFollowers(true)}>
                            <span className="stat-value">{profile.followersCount || 0}</span>
                            <span className="stat-label">followers</span>
                        </div>
                        <div className="profile-stat-item cursor-pointer" onClick={() => setShowFollowing(true)}>
                            <span className="stat-value">{profile.followingCount || 0}</span>
                            <span className="stat-label">following</span>
                        </div>
                    </div>

                    {/* Row 3: Bio */}
                    <div className="profile-bio-v2">
                        <div className="font-bold text-[15px]">{profile.fullName}</div>
                        <div className="text-[14px] leading-relaxed whitespace-pre-wrap mt-1">{profile.bio}</div>
                        {profile.website && (
                            <a href={profile.website} target="_blank" rel="noreferrer" className="profile-link-v2">
                                <HiPlus size={12} className="rotate-45" />
                                {profile.website.replace(/^https?:\/\//, '')}
                            </a>
                        )}
                    </div>
                    </div>
                </div>
            </header>

            {/* ── Tabs ── */}
            <div className="profile-tabs">
                {[
                    { key: 'posts', icon: <HiViewGrid />, label: 'Posts' },
                    { key: 'shorts', icon: <HiFilm />, label: 'Shorts' },
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
                    displayPosts = posts // Show all posts including videos in main grid
                } else if (tab === 'shorts') {
                    displayPosts = posts.filter(p => p.mediaType === 'video')
                    emptyIcon = '🎬'
                    emptyTitle = 'No Shorts yet'
                    emptyDesc = isMe ? 'Share your first video' : ''
                } else if (tab === 'saved') {
                    displayPosts = savedPosts
                    isLoading = savedLoading
                    emptyIcon = '🔖'
                    emptyTitle = isMe ? 'Nothing saved yet' : 'Private'
                    emptyDesc = isMe ? 'Save posts to view them here' : ''
                }

                if (isLoading) return (
                    <div key="saved-posts-skeleton" className="profile-grid">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="skeleton aspect-square" />
                        ))}
                    </div>
                )

                return (
                    <>
                        <div className="profile-grid">
                            {displayPosts.map((p, i) => (
                                <motion.div
                                    key={p._id}
                                    className="profile-grid-item"
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ 
                                        duration: 0.3,
                                        delay: Math.min(i * 0.03, 0.3) 
                                    }}
                                >
                                    <Link to={`/posts/${p._id}`} className="w-full h-full block relative">
                                        {p.mediaType === 'video'
                                            ? <video 
                                                src={p.mediaUrl} 
                                                className="w-full h-full object-cover"
                                                muted 
                                                playsInline
                                            />
                                            : <img 
                                                src={p.mediaUrl} 
                                                alt="" 
                                                loading="lazy" 
                                                className="w-full h-full object-cover"
                                            />
                                        }
                                        <div className="profile-grid-overlay">
                                            <span className="flex items-center gap-2">
                                                <HiHeart /> {p.likesCount || 0}
                                            </span>
                                            <span className="flex items-center gap-2">
                                                <HiChat /> {p.commentsCount || 0}
                                            </span>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                        {displayPosts.length === 0 && (
                            <div className="empty-state-wrap pb-20">
                                <div className="empty-state-icon">{emptyIcon}</div>
                                <h2 className="t-h2">{emptyTitle}</h2>
                                {emptyDesc && <p className="t-body text-muted max-w-[280px] mx-auto">{emptyDesc}</p>}
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
