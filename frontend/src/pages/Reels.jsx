import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { HiHeart, HiOutlineHeart, HiVolumeOff, HiVolumeUp, HiChatAlt2, HiShare, HiDotsHorizontal } from 'react-icons/hi'
import { timeago } from '../utils/timeago'
import { useInfiniteQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'

const fetchDscrolls = async ({ pageParam = null }) => {
    const params = { limit: 10 }
    if (pageParam) params.cursor = pageParam
    const { data } = await api.get('/dscrolls', { params })
    return data
}

/* ── Double-tap heart burst (Instagram style) ─────────── */
function HeartBurst({ x, y }) {
    return (
        <motion.div
            style={{
                position: 'absolute', left: x - 60, top: y - 60,
                width: 120, height: 120, pointerEvents: 'none', zIndex: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 90, filter: 'drop-shadow(0 2px 16px rgba(255,0,80,0.9))',
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 1.3, 1.0, 1.2], opacity: [1, 1, 1, 0] }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
        >❤️</motion.div>
    )
}

/* ── Right-side action button ────────────────────────── */
function ActionBtn({ icon, count, onClick, active, accentColor = '#FF3040' }) {
    return (
        <motion.div
            onClick={onClick}
            whileTap={{ scale: 0.80 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 0' }}
        >
            <div style={{
                fontSize: 34,
                color: active ? accentColor : '#fff',
                filter: `drop-shadow(0 1px 4px rgba(0,0,0,0.6))`,
                transition: 'color 0.15s, transform 0.15s',
                display: 'flex',
                transform: active ? 'scale(1.08)' : 'scale(1)',
            }}>
                {icon}
            </div>
            {count !== undefined && (
                <span style={{
                    fontSize: 13, fontWeight: 700, color: '#fff',
                    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                    letterSpacing: -0.3,
                }}>
                    {count > 9999 ? `${(count / 1000).toFixed(1)}k` : count}
                </span>
            )}
        </motion.div>
    )
}

/* ── Vinyl disc for music row ─────────────────────────── */
function VinylDisc({ avatarUrl }) {
    return (
        <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: avatarUrl
                ? `url(${avatarUrl}) center/cover`
                : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '2px solid rgba(255,255,255,0.5)',
            flexShrink: 0,
            animation: 'spinSlow 5s linear infinite',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            fontSize: 16,
        }}>
            {!avatarUrl && '🎵'}
        </div>
    )
}

/* ── Main reel item ─────────────────────────────────── */
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
    const lastTapPos = useRef({ x: 0, y: 0 })

    /* ── Play/Pause based on active ── */
    useEffect(() => {
        const v = videoRef.current
        if (!v) return
        if (isActive) { v.play().catch(() => { }); setPaused(false) }
        else { v.pause(); v.currentTime = 0; setProgress(0) }
    }, [isActive])

    const onTimeUpdate = () => {
        const v = videoRef.current
        if (v && v.duration) { setProgress(v.currentTime / v.duration); setDuration(v.duration) }
    }

    /* ── Single/Double tap ── */
    const handleVideoTap = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? rect.left + rect.width / 2
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? rect.top + rect.height / 2
        const x = clientX - rect.left
        const y = clientY - rect.top
        lastTapPos.current = { x, y }
        tapCount.current += 1

        clearTimeout(tapTimer.current)
        tapTimer.current = setTimeout(() => {
            if (tapCount.current >= 2) {
                // Double tap → like + heart burst
                if (!liked) {
                    setLiked(true)
                    setLikesCount(c => c + 1)
                    api.post(`/posts/${reel._id}/like`).catch(() => { setLiked(false); setLikesCount(c => c - 1) })
                }
                const id = Date.now()
                setHeartBursts(b => [...b, { id, ...lastTapPos.current }])
                setTimeout(() => setHeartBursts(b => b.filter(h => h.id !== id)), 850)
            } else {
                // Single tap → toggle pause
                const v = videoRef.current
                if (v) { if (v.paused) { v.play().catch(() => { }); setPaused(false) } else { v.pause(); setPaused(true) } }
            }
            tapCount.current = 0
        }, 220)
    }, [liked, reel._id])

    /* ── Seek via progress bar ── */
    const handleSeek = (e) => {
        e.stopPropagation()
        const rect = e.currentTarget.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        const v = videoRef.current
        if (v && v.duration) v.currentTime = ratio * v.duration
    }

    /* ── Like via button ── */
    const handleLike = (e) => {
        e.stopPropagation()
        const next = !liked
        setLiked(next)
        setLikesCount(c => next ? c + 1 : c - 1)
        ;(next ? api.post : api.delete)(`/posts/${reel._id}/like`).catch(() => { setLiked(!next); setLikesCount(c => c + (next ? -1 : 1)) })
    }

    const handleShare = (e) => {
        e.stopPropagation()
        if (navigator.share) navigator.share({ title: reel.caption || 'Dscroll', url: window.location.href })
        else navigator.clipboard.writeText(window.location.href).then(() => {}).catch(() => {})
    }

    const fmtTime = (s) => {
        if (!s || isNaN(s)) return '0:00'
        return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
    }

    const author = reel.author || {}
    const avatar = author.avatarUrl || `https://ui-avatars.com/api/?name=${author.username}&background=6c63ff&color=fff`
    const caption = reel.caption || ''
    const isLong = caption.length > 90

    return (
        <div
            style={{ position: 'relative', width: '100%', height: '100dvh', background: '#000', flexShrink: 0, overflow: 'hidden' }}
            onClick={handleVideoTap}
        >
            {/* ── Video ── */}
            <video
                ref={videoRef}
                src={reel.mediaUrl}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                loop muted={muted} playsInline preload="metadata"
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onTimeUpdate}
            />

            {/* ── Gradient overlay ── */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 20%, transparent 50%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.8) 100%)',
            }} />

            {/* ── Heart bursts ── */}
            {heartBursts.map(b => <HeartBurst key={b.id} x={b.x} y={b.y} />)}

            {/* ── Pause icon ── */}
            <AnimatePresence>
                {paused && (
                    <motion.div
                        style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                            pointerEvents: 'none', zIndex: 5,
                        }}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ duration: 0.12 }}
                    >
                        <div style={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 34, color: '#fff', paddingLeft: 4,
                        }}>▶</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Right action bar ── */}
            <div
                style={{
                    position: 'absolute', right: 12, bottom: 90,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
                    zIndex: 10,
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Author avatar with follow + */}
                <div style={{ position: 'relative', marginBottom: 4 }}>
                    <Link to={`/profile/${author._id}`} onClick={e => e.stopPropagation()}>
                        <img src={avatar} alt="" style={{
                            width: 46, height: 46, borderRadius: '50%', objectFit: 'cover',
                            border: '2px solid #fff', display: 'block',
                        }} />
                    </Link>
                    <motion.div
                        whileTap={{ scale: 0.85 }}
                        style={{
                            position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'linear-gradient(135deg,#E1306C,#F77737)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 700, border: '2px solid #000', color: '#fff',
                            cursor: 'pointer',
                        }}
                    >+</motion.div>
                </div>

                {/* Like */}
                <ActionBtn icon={liked ? <HiHeart /> : <HiOutlineHeart />} count={likesCount} onClick={handleLike} active={liked} />

                {/* Comment — placeholder */}
                <ActionBtn icon={<HiChatAlt2 />} count={reel.commentsCount || 0} onClick={e => e.stopPropagation()} active={false} />

                {/* Share */}
                <ActionBtn icon={<HiShare />} onClick={handleShare} active={false} />

                {/* Volume */}
                <ActionBtn
                    icon={muted ? <HiVolumeOff /> : <HiVolumeUp />}
                    onClick={e => { e.stopPropagation(); setMuted(m => !m) }}
                    active={false}
                />
            </div>

            {/* ── Bottom info block ── */}
            <div style={{
                position: 'absolute', bottom: 28, left: 14, right: 68,
                zIndex: 10, pointerEvents: 'none',
            }}>
                {/* Author row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, pointerEvents: 'auto' }}>
                    <Link to={`/profile/${author._id}`} onClick={e => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                        <span style={{
                            fontSize: 15, fontWeight: 700, color: '#fff',
                            textShadow: '0 1px 5px rgba(0,0,0,0.6)',
                        }}>{author.username}</span>
                    </Link>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{timeago(reel.createdAt)}</span>
                    <HiDotsHorizontal style={{ marginLeft: 'auto', fontSize: 18, color: '#fff', cursor: 'pointer', opacity: 0.8, pointerEvents: 'auto' }} onClick={e => e.stopPropagation()} />
                </div>

                {/* Caption */}
                {caption && (
                    <div style={{ marginBottom: 10, pointerEvents: 'auto' }}>
                        <p style={{
                            fontSize: 14, color: '#fff', margin: 0,
                            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                            lineHeight: 1.45,
                        }}>
                            {isLong && !captionExpanded ? caption.slice(0, 90) : caption}
                            {isLong && (
                                <>
                                    {!captionExpanded && '… '}
                                    <button
                                        onClick={e => { e.stopPropagation(); setCaptionExpanded(x => !x) }}
                                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', padding: 0 }}
                                    >{captionExpanded ? ' less' : 'more'}</button>
                                </>
                            )}
                        </p>
                    </div>
                )}

                {/* Instagram-style music row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
                    <VinylDisc avatarUrl={null} />
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{
                            whiteSpace: 'nowrap', fontSize: 13, color: '#fff', fontWeight: 500,
                            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                            animation: `scrollText 10s linear infinite`,
                        }}>
                            🎵 Original audio · {author.username}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Progress bar ── */}
            <div
                style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 2.5, background: 'rgba(255,255,255,0.22)', zIndex: 10,
                    cursor: 'pointer',
                }}
                onClick={handleSeek}
            >
                <div style={{
                    height: '100%', width: `${progress * 100}%`,
                    background: '#fff', transition: 'width 0.15s linear',
                }} />
            </div>

            {/* Time indicator */}
            <div style={{
                position: 'absolute', bottom: 7, right: 12,
                fontSize: 11, color: 'rgba(255,255,255,0.65)',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)', zIndex: 11,
            }}>
                {fmtTime(progress * duration)} / {fmtTime(duration)}
            </div>

            {/* Inline keyframes */}
            <style>{`
                @keyframes spinSlow { to { transform: rotate(360deg); } }
                @keyframes scrollText {
                    0%, 15% { transform: translateX(0); }
                    85%, 100% { transform: translateX(-55%); }
                }
            `}</style>
        </div>
    )
}

/* ── Main Dscrolls Page ─────────────────────────────── */
export default function Dscrolls() {
    const navigate = useNavigate()
    const [currentIdx, setCurrentIdx] = useState(0)
    const containerRef = useRef()
    const observerRef = useRef()

    const { data, status, fetchNextPage, hasNextPage } = useInfiniteQuery({
        queryKey: ['dscrolls'],
        queryFn: fetchDscrolls,
        getNextPageParam: (last) => last.nextCursor ?? undefined,
        staleTime: 0,
        refetchOnMount: 'always',
    })

    const reels = data?.pages.flatMap(p => p.data || []) ?? []
    const loading = status === 'pending'

    /* Intersection observer — detect active reel */
    useEffect(() => {
        if (!containerRef.current) return
        const items = containerRef.current.querySelectorAll('[data-reel]')
        observerRef.current?.disconnect()
        observerRef.current = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    const idx = Number(e.target.dataset.reel)
                    setCurrentIdx(idx)
                    if (idx >= reels.length - 2 && hasNextPage) fetchNextPage()
                }
            })
        }, { threshold: 0.65 })
        items.forEach(el => observerRef.current.observe(el))
        return () => observerRef.current?.disconnect()
    }, [reels.length, hasNextPage, fetchNextPage])

    if (loading) return (
        <div style={{
            position: 'fixed', inset: 0, background: '#000', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div className="spinner" style={{ width: 44, height: 44, borderColor: 'rgba(255,255,255,0.25)', borderTopColor: '#fff' }} />
        </div>
    )

    if (!loading && reels.length === 0) return (
        <div style={{
            position: 'fixed', inset: 0, background: '#000', zIndex: 200,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#fff', gap: 16, textAlign: 'center', padding: 32,
        }}>
            <div style={{ fontSize: 60 }}>🎬</div>
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>No Dscrolls yet</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Upload a video post to see it here</p>
            <button
                onClick={() => navigate(-1)}
                style={{ marginTop: 12, background: '#fff', color: '#000', border: 'none', borderRadius: 20, padding: '10px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
            >Go back</button>
        </div>
    )

    return (
        /* Full screen — covers sidebar on desktop too */
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000', overflow: 'hidden' }}>

            {/* Back arrow — top left, subtle */}
            <button
                onClick={() => navigate(-1)}
                style={{
                    position: 'absolute', top: 16, left: 16, zIndex: 210,
                    background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
                    border: 'none', borderRadius: '50%', width: 38, height: 38,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: 20, lineHeight: 1,
                }}
            >←</button>

            {/* Camera / New Dscroll button — top right like Instagram */}
            <button
                onClick={() => navigate('/create')}
                style={{
                    position: 'absolute', top: 16, right: 16, zIndex: 210,
                    background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
                    border: 'none', borderRadius: '50%', width: 38, height: 38,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: 22,
                }}
            >📷</button>

            {/* Scroll-snap container */}
            <div
                ref={containerRef}
                style={{
                    height: '100dvh', overflowY: 'scroll',
                    scrollSnapType: 'y mandatory', scrollbarWidth: 'none',
                }}
            >
                {reels.map((reel, i) => (
                    <div key={reel._id || i} data-reel={i}
                        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
                    >
                        <ReelItem reel={reel} isActive={currentIdx === i} />
                    </div>
                ))}
            </div>
        </div>
    )
}
