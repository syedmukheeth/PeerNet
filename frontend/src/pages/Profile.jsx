import { useState, useEffect } from 'react'

import { useParams, useNavigate, Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import api, { CHAT_BASE_URL } from '../api/axios'
import toast from 'react-hot-toast'
import { HiViewGrid, HiFilm, HiBookmark, HiHeart, HiChatAlt2, HiBadgeCheck, HiCog, HiLink, HiUser } from 'react-icons/hi'
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

    const isMe = me?._id === id || id === 'me'

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
            const { data } = await api.post(``, { targetUserId: id }, { baseURL: CHAT_BASE_URL })
            navigate(`/messages/${data.data._id}`)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not open chat')
        } finally {
            setMessaging(false)
        }
    }

    if (loading) return (
        <div key="profile-skeleton" className="profile-page-wrap">
            <header className="profile-header-v2">
                <div className="profile-avatar-wrap">
                    <div className="skeleton w-[80px] h-[80px] md:w-[150px] md:h-[150px] rounded-full" />
                </div>
                <div className="profile-info-col">
                    <div className="profile-info-main">
                        <div className="profile-header-top">
                            <div className="skeleton h-8 w-40 md:w-64 rounded-xl" />
                        </div>
                        <div className="profile-stats-v2 mt-6 hidden md:flex">
                            <div className="skeleton h-5 w-20 rounded-md" />
                            <div className="skeleton h-5 w-20 rounded-md" />
                            <div className="skeleton h-5 w-20 rounded-md" />
                        </div>
                        <div className="profile-bio-v2 mt-6 space-y-3">
                            <div className="skeleton h-5 w-32 rounded-lg" />
                            <div className="skeleton h-4 w-full max-w-[300px] rounded-md opacity-60" />
                            <div className="skeleton h-4 w-24 rounded-md opacity-40" />
                        </div>
                    </div>
                </div>
            </header>

            <div className="profile-tabs border-t border-white/5 py-4 mt-8">
                <div className="flex justify-center gap-12">
                    <div className="skeleton h-8 w-24 rounded-lg opacity-40" />
                    <div className="skeleton h-8 w-24 rounded-lg opacity-20" />
                    <div className="skeleton h-8 w-24 rounded-lg opacity-20" />
                </div>
            </div>

            <div className="profile-grid px-0 mt-2">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="skeleton aspect-square rounded-none" />
                ))}
            </div>
        </div>
    )
    if (!profile) return (
        <div className="empty-state-wrap">
            <div className="empty-state-icon"><HiUser /></div>
            <h2 className="t-h2">User not found</h2>
            <p className="text-muted mt-2">This account may have been removed.</p>
        </div>
    )

    return (
        <div className="profile-page-wrap">
            {/* ── Header ── */}
            <header className="profile-header-v2">
                <div className="profile-avatar-wrap">
                    <div className={`avatar-ring ${hasStory ? 'has-stories' : ''} cursor-pointer group`} onClick={() => hasStory && setViewerOpen(true)}>
                        <img 
                            src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.username}&background=6366F1&color=fff`} 
                            className="profile-avatar-img transition-transform group-hover:scale-105" 
                            alt={profile.username} 
                        />
                    </div>
                </div>

                <div className="profile-info-col">
                    <div className="profile-info-main">
                        <div className="profile-header-top">
                            <div className="profile-username-group flex items-center gap-2">
                                <h1 className="profile-username font-light">@{profile.username}</h1>
                                {profile.isVerified && <HiBadgeCheck className="text-accent text-[20px]" />}
                            </div>
                            <div className="profile-actions-row">
                                {isMe ? (
                                    <>
                                        <button className="btn btn-secondary btn-sm flex-1 h-9 rounded-lg font-semibold" onClick={() => setEditProfile(true)}>
                                            Edit Profile
                                        </button>
                                        <button className="btn btn-secondary btn-sm p-2 rounded-lg" onClick={() => navigate('/settings')}>
                                            <HiCog size={20} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <motion.button
                                            className={`btn btn-sm flex-1 h-9 rounded-lg font-bold ${following ? 'following-btn' : 'btn-primary'}`}
                                            onClick={handleFollow}
                                            whileTap={{ scale: 0.96 }}>
                                            {following ? 'Following' : 'Follow'}
                                        </motion.button>
                                        <motion.button
                                            className="btn btn-secondary btn-sm flex-1 h-9 rounded-lg font-bold flex items-center justify-center gap-2"
                                            onClick={handleMessage}
                                            disabled={messaging}
                                            whileTap={{ scale: 0.96 }}>
                                            {messaging ? <span className="spinner-sm" /> : 'Message'}
                                        </motion.button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="profile-stats-v2">
                            <div className="profile-stat-item">
                                <span className="stat-value">{profile.postsCount ?? posts.length}</span>
                                <span className="stat-label">posts</span>
                            </div>
                            <div className="profile-stat-item cursor-pointer group" onClick={() => setShowFollowers(true)}>
                                <span className="stat-value group-hover:text-accent transition-colors">{profile.followersCount || 0}</span>
                                <span className="stat-label">followers</span>
                            </div>
                            <div className="profile-stat-item cursor-pointer group" onClick={() => setShowFollowing(true)}>
                                <span className="stat-value group-hover:text-accent transition-colors">{profile.followingCount || 0}</span>
                                <span className="stat-label">following</span>
                            </div>
                        </div>

                        <div className="profile-bio-v2">
                            <div className="font-bold text-[15px] text-text-1">{profile.fullName}</div>
                            <div className="text-[14px] leading-relaxed whitespace-pre-wrap mt-1 text-text-2">{profile.bio}</div>
                            {profile.website && (
                                <a href={profile.website} target="_blank" rel="noreferrer" className="profile-link-v2 mt-2 inline-flex items-center gap-1 text-accent font-medium hover:underline">
                                    <HiLink size={14} />
                                    {profile.website.replace(/^https?:\/\//, '')}
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Tabs ── */}
            <div className="profile-tabs border-t border-white/5 mt-10">
                {[
                    { key: 'posts', icon: <HiViewGrid />, label: 'POSTS' },
                    { key: 'shorts', icon: <HiFilm />, label: 'SHORTS' },
                    ...(isMe ? [{ key: 'saved', icon: <HiBookmark />, label: 'SAVED' }] : []),
                ].map(({ key, icon, label }) => (
                    <button key={key} 
                        onClick={() => {
                            setTab(key)
                            if (key === 'saved' && savedPosts.length === 0) setSavedLoading(true)
                        }}
                        className={`profile-tab-btn ${tab === key ? 'active' : ''}`}>
                        <span className="flex items-center gap-2">
                            {icon}
                            <span className="text-[12px] tracking-widest font-semibold">{label}</span>
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Grid Content ── */}
            <div className="profile-content-min-h min-h-[400px] mt-1">
                {(() => {
                    let displayPosts = []
                    let emptyIcon = <HiViewGrid />
                    let emptyTitle = 'No posts yet'
                    let emptyDesc = isMe ? 'When you share photos, they will appear here.' : ''
                    let gridLoading = false

                    if (tab === 'posts') {
                        displayPosts = posts
                    } else if (tab === 'shorts') {
                        displayPosts = posts.filter(p => p.mediaType === 'video')
                        emptyIcon = <HiFilm />
                        emptyTitle = 'No Shorts yet'
                    } else if (tab === 'saved') {
                        displayPosts = savedPosts
                        gridLoading = savedLoading
                        emptyIcon = <HiBookmark />
                        emptyTitle = 'Saved'
                        emptyDesc = isMe ? 'Only you can see what you\'ve saved.' : 'Private'
                    }

                    if (gridLoading) return (
                        <div className="profile-grid px-0">
                            {[...Array(9)].map((_, i) => (
                                <div key={`skel-${i}`} className="skeleton aspect-square rounded-none" />
                            ))}
                        </div>
                    )

                    if (displayPosts.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-16 h-16 rounded-full border border-text-1 flex items-center justify-center text-3xl mb-4 opacity-50">
                                {emptyIcon}
                            </div>
                            <h2 className="text-3xl font-light text-text-1">{emptyTitle}</h2>
                            <p className="text-text-2 mt-2 max-w-[300px]">{emptyDesc}</p>
                        </div>
                    )

                    return (
                        <div className="profile-grid px-0">
                            {displayPosts.map((p) => (
                                <Link 
                                    key={p._id} 
                                    to={`/posts/${p._id}`} 
                                    className="profile-grid-item block relative group"
                                >
                                    {p.mediaType === 'video' ? (
                                        <video 
                                            src={p.mediaUrl} 
                                            className="w-full h-full object-cover"
                                            muted 
                                            playsInline
                                        />
                                    ) : (
                                        <img 
                                            src={p.mediaUrl} 
                                            alt="" 
                                            loading="lazy" 
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-8 text-white font-bold">
                                        <span className="flex items-center gap-2"><HiHeart className="text-2xl" /> {p.likesCount || 0}</span>
                                        <span className="flex items-center gap-2"><HiChatAlt2 className="text-2xl" /> {p.commentsCount || 0}</span>
                                    </div>
                                    {p.mediaType === 'video' && (
                                        <div className="absolute top-3 right-3 text-white text-xl drop-shadow-md">
                                            <HiFilm />
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )
                })()}
            </div>

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

            {/* Story viewer, only shown when profile has active stories */}
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
