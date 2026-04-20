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
        <div className="flex justify-center items-center py-20">
            <div className="spinner w-9 h-9" />
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
            <div className="profile-header">

                {/* Avatar */}
                <div className="profile-avatar-col">
                    <div
                        onClick={() => hasStory && setViewerOpen(true)}
                        className={`relative ${hasStory ? 'cursor-pointer' : 'cursor-default'} inline-block`}
                    >
                        {/* Gradient story ring — only shown when user has stories */}
                        {hasStory && (
                            <div className="absolute -inset-[3px] rounded-full bg-gradient-to-tr from-[#6559CA] via-[#E1306C] to-[#FCAF45] animate-[rotateBorder_3s_linear_infinite] p-[2px] z-0" />
                        )}
                        <div className={`${hasStory ? '' : 'profile-avatar-ring'} relative z-10 rounded-full bg-bg ${hasStory ? 'p-[3px]' : ''} inline-block`}>
                            <img
                                src={avatar}
                                alt={profile.username}
                                className={`${hasStory ? 'w-[100px] h-[100px]' : ''} rounded-full object-cover block`}
                            />
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="profile-info-col">

                    {/* Row 1: username + buttons */}
                    <div className="profile-username-row">
                        <h1>{profile.username}</h1>
                        <div className="flex items-center gap-1.5">
                            {profile.isVerified && (
                                <HiBadgeCheck className="text-[18px] text-accent shrink-0" title="Verified" />
                            )}
                        </div>
                        {isMe ? (
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditProfile(true)}>Edit profile</button>
                        ) : (
                            <>
                                <motion.button
                                    className={`btn btn-sm min-w-[100px] ${following ? 'btn-secondary' : 'btn-primary'}`}
                                    onClick={handleFollow}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}>
                                    {following ? 'Following' : 'Follow'}
                                </motion.button>
                                <motion.button
                                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                                    onClick={handleMessage}
                                    disabled={messaging}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}>
                                    {messaging
                                        ? <span className="spinner w-3.5 h-3.5" />
                                        : <><HiChatAlt2 /> Message</>
                                    }
                                </motion.button>
                            </>
                        )}
                    </div>

                    {/* Admin Dashboard Sidebar — Only for admins viewing others */}
                    {me?.role === 'admin' && !isMe && (
                        <div className="admin-profile-dashboard">
                            <p className="font-bold text-[11px] uppercase tracking-wider text-accent mb-3">Admin Governance</p>
                            <div className="l-cluster gap-2">
                                <button className={`btn btn-sm btn-premium ${profile.isVerified ? 'btn-secondary' : 'btn-primary'}`} 
                                    onClick={handleToggleVerify}>
                                    {profile.isVerified ? 'Unverify User' : 'Verify User'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Row 2: stats — Instagram inline style */}
                    <div className="profile-stats">
                        <div className="profile-stat">
                            <span className="profile-stat-num">{posts.length}</span>
                            <span className="profile-stat-label">posts</span>
                        </div>
                        <div className="profile-stat cursor-pointer" onClick={() => setShowFollowers(true)}>
                            <span className="profile-stat-num">{profile.followersCount || 0}</span>
                            <span className="profile-stat-label">followers</span>
                        </div>
                        <div className="profile-stat cursor-pointer" onClick={() => setShowFollowing(true)}>
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
                    <div className="flex justify-center p-14">
                        <div className="spinner w-9 h-9" />
                    </div>
                )

                return (
                    <>
                        <div className="profile-grid">
                            {displayPosts.map((p, i) => (
                                <motion.div
                                    key={p._id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ 
                                        type: "spring", 
                                        stiffness: 300, 
                                        damping: 25,
                                        delay: Math.min(i * 0.03, 0.3) 
                                    }}
                                >
                                    <Link to={`/posts/${p._id}`} className="profile-grid-item m-0 h-full">
                                        {p.mediaType === 'video'
                                            ? <video 
                                                src={p.mediaUrl} 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
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
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <HiHeart /> {p.likesCount || 0}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
