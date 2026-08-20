import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import api from '../../api/axios'
import { optimizeAvatarUrl } from '../../utils/cloudinary'
import { useAuth } from '../../context/AuthContext'
import { HiBadgeCheck, FaLinkedin } from '../ui/icons'
import avatarFallback from '../ui/avatarFallback'

/*
 * The feed's right rail: the viewer's own profile card, "Suggested for you",
 * and the site footer links.
 *
 * This lived as a second component declared inside pages/Feed.jsx, above the
 * page component itself. That is why the rail existed only on the feed route:
 * nothing else could import it. It is shell furniture, so it belongs next to
 * DesktopSidebar and SiteFooter rather than inside a page.
 */
export default function RightPanel() {
    const { user } = useAuth()
    const [suggestions, setSuggestions] = useState([])
    const [followed, setFollowed] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) {
            setLoading(false)
            return
        }

        // Aborted on unmount: this panel used to call setSuggestions and
        // setLoading after the user navigated away.
        const controller = new AbortController()

        setLoading(true)
        api.get('/users/suggestions', { params: { limit: 5 }, signal: controller.signal })
            .then(({ data }) => setSuggestions(data.data || []))
            .catch(() => { if (!controller.signal.aborted) setSuggestions([]) })
            .finally(() => { if (!controller.signal.aborted) setLoading(false) })

        return () => controller.abort()
    }, [user])

    const handleFollow = async (u) => {
        setFollowed(f => ({ ...f, [u._id]: !f[u._id] }))
        try { await api.post(`/users/${u._id}/follow`) }
        catch { setFollowed(f => ({ ...f, [u._id]: !f[u._id] })) }
    }

    const myAvatar = optimizeAvatarUrl(user?.avatarUrl ||
        avatarFallback(user?.username))

    return (
        <div className="sp-container">

            {/* ── Current User Card ───────────── */}
            {/* The avatar and username were click-handled divs and images:
                not focusable, not keyboard-activatable, and announced as plain
                content. They navigate, so they are links. */}
            <div className="sp-user-card">
                <Link to={`/profile/${user?._id}`} aria-label={`Your profile, ${user?.username || ''}`}>
                    <img src={myAvatar} className="sp-user-avatar" alt="" />
                </Link>
                <div className="sp-user-info">
                    <Link to={`/profile/${user?._id}`} className="sp-username">
                        {user?.username}
                        {user?.isVerified && <HiBadgeCheck className="text-accent" />}
                    </Link>
                    {user?.fullName && <div className="sp-fullname">{user.fullName}</div>}
                </div>
                <Link to={`/profile/${user?._id}`} className="sp-action-link">
                    View profile
                </Link>
            </div>

            {/* ── Suggestions Section ─────────── */}
            <div className="mt-2">
                <div className="sp-section-header">
                    <span className="sp-section-title">Suggested for you</span>
                    <Link to="/search" className="sp-action-link sp-action-link--muted">See All</Link>
                </div>

                <div className="flex flex-col sp-suggestions-list">
                    {loading ? (
                        [...Array(5)].map((_, i) => (
                            /* 34px and ml-1, matching .sp-suggestion-avatar and
                               the real info column. It was 32px with no margin,
                               so the text block sat 4px left of where it landed. */
                            <div key={i} className="sp-suggestion-row">
                                <div className="skeleton skeleton-circle w-[34px] h-[34px]" />
                                <div className="sp-suggestion-info ml-1">
                                    <div className="skeleton skeleton-text m h-3" />
                                    <div className="skeleton skeleton-text s h-2" />
                                </div>
                                <div className="skeleton w-12 h-6 rounded-md" />
                            </div>
                        ))
                    ) : suggestions.map((u) => {
                        const av = optimizeAvatarUrl(u.avatarUrl ||
                            avatarFallback(u.username))
                        const isFollowed = followed[u._id]
                        const followers = u.followersCount || 0
                        return (
                            <div key={u._id} className="sp-suggestion-row">
                                <Link to={`/profile/${u._id}`} tabIndex={-1} aria-hidden="true">
                                    <img src={av} className="sp-suggestion-avatar" alt="" />
                                </Link>
                                <div className="sp-suggestion-info ml-1">
                                    {/* The avatar above repeats this link, so it
                                        is hidden from the accessible tree and
                                        taken out of the tab order rather than
                                        announcing the same destination twice. */}
                                    <Link
                                        to={`/profile/${u._id}`}
                                        className="sp-suggestion-username hover:underline"
                                    >
                                        {u.username}
                                        {u.isVerified && <HiBadgeCheck className="text-accent" />}
                                    </Link>
                                    <div className="sp-suggestion-subtext">
                                        {u.fullName || `${followers} follower${followers === 1 ? '' : 's'}`}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleFollow(u)}
                                    aria-label={`${isFollowed ? 'Unfollow' : 'Follow'} ${u.username}`}
                                    aria-pressed={!!isFollowed}
                                    className={`sp-btn-follow text-xs font-bold ${isFollowed ? 'text-muted' : 'text-accent hover:text-accent-hover'}`}
                                >
                                    {isFollowed ? 'Following' : 'Follow'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ── Aesthetic Sidebar Footer ──────────────── */}
            <div className="sp-footer">
                <div className="flex flex-col gap-3">
                    <a 
                        href="https://www.linkedin.com/in/syedmukheeth" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="sp-developer-link"
                    >
                        <FaLinkedin size={16} className="icon-linkedin" />
                        <span>Developed by Syed Mukheeth</span>
                    </a>
                    <span className="sp-footer-copyright">
                        © 2026 PEERNET FROM INDIA
                    </span>
                </div>
            </div>

        </div>
    )
}
