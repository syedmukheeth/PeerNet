import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import {
    HiHeart, HiOutlineHeart, HiVolumeOff, HiVolumeUp,
    HiChatAlt2, HiShare,
} from 'react-icons/hi'
import { timeago } from '../utils/timeago'
import { useInfiniteQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'

const fetchDscrolls = async ({ pageParam = null }) => {
    const params = { limit: 10 }
    if (pageParam) params.cursor = pageParam
    const { data } = await api.get('/dscrolls', { params })
    return data
}

/* ── Double-tap Heart Burst ─────────────────────────────── */
function HeartBurst({ x, y }) {
    return (
        <motion.div
            style={{
                position: 'absolute', left: x - 50, top: y - 50,
                width: 100, height: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none', zIndex: 20,
                fontSize: 80, color: '#fff', filter: 'drop-shadow(0 0 12px rgba(255,0,80,0.8))',
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 1.4, 1.1, 1.3], opacity: [1, 1, 1, 0] }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
        >
            ❤️
        </motion.div>
    )
}

/* ── Music Ticker ─────────────────────────────────────────── */
function MusicTicker({ text }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '70%', overflow: 'hidden' }}>
            <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg,#1a1a2e,#16213e)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, animation: 'spinSlow 4s linear infinite',
                fontSize: 14,
            }}>🎵</div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{
                    whiteSpace: 'nowrap',
                    animation: text.length > 20 ? 'scrollText 8s linear infinite' : 'none',
                    fontSize: 12, color: '#fff', fontWeight: 500,
                }}>
                    {text}
                </div>
            </div>
        </div>
    )
}

/* ── Action Button ────────────────────────────────────────── */
function ActionBtn({ icon, count, onClick, active, color }) {
    return (
        <motion.div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
            whileTap={{ scale: 0.85 }}
            onClick={onClick}
        >
            <div style={{
                fontSize: 30,
                color: active ? (color || '#FF3040') : '#fff',
                filter: active ? `drop-shadow(0 0 8px ${color || '#FF3040'})` : 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
                transition: 'all 0.2s',
                display: 'flex',
            }}>
                {icon}
            </div>
            {count !== undefined && (
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                    {count > 999 ? (count / 1000).toFixed(1) + 'k' : count}
                </span>
            )}
        </motion.div>
    )
}

/* ── Individual Reel ─────────────────────────────────────── */
function ReelItem({ reel, isActive }) {
    const videoRef = useRef()
    const [liked, setLiked] = useState(reel.isLiked || false)
    const [likesCount, setLikesCount] = useState(reel.likesCount || 0)
    const [muted, setMuted] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [paused, setPaused] = useState(false)
    const [heartBursts, setHeartBursts] = useState([])
    const [captionExpanded, setCaptionExpanded] = useState(false)
    const tapTimer = useRef(null)
    const tapCount = useRef(0)
    const tapPos = useRef({ x: 0, y: 0 })
    const tapSide = useRef(null)

    /* Auto play/pause */
    useEffect(() => {
        if (!videoRef.current) return
        if (isActive) {
            videoRef.current.play().catch(() => { })
            setPaused(false)
        } else {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
            setProgress(0)
        }
    }, [isActive])

    const handleTimeUpdate = () => {
        const v = videoRef.current
        if (v && v.duration) {
            setProgress(v.currentTime / v.duration)
            setDuration(v.duration)
        }
    }

    /* Double-tap to like / seek */
    const handleTap = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left
        const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top
        const side = x < rect.width / 2 ? 'left' : 'right'
        tapSide.current = side
        tapPos.current = { x, y }
        tapCount.current += 1

        if (tapTimer.current) clearTimeout(tapTimer.current)
        tapTimer.current = setTimeout(() => {
            if (tapCount.current >= 2) {
                if (side === 'right') {
                    // Double tap right = LIKE (Instagram behavior)
                    if (!liked) {
                        setLiked(true)
                        setLikesCount(c => c + 1)
                        api.post(`/posts/${reel._id}/like`).catch(() => { setLiked(false); setLikesCount(c => c - 1) })
                    }
                    const burst = { id: Date.now(), x: tapPos.current.x, y: tapPos.current.y }
                    setHeartBursts(b => [...b, burst])
                    setTimeout(() => setHeartBursts(b => b.filter(h => h.id !== burst.id)), 900)
                } else {
                    // Double tap left = rewind 10s
                    if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10)
                }
            } else {
                // Single tap = pause/play
                if (videoRef.current) {
                    if (videoRef.current.paused) { videoRef.current.play(); setPaused(false) }
                    else { videoRef.current.pause(); setPaused(true) }
                }
            }
            tapCount.current = 0
        }, 220)
    }, [liked, reel._id])

    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const ratio = (e.clientX - rect.left) / rect.width
        if (videoRef.current && videoRef.current.duration) {
            videoRef.current.currentTime = ratio * videoRef.current.duration
        }
    }

    const handleLike = async (e) => {
        e.stopPropagation()
        const next = !liked
        setLiked(next)
        setLikesCount(next ? likesCount + 1 : likesCount - 1)
        try {
            if (next) await api.post(`/posts/${reel._id}/like`)
            else await api.delete(`/posts/${reel._id}/like`)
        } catch { setLiked(!next); setLikesCount(likesCount) }
    }

    const handleShare = (e) => {
        e.stopPropagation()
        if (navigator.share) {
            navigator.share({ title: reel.caption || 'Check this Dscroll', url: window.location.href })
        } else {
            navigator.clipboard.writeText(window.location.href)
                .then(() => alert('Link copied!'))
        }
    }

    const fmt = (s) => {
        const m = Math.floor(s / 60), sec = Math.floor(s % 60)
        return `${m}:${sec.toString().padStart(2, '0')}`
    }

    const author = reel.author || {}
    const avatar = author.avatarUrl || `https://ui-avatars.com/api/?name=${author.username}&background=6c63ff&color=fff`
    const caption = reel.caption || ''
    const isLong = caption.length > 80

    return (
        <div
            style={{ position: 'relative', width: '100%', height: '100dvh', background: '#000', overflow: 'hidden', flexShrink: 0 }}
            onClick={handleTap}
        >
            {/* Video */}
            <video
                ref={videoRef}
                src={reel.mediaUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loop muted={muted} playsInline
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleTimeUpdate}
            />

            {/* Gradient overlays */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.75) 100%)',
            }} />

            {/* Pause icon */}
            <AnimatePresence>
                {paused && (
                    <motion.div
                        style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(0,0,0,0.45)', borderRadius: '50%',
                            width: 72, height: 72,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'none', zIndex: 5,
                        }}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div style={{ fontSize: 36, color: '#fff', marginLeft: 4 }}>▶</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Heart Bursts */}
            {heartBursts.map(b => <HeartBurst key={b.id} x={b.x} y={b.y} />)}

            {/* ── Right action bar ── */}
            <div style={{
                position: 'absolute', right: 14, bottom: 100,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
                zIndex: 10,
            }} onClick={e => e.stopPropagation()}>

                {/* Author Avatar */}
                <div style={{ position: 'relative', marginBottom: 6 }}>
                    <Link to={`/profile/${author._id}`}>
                        <img src={avatar} alt="" style={{
                            width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                            border: '2px solid #fff', display: 'block',
                        }} />
                    </Link>
                    <div style={{
                        position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#E1306C,#F77737)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, border: '2px solid #000',
                    }}>+</div>
                </div>

                {/* Like */}
                <ActionBtn
                    icon={liked ? <HiHeart /> : <HiOutlineHeart />}
                    count={likesCount}
                    onClick={handleLike}
                    active={liked}
                    color="#FF3040"
                />

                {/* Comment */}
                <ActionBtn
                    icon={<HiChatAlt2 />}
                    count={reel.commentsCount || 0}
                    onClick={e => { e.stopPropagation() }}
                    active={false}
                />

                {/* Share */}
                <ActionBtn
                    icon={<HiShare />}
                    onClick={handleShare}
                    active={false}
                />

                {/* Volume */}
                <ActionBtn
                    icon={muted ? <HiVolumeOff /> : <HiVolumeUp />}
                    onClick={e => { e.stopPropagation(); setMuted(m => !m) }}
                    active={false}
                />
            </div>

            {/* ── Bottom info block ── */}
            <div style={{
                position: 'absolute', left: 14, right: 70, bottom: 60,
                zIndex: 10, pointerEvents: 'none',
            }}>
                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, pointerEvents: 'auto' }}>
                    <Link to={`/profile/${author._id}`} style={{ textDecoration: 'none' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                            {author.username}
                        </span>
                    </Link>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{timeago(reel.createdAt)}</span>
                </div>

                {/* Caption */}
                {caption && (
                    <div style={{ pointerEvents: 'auto' }}>
                        <p style={{
                            fontSize: 13.5, color: '#fff',
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                            lineHeight: 1.45, margin: 0,
                        }}>
                            {isLong && !captionExpanded ? caption.slice(0, 80) + '… ' : caption}
                            {isLong && (
                                <button onClick={e => { e.stopPropagation(); setCaptionExpanded(x => !x) }}
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
                                    {captionExpanded ? ' less' : 'more'}
                                </button>
                            )}
                        </p>
                    </div>
                )}

                {/* Music row */}
                <div style={{ marginTop: 8, pointerEvents: 'auto' }}>
                    <MusicTicker text={caption ? `${author.username} · Original Audio` : `${author.username} · Original Audio`} />
                </div>
            </div>

            {/* ── Progress bar ── */}
            <div
                style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 3, background: 'rgba(255,255,255,0.2)',
                    cursor: 'pointer', zIndex: 10,
                }}
                onClick={e => { e.stopPropagation(); handleSeek(e) }}
            >
                <div style={{
                    height: '100%', width: `${progress * 100}%`,
                    background: '#fff',
                    transition: 'width 0.1s linear',
                }} />
            </div>

            {/* Time */}
            <div style={{
                position: 'absolute', bottom: 8, right: 14,
                fontSize: 11, color: 'rgba(255,255,255,0.7)', zIndex: 11,
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}>
                {fmt(progress * duration)}/{fmt(duration)}
            </div>
        </div>
    )
}

/* ── Main Dscrolls Page ──────────────────────────────────── */
export default function Dscrolls() {
    const [currentIdx, setCurrentIdx] = useState(0)
    const containerRef = useRef()
    const observerRef = useRef()
    const navigate = useNavigate()

    const { data, status, fetchNextPage, hasNextPage } = useInfiniteQuery({
        queryKey: ['dscrolls'],
        queryFn: fetchDscrolls,
        getNextPageParam: (last) => last.nextCursor ?? undefined,
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const reels = data ? data.pages.flatMap((page) => page.data || []) : []
    const loading = status === 'pending'

    /* IntersectionObserver: detect which reel is in view */
    useEffect(() => {
        if (!containerRef.current) return
        const items = containerRef.current.querySelectorAll('[data-reel-item]')
        observerRef.current?.disconnect()
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const idx = Number(entry.target.dataset.reelItem)
                        setCurrentIdx(idx)
                        if (idx >= reels.length - 2 && hasNextPage) fetchNextPage()
                    }
                })
            },
            { threshold: 0.65 }
        )
        items.forEach((el) => observerRef.current.observe(el))
        return () => observerRef.current?.disconnect()
    }, [reels.length, hasNextPage, fetchNextPage])

    if (loading) return (
        <div style={{
            position: 'fixed', inset: 0, background: '#000', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div className="spinner" style={{ width: 40, height: 40, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
        </div>
    )

    if (!loading && reels.length === 0) return (
        <div style={{
            position: 'fixed', inset: 0, background: '#000', zIndex: 200,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#fff', gap: 16,
        }}>
            <div style={{ fontSize: 48 }}>🎬</div>
            <p style={{ fontSize: 18, fontWeight: 700 }}>No Dscrolls yet</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Upload a video post to see it here</p>
        </div>
    )

    return (
        /* Force true fullscreen — covers even the desktop sidebar */
        <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: '#000', overflow: 'hidden',
        }}>
            {/* Back button */}
            <button
                onClick={() => navigate(-1)}
                style={{
                    position: 'absolute', top: 16, left: 16, zIndex: 210,
                    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
                    border: 'none', borderRadius: '50%', width: 36, height: 36,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: 18,
                }}
            >←</button>

            {/* Header */}
            <div style={{
                position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
                zIndex: 210, color: '#fff', fontWeight: 700, fontSize: 15,
                letterSpacing: 0.5, textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
            }}>Dscrolls</div>

            {/* Scroll snap container */}
            <div
                ref={containerRef}
                style={{
                    height: '100dvh', overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                {reels.map((reel, i) => (
                    <div key={reel._id || i} data-reel-item={i}
                        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
                    >
                        <ReelItem
                            reel={reel}
                            isActive={currentIdx === i}
                            onPrev={() => {
                                if (i > 0) containerRef.current?.children[i - 1]?.scrollIntoView({ behavior: 'smooth' })
                            }}
                            onNext={() => {
                                if (i < reels.length - 1) containerRef.current?.children[i + 1]?.scrollIntoView({ behavior: 'smooth' })
                            }}
                            hasPrev={i > 0}
                            hasNext={i < reels.length - 1}
                        />
                    </div>
                ))}
            </div>

            {/* CSS animations */}
            <style>{`
                @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes scrollText {
                    0%, 20% { transform: translateX(0); }
                    80%, 100% { transform: translateX(-60%); }
                }
            `}</style>
        </div>
    )
}
