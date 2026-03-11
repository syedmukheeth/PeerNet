import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { HiHeart, HiOutlineHeart, HiVolumeOff, HiVolumeUp, HiChatAlt2, HiShare, HiArrowLeft } from 'react-icons/hi'
import { timeago } from '../utils/timeago'
import { useInfiniteQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'

const fetchDscrolls = async ({ pageParam = null }) => {
    const params = { limit: 10 }
    if (pageParam) params.cursor = pageParam
    const { data } = await api.get('/dscrolls', { params })
    return data
}

/* ── Double-tap heart burst ─────────────────────────── */
function HeartBurst({ x, y }) {
    return (
        <motion.div
            style={{
                position: 'absolute', left: x - 55, top: y - 55,
                width: 110, height: 110, pointerEvents: 'none', zIndex: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 80, filter: 'drop-shadow(0 2px 20px rgba(255,0,80,0.9))',
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 1.4, 1.1, 1.3], opacity: [1, 1, 1, 0] }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
        >❤️</motion.div>
    )
}

/* ── Action button (right sidebar) ─────────────────── */
function ActionBtn({ icon, count, onClick, active, accentColor = '#FF3040' }) {
    return (
        <motion.div
            onClick={onClick}
            whileTap={{ scale: 0.75 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', padding: '6px 0' }}
        >
            <div style={{
                fontSize: 28,
                color: active ? accentColor : '#fff',
                filter: 'drop-shadow(0 1px 5px rgba(0,0,0,0.7))',
                transition: 'color 0.15s',
                display: 'flex',
            }}>
                {icon}
            </div>
            {count !== undefined && (
                <span style={{
                    fontSize: 12, fontWeight: 700, color: '#fff',
                    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                }}>
                    {count > 9999 ? `${(count / 1000).toFixed(1)}k` : count}
                </span>
            )}
        </motion.div>
    )
}

/* ── Spinning vinyl disc ────────────────────────────── */
function VinylDisc() {
    return (
        <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg,#1a1a2e,#312060)',
            border: '2px solid rgba(255,255,255,0.4)',
            flexShrink: 0,
            animation: 'spinSlow 5s linear infinite',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}>🎵</div>
    )
}

/* ── Individual Reel item ──────────────────────────── */
function ReelItem({ reel, isActive }) {
    const videoRef = useRef()
    const [liked, setLiked] = useState(reel.isLiked || false)
    const [likesCount, setLikesCount] = useState(reel.likesCount || 0)
    const [muted, setMuted] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [showPause, setShowPause] = useState(false)
    const [paused, setPaused] = useState(false)
    const [heartBursts, setHeartBursts] = useState([])
    const [captionExpanded, setCaptionExpanded] = useState(false)
    const tapTimer = useRef(null)
    const tapCount = useRef(0)
    const pauseTimer = useRef(null)
    const lastTapPos = useRef({ x: 0, y: 0 })

    /* Play/pause based on active */
    useEffect(() => {
        const v = videoRef.current
        if (!v) return
        if (isActive) {
            v.play().catch(() => { })
            setPaused(false)
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

    /* Tap handling — single = pause, double = like + heart burst */
    const handleTap = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = (e.clientX ?? e.touches?.[0]?.clientX ?? rect.left + rect.width / 2) - rect.left
        const y = (e.clientY ?? e.touches?.[0]?.clientY ?? rect.top + rect.height / 2) - rect.top
        lastTapPos.current = { x, y }
        tapCount.current += 1

        clearTimeout(tapTimer.current)
        tapTimer.current = setTimeout(() => {
            if (tapCount.current >= 2) {
                // Double tap → like
                if (!liked) {
                    setLiked(true)
                    setLikesCount(c => c + 1)
                    api.post(`/posts/${reel._id}/like`).catch(() => { setLiked(false); setLikesCount(c => c - 1) })
                }
                const id = Date.now()
                setHeartBursts(b => [...b, { id, ...lastTapPos.current }])
                setTimeout(() => setHeartBursts(b => b.filter(h => h.id !== id)), 900)
            } else {
                // Single tap → toggle pause (show icon briefly)
                const v = videoRef.current
                if (!v) return
                if (v.paused) {
                    v.play().catch(() => { })
                    setPaused(false)
                    setShowPause(false)
                } else {
                    v.pause()
                    setPaused(true)
                    setShowPause(true)
                    clearTimeout(pauseTimer.current)
                    // Auto-hide pause indicator after 2s if stays paused
                    pauseTimer.current = setTimeout(() => setShowPause(false), 2000)
                }
            }
            tapCount.current = 0
        }, 230)
    }, [liked, reel._id])

    const handleLike = (e) => {
        e.stopPropagation()
        const next = !liked
        setLiked(next)
        setLikesCount(c => next ? c + 1 : c - 1)
        ;(next ? api.post : api.delete)(`/posts/${reel._id}/like`).catch(() => {
            setLiked(!next); setLikesCount(c => c + (next ? -1 : 1))
        })
    }

    const handleShare = (e) => {
        e.stopPropagation()
        if (navigator.share) navigator.share({ title: reel.caption || 'Dscroll', url: window.location.href })
        else navigator.clipboard.writeText(window.location.href).catch(() => { })
    }

    const handleSeek = (e) => {
        e.stopPropagation()
        const rect = e.currentTarget.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        const v = videoRef.current
        if (v?.duration) v.currentTime = ratio * v.duration
    }

    const fmtTime = (s) => {
        if (!s || isNaN(s)) return '0:00'
        return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
    }

    const author = reel.author || {}
    const avatar = author.avatarUrl || `https://ui-avatars.com/api/?name=${author.username || 'U'}&background=6c63ff&color=fff`
    const caption = reel.caption || ''
    const isLong = caption.length > 80

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
            {/* Video */}
            <video
                ref={videoRef}
                src={reel.mediaUrl}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                loop muted={muted} playsInline preload="metadata"
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onTimeUpdate}
                onClick={handleTap}
            />

            {/* Gradient overlay */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 18%, transparent 52%, rgba(0,0,0,0.45) 72%, rgba(0,0,0,0.82) 100%)',
            }} />

            {/* Tap area (covers video) */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 5 }} onClick={handleTap} />

            {/* Heart bursts */}
            {heartBursts.map(b => <HeartBurst key={b.id} x={b.x} y={b.y} />)}

            {/* Pause/Play indicator */}
            <AnimatePresence>
                {showPause && (
                    <motion.div
                        style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                            zIndex: 8, pointerEvents: 'none',
                        }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(6px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 26, color: '#fff', paddingLeft: paused ? 4 : 0,
                        }}>
                            {paused ? '▶' : '⏸'}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Right action bar */}
            <div
                style={{
                    position: 'absolute', right: 12, bottom: 100,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
                    zIndex: 10,
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Author avatar + follow button */}
                <div style={{ position: 'relative', marginBottom: 6 }}>
                    <Link to={`/profile/${author._id}`} onClick={e => e.stopPropagation()}>
                        <img src={avatar} alt="" style={{
                            width: 44, height: 44, borderRadius: '50%',
                            objectFit: 'cover', border: '2px solid #fff', display: 'block',
                        }} />
                    </Link>
                    <motion.div whileTap={{ scale: 0.8 }} style={{
                        position: 'absolute', bottom: -9, left: '50%', transform: 'translateX(-50%)',
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#E1306C,#F77737)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, border: '1.5px solid #000', color: '#fff', fontSize: 13,
                        cursor: 'pointer',
                    }}>+</motion.div>
                </div>

                <ActionBtn icon={liked ? <HiHeart /> : <HiOutlineHeart />} count={likesCount} onClick={handleLike} active={liked} />
                <ActionBtn icon={<HiChatAlt2 />} count={reel.commentsCount || 0} onClick={e => e.stopPropagation()} active={false} />
                <ActionBtn icon={<HiShare />} onClick={handleShare} active={false} />
                <ActionBtn
                    icon={muted ? <HiVolumeOff /> : <HiVolumeUp />}
                    onClick={e => { e.stopPropagation(); setMuted(m => !m) }}
                    active={false}
                />
            </div>

            {/* Bottom info */}
            <div style={{
                position: 'absolute', bottom: 30, left: 14, right: 70,
                zIndex: 10, pointerEvents: 'none',
            }}>
                {/* Author + timestamp row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, pointerEvents: 'auto' }}>
                    <Link to={`/profile/${author._id}`} onClick={e => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', textShadow: '0 1px 5px rgba(0,0,0,0.6)' }}>
                            {author.username}
                        </span>
                    </Link>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{timeago(reel.createdAt)}</span>
                </div>

                {/* Caption */}
                {caption && (
                    <p style={{
                        fontSize: 13, color: '#fff', margin: '0 0 8px',
                        textShadow: '0 1px 4px rgba(0,0,0,0.5)', lineHeight: 1.45,
                        pointerEvents: 'auto',
                    }}>
                        {isLong && !captionExpanded ? caption.slice(0, 80) : caption}
                        {isLong && (
                            <>
                                {!captionExpanded && '… '}
                                <button
                                    onClick={e => { e.stopPropagation(); setCaptionExpanded(x => !x) }}
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer', padding: 0 }}
                                >{captionExpanded ? ' less' : 'more'}</button>
                            </>
                        )}
                    </p>
                )}

                {/* Music row — Instagram style */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
                    <VinylDisc />
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{
                            whiteSpace: 'nowrap', fontSize: 12, color: '#fff', fontWeight: 500,
                            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                            animation: 'scrollText 10s linear infinite',
                        }}>
                            Original audio · {author.username}
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div
                style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 2, background: 'rgba(255,255,255,0.2)', zIndex: 10, cursor: 'pointer',
                }}
                onClick={handleSeek}
            >
                <div style={{
                    height: '100%', width: `${progress * 100}%`,
                    background: '#fff', transition: 'width 0.15s linear',
                }} />
            </div>

            {/* Time */}
            <div style={{
                position: 'absolute', bottom: 6, right: 12, fontSize: 10,
                color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 3px rgba(0,0,0,0.6)', zIndex: 11,
            }}>
                {fmtTime(progress * duration)} / {fmtTime(duration)}
            </div>

            <style>{`
                @keyframes spinSlow { to { transform: rotate(360deg); } }
                @keyframes scrollText {
                    0%,15% { transform: translateX(0); }
                    85%,100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    )
}

/* ── Dscrolls page ──────────────────────────────────── */
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

    /* Intersection observer — active reel detection */
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
        }, { threshold: 0.6 })
        items.forEach(el => observerRef.current.observe(el))
        return () => observerRef.current?.disconnect()
    }, [reels.length, hasNextPage, fetchNextPage])

    if (status === 'pending') return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 44, height: 44, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
        </div>
    )

    if (reels.length === 0) return (
        <div style={{
            position: 'fixed', inset: 0, background: '#000', zIndex: 200,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#fff', gap: 16, padding: 32, textAlign: 'center',
        }}>
            <div style={{ fontSize: 56 }}>🎬</div>
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>No Dscrolls yet</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Create a video post to see it here</p>
            <button onClick={() => navigate(-1)} style={{
                marginTop: 8, background: '#fff', color: '#000', border: 'none',
                borderRadius: 20, padding: '10px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 14,
            }}>Go back</button>
        </div>
    )

    return (
        /* Full viewport overlay */
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000' }}>

            {/* Back arrow */}
            <button
                onClick={() => navigate(-1)}
                style={{
                    position: 'absolute', top: 16, left: 16, zIndex: 220,
                    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
                    border: 'none', borderRadius: '50%', width: 36, height: 36,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: 18,
                }}
            ><HiArrowLeft /></button>

            {/*
              Desktop: centered phone-column (430px max, like Instagram web)
              Mobile: full width
            */}
            <div style={{
                height: '100dvh',
                maxWidth: 430,
                margin: '0 auto',
                position: 'relative',
            }}>
                {/* Scroll container */}
                <div
                    ref={containerRef}
                    style={{
                        height: '100%',
                        overflowY: 'scroll',
                        scrollSnapType: 'y mandatory',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                >
                    {reels.map((reel, i) => (
                        <div
                            key={reel._id || i}
                            data-reel={i}
                            style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', height: '100dvh' }}
                        >
                            <ReelItem reel={reel} isActive={currentIdx === i} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
