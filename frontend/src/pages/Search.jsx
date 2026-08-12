import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { HiSearch, HiBadgeCheck, HiX, HiExclamationCircle } from 'react-icons/hi'
import toast from 'react-hot-toast'

export default function Search() {
    const { user: me } = useAuth()
    const [q, setQ] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [following, setFollowing] = useState({})
    const [focused, setFocused] = useState(false)
    const inputRef = useRef()
    const debounceRef = useRef(null)
    const abortRef = useRef(null)

    const doSearch = useCallback(async (val) => {
        // Cancel any in-flight request
        if (abortRef.current) abortRef.current.abort()
        const controller = new AbortController()
        abortRef.current = controller

        setLoading(true)
        setError(null)
        try {
            const { data } = await api.get('/users/search', {
                params: { q: val, limit: 20 },
                signal: controller.signal
            })
            setResults(data.data || [])
        } catch (err) {
            if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
            // Errors were swallowed entirely, so a failed search was
            // indistinguishable from "no results found".
            setResults([])
            setError('Search is unavailable right now.')
        } finally {
            // Guarded on this request still being the current one. The cancelled
            // request's finally used to run after the new one had already set
            // loading, killing the spinner while a request was still in flight.
            if (!controller.signal.aborted) setLoading(false)
        }
    }, [])

    const handleSearch = (e) => {
        const val = e.target.value
        setQ(val)

        // Clear previous debounce timer
        if (debounceRef.current) clearTimeout(debounceRef.current)

        if (val.length < 2) {
            setResults([])
            setLoading(false)
            if (abortRef.current) abortRef.current.abort()
            return
        }

        // Show loading immediately while debouncing
        setLoading(true)
        debounceRef.current = setTimeout(() => doSearch(val), 300)
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            if (abortRef.current) abortRef.current.abort()
        }
    }, [])

    const clearSearch = () => {
        setQ('')
        setResults([])
        setLoading(false)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (abortRef.current) abortRef.current.abort()
        inputRef.current?.focus()
    }

    const handleFollow = async (userId, isFollowing) => {
        setFollowing(f => ({ ...f, [userId]: !isFollowing }))
        try {
            if (isFollowing) await api.delete(`/users/${userId}/follow`)
            else await api.post(`/users/${userId}/follow`)
        } catch (err) {
            setFollowing(f => ({ ...f, [userId]: isFollowing }))
            toast.error(err.response?.data?.message || 'Action failed')
        }
    }

    const hasQuery = q.length >= 2

    return (
        <div className="ig-search-page">
            {/* ── Search Bar ── */}
            <div className="ig-search-bar-wrap">
                <div className={`ig-search-bar ${focused ? 'focused' : ''}`}>
                    <HiSearch className={`ig-search-icon ${loading ? 'loading' : ''}`} />
                    <input
                        ref={inputRef}
                        className="ig-search-input"
                        placeholder="Search"
                        value={q}
                        onChange={handleSearch}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        autoComplete="off"
                    />
                    {q && (
                        <button className="ig-search-clear" onClick={clearSearch}>
                            <HiX size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Loading Skeletons ── */}
            {loading && hasQuery && (
                <div className="ig-search-skeleton">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="ig-skeleton-row">
                            <div className="skeleton ig-skeleton-avatar" />
                            <div className="ig-skeleton-lines">
                                <div className="skeleton ig-skeleton-name" />
                                <div className="skeleton ig-skeleton-sub" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Results ── */}
            {!loading && hasQuery && results.length > 0 && (
                    <div className="ig-search-results">
                        {results.map((u) => {
                            const isFollowing = following[u._id] !== undefined ? following[u._id] : u.isFollowing
                            const avatar = u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}&background=6366F1&color=fff`
                            return (
                                <div key={u._id} className="ig-result-row">
                                    <Link to={`/profile/${u._id}`} className="ig-result-user">
                                        <div className="ig-result-avatar-wrap">
                                            <img src={avatar} className="ig-result-avatar" alt={u.username} />
                                        </div>
                                        <div className="ig-result-info">
                                            <div className="ig-result-username">
                                                <span>{u.username}</span>
                                                {u.isVerified && <HiBadgeCheck className="ig-verified" />}
                                            </div>
                                            {u.fullName && (
                                                <div className="ig-result-fullname">{u.fullName}</div>
                                            )}
                                            {u.followersCount > 0 && (
                                                <div className="ig-result-meta">
                                                    {u.followersCount >= 1000
                                                        ? (u.followersCount / 1000).toFixed(1) + 'K'
                                                        : u.followersCount} followers
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                    {u._id !== me?._id && (
                                        <button
                                            className={`ig-follow-btn ${isFollowing ? 'following' : ''}`}
                                            onClick={() => handleFollow(u._id, isFollowing)}
                                        >
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

            {/* ── Search failed ── */}
            {hasQuery && !loading && error && (
                <div className="ig-search-empty" role="alert">
                    <div className="ig-empty-icon-wrap">
                        <HiExclamationCircle size={26} />
                    </div>
                    <p className="ig-empty-title">Search unavailable</p>
                    <p className="ig-empty-sub">{error}</p>
                    <button className="btn btn-secondary btn-sm" onClick={() => doSearch(q)}>
                        Try again
                    </button>
                </div>
            )}

            {/* ── No Results ── */}
            {hasQuery && !loading && !error && results.length === 0 && (
                <div className="ig-search-empty">
                    <div className="ig-empty-icon-wrap">
                        <HiSearch size={26} />
                    </div>
                    <p className="ig-empty-title">No results</p>
                    <p className="ig-empty-sub">No account found for &ldquo;<strong>{q}</strong>&rdquo;</p>
                </div>
            )}

            {/* ── Initial Empty State ── */}
            {!hasQuery && !loading && (
                <div className="ig-search-empty">
                    <div className="ig-empty-icon-wrap">
                        <HiSearch size={26} />
                    </div>
                    <p className="ig-empty-title">Search for people</p>
                    <p className="ig-empty-sub">Type a username or name to find accounts.</p>
                </div>
            )}
        </div>
    )
}
