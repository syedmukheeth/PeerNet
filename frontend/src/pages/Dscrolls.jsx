import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { HiHeart, HiOutlineHeart, HiVolumeOff, HiVolumeUp, HiChatAlt2, HiShare, HiArrowLeft, HiRefresh } from 'react-icons/hi'
import { timeago } from '../utils/timeago'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'

const fetchDscrolls = async ({ pageParam = null }) => {
    const params = { limit: 10, _t: Date.now() }
    if (pageParam) params.cursor = pageParam
    const { data } = await api.get('/dscrolls', { params })
    return data
}

function HeartBurst({ x, y }) {
    return (
        <motion.div
            style={{
                position: 'absolute', left: x - 55, top: y - 55,
                width: 110, height: 110, pointerEvents: 'none', zIndex: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 80, filter: 'drop-shadow(0 2px 20px rgba(255,0,80,0.9))',
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 1.4, 1.1, 1.3], opacity: [1, 1, 1, 0] }}
            transition={{ duration: 0.75 }}
        >❤️</motion.div>
    )
}

function Btn({ icon, count, onClick, active }) {
    return (
        <motion.div onClick={onClick} whileTap={{ scale: 0.75 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', padding: '6px 0' }}
        >
            <div style={{
                fontSize: 30, color: active ? '#FF3040' : '#fff',
                filter: 'drop-shadow(0 1px 5px rgba(0,0,0,0.7))',
                transition: 'color 0.15s', display: 'flex',
            }}>{icon}</div>
            {count !== undefined && (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                    {count > 9999 ? `${(count / 1000).toFixed(1)}k` : count}
                </span>
            )}
        </motion.div>
    )
}

function DscrollItem({ dscroll, isActive }) {
    const videoRef = useRef()
    const [liked, setLiked] = useState(dscroll.isLiked || false)
    const [likesCount, setLikesCount] = useState(dscroll.likesCount || 0)
    const pendingLike = useRef(false)   // true while API call is in-flight
    const localLiked = useRef(null)     // user's intended liked state; null = defer to server
    const localCount = useRef(null)     // user's intended count; null = defer to server
    const [muted, setMuted] = useState(true)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [showPause, setShowPause] = useState(false)
    const [heartBursts, setHeartBursts] = useState([])
    const [captionExpanded, setCaptionExpanded] = useState(false)
    const [videoError, setVideoError] = useState(false)
    const tapCount = useRef(0)
    const tapTimer = useRef(null)
    const pauseTimer = useRef(null)
    const lastPos = useRef({ x: 0, y: 0 })

    // Sync liked state from server data only when we don't have a pending local override
    useEffect(() => {
        if (localLiked.current !== null) {
            // We have a locally set state — keep it; ignore stale server data
            setLiked(localLiked.current)
            setLikesCount(localCount.current)
        } else {
            setLiked(dscroll.isLiked || false)
            setLikesCount(dscroll.likesCount || 0)
        }
    }, [dscroll.isLiked, dscroll.likesCount])

    useEffect(() => {
        const v = videoRef.current
        if (!v) return
        if (isActive) {
            // Reset and play
            v.currentTime = 0
            v.play().catch(() => {})
        } else {
            v.pause()
            v.currentTime = 0
            setProgress(0)
        }
    }, [isActive])

    const onTimeUpdate = () => {
        const v = videoRef.current
        if (v?.duration) { setProgress(v.currentTime / v.duration); setDuration(v.duration) }
    }

    const handleTap = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left
        const y = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top
        lastPos.current = { x, y }
        tapCount.current += 1
        clearTimeout(tapTimer.current)
        tapTimer.current = setTimeout(() => {
            if (tapCount.current >= 2) {
                if (!liked) {
                    const nextCount = likesCount + 1
                    localLiked.current = true
                    localCount.current = nextCount
                    setLiked(true); setLikesCount(nextCount)
                    pendingLike.current = true
                    api.post(`/posts/${dscroll._id}/like`)
                        .catch(() => {
                            localLiked.current = false
                            localCount.current = likesCount
                            setLiked(false); setLikesCount(likesCount)
                        })
                        .finally(() => { pendingLike.current = false })
                }
                const id = Date.now()
                setHeartBursts(b => [...b, { id, ...lastPos.current }])
                setTimeout(() => setHeartBursts(b => b.filter(h => h.id !== id)), 900)
            } else {
                const v = videoRef.current
                if (!v) return
                if (v.paused) { v.play().catch(() => {}); setShowPause(false) }
                else {
                    v.pause()
                    setShowPause(true)
                    clearTimeout(pauseTimer.current)
                    pauseTimer.current = setTimeout(() => setShowPause(false), 2000)
                }
            }
            tapCount.current = 0
        }, 230)
    }, [liked, likesCount, dscroll._id])

    const handleLike = (e) => {
        e.stopPropagation()
        if (pendingLike.current) return  // prevent double-tap race
        const next = !liked
        const nextCount = next ? likesCount + 1 : likesCount - 1
        localLiked.current = next
        localCount.current = nextCount
        setLiked(next)
        setLikesCount(nextCount)
        pendingLike.current = true
        ;(next ? api.post : api.delete)(`/posts/${dscroll._id}/like`)
            .catch(() => {
                localLiked.current = !next
                localCount.current = likesCount
                setLiked(!next)
                setLikesCount(likesCount)
            })
            .finally(() => { pendingLike.current = false })
    }

    const handleShare = (e) => {
        e.stopPropagation()
        const url = `${window.location.origin}/posts/${dscroll._id}`
        if (navigator.share) navigator.share({ url }).catch(() => {})
        else { navigator.clipboard.writeText(url).catch(() => {}); }
    }

    const handleSeek = (e) => {
        e.stopPropagation()
        const rect = e.currentTarget.getBoundingClientRect()
        const v = videoRef.current
        if (v?.duration) v.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * v.duration
    }

    const fmt = (s) => !s || isNaN(s) ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
    const author = dscroll.author || {}
    const avatar = author.avatarUrl || `https://ui-avatars.com/api/?name=${author.username || 'U'}&background=6c63ff&color=fff`
    const caption = dscroll.caption || ''

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden', userSelect: 'none' }}>
            {/* Video */}
            {videoError ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#fff', gap: 8 }}>
                    <div style={{ fontSize: 32 }}>⚠️</div>
                    <div style={{ fontSize: 14 }}>Video unavailable</div>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    src={dscroll.mediaUrl}
                    loop
                    muted={muted}
                    playsInline
                    preload="auto"
                    onTimeUpdate={onTimeUpdate}
                    onLoadedMetadata={onTimeUpdate}
                    onError={() => setVideoError(true)}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
            )}

            {/* Gradient */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 20%, transparent 52%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)',
            }} />

            {/* Full-area tap zone */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 5 }} onClick={handleTap} />

            {/* Heart bursts */}
            {heartBursts.map(b => <HeartBurst key={b.id} x={b.x} y={b.y} />)}

            {/* Pause indicator */}
            <AnimatePresence>
                {showPause && (
                    <motion.div
                        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 8, pointerEvents: 'none' }}
                        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div style={{
                            width: 60, height: 60, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', paddingLeft: 4,
                        }}>▶</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Right action bar */}
            <div style={{ position: 'absolute', right: 10, bottom: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, zIndex: 10 }}
                onClick={e => e.stopPropagation()}>
                <div style={{ position: 'relative', marginBottom: 4 }}>
                    <Link to={`/profile/${author._id}`} onClick={e => e.stopPropagation()}>
                        <img src={avatar} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', display: 'block' }} />
                    </Link>
                </div>
                <Btn icon={liked ? <HiHeart /> : <HiOutlineHeart />} count={likesCount} onClick={handleLike} active={liked} />
                <Btn icon={<HiChatAlt2 />} count={dscroll.commentsCount || 0} onClick={e => e.stopPropagation()} />
                <Btn icon={<HiShare />} onClick={handleShare} />
                <Btn icon={muted ? <HiVolumeOff /> : <HiVolumeUp />} onClick={e => { e.stopPropagation(); setMuted(m => !m) }} />
            </div>

            {/* Bottom info */}
            <div style={{ position: 'absolute', bottom: 28, left: 14, right: 68, zIndex: 10, pointerEvents: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, pointerEvents: 'auto' }}>
                    <Link to={`/profile/${author._id}`} onClick={e => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', textShadow: '0 1px 5px rgba(0,0,0,0.7)' }}>{author.username}</span>
                    </Link>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{timeago(dscroll.createdAt)}</span>
                </div>
                {caption && (
                    <p style={{ fontSize: 13, color: '#fff', margin: '0 0 8px', textShadow: '0 1px 4px rgba(0,0,0,0.6)', lineHeight: 1.45, pointerEvents: 'auto' }}>
                        {caption.length > 80 && !captionExpanded ? caption.slice(0, 80) : caption}
                        {caption.length > 80 && (
                            <button onClick={e => { e.stopPropagation(); setCaptionExpanded(x => !x) }}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer', padding: '0 0 0 4px' }}>
                                {captionExpanded ? 'less' : '...more'}
                            </button>
                        )}
                    </p>
                )}
            </div>

            {/* Progress bar */}
            <div onClick={handleSeek} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.18)', zIndex: 10, cursor: 'pointer' }}>
                <div style={{ height: '100%', width: `${progress * 100}%`, background: '#fff', transition: 'width 0.15s linear' }} />
            </div>
            <div style={{ position: 'absolute', bottom: 5, right: 10, fontSize: 10, color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 3px rgba(0,0,0,0.6)', zIndex: 11 }}>
                {fmt(progress * duration)} / {fmt(duration)}
            </div>
        </div>
    )
}

export default function Dscrolls() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [currentIdx, setCurrentIdx] = useState(0)
    const containerRef = useRef()
    const observerRef = useRef()

    const { data, status, fetchNextPage, hasNextPage, refetch } = useInfiniteQuery({
        queryKey: ['dscrolls'],
        queryFn: fetchDscrolls,
        getNextPageParam: (last) => last.nextCursor ?? undefined,
        staleTime: 30_000,          // 30s before considered stale
        refetchOnMount: true,
        refetchOnWindowFocus: false, // Don't refetch on focus — it resets liked state
    })

    // Removed aggressive visibility refetch — it was resetting liked state on every scroll

    const dscrolls = data?.pages.flatMap(p => p.data || []) ?? []

    useEffect(() => {
        if (!containerRef.current) return
        const items = containerRef.current.querySelectorAll('[data-dscroll]')
        observerRef.current?.disconnect()
        observerRef.current = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    const idx = Number(e.target.dataset.dscroll)
                    setCurrentIdx(idx)
                    if (idx >= dscrolls.length - 2 && hasNextPage) fetchNextPage()
                }
            })
        }, { threshold: 0.6 })
        items.forEach(el => observerRef.current.observe(el))
        return () => observerRef.current?.disconnect()
    }, [dscrolls.length, hasNextPage, fetchNextPage])

    if (status === 'pending') return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 44, height: 44, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
        </div>
    )

    if (dscrolls.length === 0) return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 16, padding: 32 }}>
            <div style={{ fontSize: 56 }}>🎬</div>
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>No Dscrolls yet</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0, textAlign: 'center' }}>
                Upload a video using the + button in the navigation bar
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                    onClick={() => refetch()}
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <HiRefresh /> Refresh
                </button>
                <button onClick={() => navigate(-1)} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 20, padding: '10px 28px', fontWeight: 700, cursor: 'pointer' }}>
                    Go back
                </button>
            </div>
        </div>
    )

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: '#000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
        }}>
            <div style={{
                width: '100%',
                maxWidth: 430,
                height: '100dvh',
                position: 'relative',
                background: '#000',
                overflow: 'hidden',
            }}>
                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        position: 'absolute', top: 16, left: 16, zIndex: 220,
                        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)',
                        border: 'none', borderRadius: '50%', width: 36, height: 36,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#fff', fontSize: 19,
                    }}
                ><HiArrowLeft /></button>

                {/* Refresh button */}
                <button
                    onClick={() => { queryClient.invalidateQueries({ queryKey: ['dscrolls'] }) }}
                    style={{
                        position: 'absolute', top: 16, right: 16, zIndex: 220,
                        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)',
                        border: 'none', borderRadius: '50%', width: 36, height: 36,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#fff', fontSize: 19,
                    }}
                ><HiRefresh /></button>

                {/* Scroll-snap container */}
                <div
                    ref={containerRef}
                    style={{
                        height: '100dvh',
                        overflowY: 'scroll',
                        scrollSnapType: 'y mandatory',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                >
                    {dscrolls.map((dscroll, i) => (
                        <div key={dscroll._id || i} data-dscroll={i}
                            style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', height: '100dvh' }}
                        >
                            <DscrollItem dscroll={dscroll} isActive={currentIdx === i} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
