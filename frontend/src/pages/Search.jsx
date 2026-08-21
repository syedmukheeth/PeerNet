import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { HiSearch, HiBadgeCheck, HiX, HiExclamationCircle } from '../components/ui/icons'
import toast from 'react-hot-toast'
import avatarFallback from '../components/ui/avatarFallback'
import { useRecentSearches } from '../hooks/useRecentSearches'
import { listItem, staggerContainer, useMotionPreset } from '../lib/motion'

/*
 * One row, used by results, recent searches and suggestions alike.
 *
 * Search results and the suggestions rail used to be two different row designs
 * for the same thing: a person, their name, and a follow button.
 */
function PersonRow({ person, index, activeIndex, onOpen, onDismiss, dismissLabel, children }) {
    const avatar = person.avatarUrl || avatarFallback(person.username)
    const isActive = index === activeIndex

    return (
        <motion.div
            variants={listItem}
            id={`search-option-${index}`}
            role="option"
            aria-selected={isActive}
            className={`ig-result-row${isActive ? ' is-active' : ''}`}
        >
            <Link
                to={`/profile/${person._id}`}
                className="ig-result-user"
                onClick={() => onOpen?.(person)}
                tabIndex={-1}
            >
                <div className="ig-result-avatar-wrap">
                    <img
                        src={avatar}
                        className="ig-result-avatar"
                        alt=""
                        width="44"
                        height="44"
                        loading="lazy"
                    />
                </div>
                <div className="ig-result-info">
                    <div className="ig-result-username">
                        <span>{person.username}</span>
                        {person.isVerified && <HiBadgeCheck className="ig-verified" />}
                    </div>
                    {person.fullName && <div className="ig-result-fullname">{person.fullName}</div>}
                    {person.followersCount > 0 && (
                        <div className="ig-result-meta">{formatFollowers(person.followersCount)} followers</div>
                    )}
                </div>
            </Link>

            {onDismiss && (
                <button
                    className="ig-result-dismiss"
                    onClick={() => onDismiss(person._id)}
                    aria-label={dismissLabel}
                >
                    <HiX size={15} />
                </button>
            )}
            {children}
        </motion.div>
    )
}

const formatFollowers = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n)

export default function Search() {
    const { user: me } = useAuth()
    const navigate = useNavigate()
    const [q, setQ] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [following, setFollowing] = useState({})
    // Which follow button is mid-request. There was no pending state at all, so
    // the button could be fired twice before the first call came back.
    const [pendingFollow, setPendingFollow] = useState(null)
    // Keyboard position in the list. -1 means the input still owns focus.
    const [activeIndex, setActiveIndex] = useState(-1)

    const inputRef = useRef()
    const debounceRef = useRef(null)
    const abortRef = useRef(null)

    const { recents, remember, forget, clear } = useRecentSearches(me?._id)
    const listVariants = useMotionPreset(staggerContainer(0.03))

    // The same endpoint the suggestions rail uses, so the idle screen and the
    // rail cannot disagree about who to suggest.
    const { data: suggestions = [] } = useQuery({
        queryKey: ['suggestions', 'search'],
        queryFn: async () => (await api.get('/users/suggestions', { params: { limit: 8 } })).data.data || [],
        enabled: Boolean(me?._id),
        staleTime: 5 * 60 * 1000,
    })

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
        setActiveIndex(-1)

        if (debounceRef.current) clearTimeout(debounceRef.current)

        if (val.trim().length < 2) {
            setResults([])
            setError(null)
            setLoading(false)
            if (abortRef.current) {
                abortRef.current.abort()
                abortRef.current = null
            }
            return
        }

        setLoading(true)
        debounceRef.current = setTimeout(() => doSearch(val.trim()), 300)
    }

    const clearSearch = useCallback(() => {
        setQ('')
        setResults([])
        setError(null)
        setLoading(false)
        setActiveIndex(-1)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (abortRef.current) abortRef.current.abort()
        inputRef.current?.focus()
    }, [])

    useEffect(() => () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (abortRef.current) abortRef.current.abort()
    }, [])

    const handleFollow = async (userId, isFollowing) => {
        if (pendingFollow) return
        setPendingFollow(userId)
        setFollowing((prev) => ({ ...prev, [userId]: !isFollowing }))
        try {
            if (isFollowing) await api.delete(`/users/${userId}/follow`)
            else await api.post(`/users/${userId}/follow`)
        } catch {
            setFollowing((prev) => ({ ...prev, [userId]: isFollowing }))
            toast.error('Could not update follow')
        } finally {
            setPendingFollow(null)
        }
    }

    const hasQuery = q.trim().length >= 2

    // Whatever is on screen is what the arrow keys move through, so the same
    // list drives both rendering and navigation.
    const navigable = useMemo(() => {
        if (hasQuery) return results
        return recents.length > 0 ? recents : suggestions
    }, [hasQuery, results, recents, suggestions])

    /*
     * Keyboard control. The page had none: no arrow keys, no Escape, no way to
     * open a result without reaching for the mouse, and the results were a div
     * of divs with no listbox semantics.
     */
    const onKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault()
            if (q) clearSearch()
            else inputRef.current?.blur()
            return
        }

        if (!navigable.length) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((i) => (i + 1) % navigable.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((i) => (i <= 0 ? navigable.length - 1 : i - 1))
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault()
            const person = navigable[activeIndex]
            if (person) {
                remember(person)
                navigate(`/profile/${person._id}`)
            }
        }
    }

    // "/" focuses the search box from anywhere on the page, the way every
    // search-first product behaves.
    useEffect(() => {
        const onGlobalKey = (e) => {
            if (e.key !== '/' || e.metaKey || e.ctrlKey) return
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return
            e.preventDefault()
            inputRef.current?.focus()
        }
        document.addEventListener('keydown', onGlobalKey)
        return () => document.removeEventListener('keydown', onGlobalKey)
    }, [])

    const followButton = (u) => {
        if (u._id === me?._id) return null
        const isFollowing = following[u._id] !== undefined ? following[u._id] : u.isFollowing
        return (
            <button
                className={`ig-follow-btn ${isFollowing ? 'following' : ''}`}
                onClick={() => handleFollow(u._id, isFollowing)}
                disabled={pendingFollow === u._id}
                aria-pressed={Boolean(isFollowing)}
            >
                {isFollowing ? 'Following' : 'Follow'}
            </button>
        )
    }

    return (
        <div className="ig-search-page">
            {/* ── Search Bar ── */}
            <div className="ig-search-bar-wrap">
                <div className="field">
                    <HiSearch className={`field-icon ${loading ? 'loading' : ''}`} />
                    <input
                        ref={inputRef}
                        className="field-input"
                        placeholder="Search people"
                        value={q}
                        onChange={handleSearch}
                        onKeyDown={onKeyDown}
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={navigable.length > 0}
                        aria-controls="search-listbox"
                        aria-autocomplete="list"
                        aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
                    />
                    {q && (
                        <button className="ig-search-clear" onClick={clearSearch} aria-label="Clear search">
                            <HiX size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Loading Skeletons ── */}
            {loading && hasQuery && (
                <div className="ig-search-skeleton" aria-busy="true">
                    {[...Array(5)].map((_, i) => (
                        /* A result row is a three-line info column with a follow
                           button on the right. The button had no placeholder, so
                           a ~72px control popped in on every row. */
                        <div key={i} className="ig-skeleton-row">
                            <div className="skeleton ig-skeleton-avatar" />
                            <div className="ig-skeleton-lines">
                                <div className="skeleton ig-skeleton-name" />
                                <div className="skeleton ig-skeleton-sub" />
                                <div className="skeleton ig-skeleton-sub" style={{ width: '18%' }} />
                            </div>
                            <div className="skeleton" style={{ width: 72, height: 30, borderRadius: 'var(--r-sm)' }} />
                        </div>
                    ))}
                </div>
            )}

            <motion.div
                id="search-listbox"
                role="listbox"
                aria-label="People"
                className="ig-search-results"
                variants={listVariants}
                initial="initial"
                animate="animate"
                key={hasQuery ? `q:${q}` : 'idle'}
            >
                {/* ── Results ── */}
                {!loading && hasQuery && results.map((u, i) => (
                    <PersonRow
                        key={u._id}
                        person={u}
                        index={i}
                        activeIndex={activeIndex}
                        onOpen={remember}
                    >
                        {followButton(u)}
                    </PersonRow>
                ))}

                {/* ── Idle: recent searches, then suggestions ── */}
                {!hasQuery && recents.length > 0 && (
                    <>
                        <div className="ig-section-head">
                            <h2 className="ig-section-title">Recent</h2>
                            <button className="ig-section-action" onClick={clear}>Clear all</button>
                        </div>
                        {recents.map((person, i) => (
                            <PersonRow
                                key={person._id}
                                person={person}
                                index={i}
                                activeIndex={activeIndex}
                                onOpen={remember}
                                onDismiss={forget}
                                dismissLabel={`Remove ${person.username} from recent searches`}
                            />
                        ))}
                    </>
                )}

                {!hasQuery && suggestions.length > 0 && (
                    <>
                        <div className="ig-section-head">
                            <h2 className="ig-section-title">Suggested for you</h2>
                        </div>
                        {suggestions.map((u, i) => (
                            <PersonRow
                                key={u._id}
                                person={u}
                                index={recents.length > 0 ? -1 : i}
                                activeIndex={activeIndex}
                                onOpen={remember}
                            >
                                {followButton(u)}
                            </PersonRow>
                        ))}
                    </>
                )}
            </motion.div>

            {/* ── Search failed ── */}
            {hasQuery && !loading && error && (
                <div className="ig-search-empty" role="alert">
                    <div className="ig-empty-icon-wrap">
                        <HiExclamationCircle size={26} />
                    </div>
                    <p className="ig-empty-title">Search unavailable</p>
                    <p className="ig-empty-sub">{error}</p>
                    <button className="btn btn-secondary btn-sm" onClick={() => doSearch(q.trim())}>
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

            {/* Nothing typed, nothing remembered, nobody to suggest. */}
            {!hasQuery && recents.length === 0 && suggestions.length === 0 && (
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
