import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { HiHeart, HiOutlineHeart, HiVolumeOff, HiVolumeUp, HiChatAlt2, HiShare, HiArrowLeft, HiRefresh, HiMoon, HiSun } from 'react-icons/hi'
import { timeago } from '../utils/timeago'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

const fetchShorts = async ({ pageParam = null }) => {
    const params = { limit: 10, _t: Date.now() }
    if (pageParam) params.cursor = pageParam
    const { data } = await api.get('/shorts', { params })
    return data
}

function HeartBurst({ x, y }) {
    return (
        <motion.div
            className="heart-burst-overlay"
            style={{ left: x - 55, top: y - 55, position: 'absolute', fontSize: 80, zIndex: 30 }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 1.4, 1.1, 1.3], opacity: [1, 1, 1, 0] }}
            transition={{ duration: 0.75 }}
        >❤️</motion.div>
    )
}

function ActionBtn({ icon, label, onClick, active }) {
    return (
        <motion.div 
            className={`shorts-action-btn ${active ? 'active' : ''}`}
            onClick={onClick} 
            whileTap={{ scale: 0.85 }}
        >
            <div className="shorts-action-icon">{icon}</div>
            {label !== undefined && <span className="shorts-action-label">{label}</span>}
        </motion.div>
    )
}

function ShortsItem({ short, isActive }) {
    const videoRef = useRef()
    const [liked, setLiked] = useState(short.isLiked || false)
    const [likesCount, setLikesCount] = useState(short.likesCount || 0)
    const pendingLike = useRef(false)
    const localLiked = useRef(null)
    const localCount = useRef(null)
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

    useEffect(() => {
        if (localLiked.current !== null) {
            setLiked(localLiked.current)
            setLikesCount(localCount.current)
        } else {
            setLiked(short.isLiked || false)
            setLikesCount(short.likesCount || 0)
        }
    }, [short.isLiked, short.likesCount])

    useEffect(() => {
        const v = videoRef.current
        if (!v) return
        if (isActive) {
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
        if (v?.duration) { 
            setProgress(v.currentTime / v.duration)
            setDuration(v.duration) 
        }
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
                    api.post(`/shorts/${short._id}/like`)
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
        }, 220)
    }, [liked, likesCount, short._id])

    const handleLike = (e) => {
        if (e) e.stopPropagation()
        if (pendingLike.current) return
        const next = !liked
        const nextCount = next ? likesCount + 1 : likesCount - 1
        localLiked.current = next
        localCount.current = nextCount
        setLiked(next)
        setLikesCount(nextCount)
        pendingLike.current = true
        ;(next ? api.post : api.delete)(`/shorts/${short._id}/like`)
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
        const url = `${window.location.origin}/posts/${short._id}`
        if (navigator.share) navigator.share({ url }).catch(() => {})
        else { navigator.clipboard.writeText(url).catch(() => {}); }
    }

    const handleSeek = (e) => {
        e.stopPropagation()
        const rect = e.currentTarget.getBoundingClientRect()
        const v = videoRef.current
        if (v?.duration) v.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * v.duration
    }

    const formatTime = (s) => !s || isNaN(s) ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
    const author = short.author || {}
    const avatar = author.avatarUrl || `https://ui-avatars.com/api/?name=${author.username || 'U'}&background=6c63ff&color=fff`
    const caption = short.caption || ''

    return (
        <div className="shorts-item-root">
            {videoError ? (
                <div className="shorts-status-overlay">
                    <div style={{ fontSize: 40 }}>⚠️</div>
                    <div style={{ fontWeight: 600 }}>Video unavailable</div>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    src={short.mediaUrl}
                    loop
                    muted={muted}
                    playsInline
                    preload="auto"
                    onTimeUpdate={onTimeUpdate}
                    onLoadedMetadata={onTimeUpdate}
                    onError={() => setVideoError(true)}
                    className="shorts-video-bg"
                />
            )}

            <div className="shorts-ui-gradient" />
            <div className="shorts-tap-zone" style={{ position: 'absolute', inset: 0, zIndex: 5 }} onClick={handleTap} />

            {heartBursts.map(b => <HeartBurst key={b.id} x={b.x} y={b.y} />)}

            <AnimatePresence>
                {showPause && (
                    <motion.div
                        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 8, pointerEvents: 'none' }}
                        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    >
                        <div style={{
                            width: 60, height: 60, borderRadius: '50%', background: 'rgba(0,0,0,0.8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', paddingLeft: 4,
                        }}>▶</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Right Action Bar */}
            <div className="shorts-side-actions" onClick={e => e.stopPropagation()}>
                <Link to={`/profile/${author._id}`} onClick={e => e.stopPropagation()}>
                    <img src={avatar} alt="" className="shorts-author-avatar" />
                </Link>
                <ActionBtn 
                    icon={liked ? <HiHeart /> : <HiOutlineHeart />} 
                    label={likesCount > 9999 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount} 
                    onClick={handleLike} 
                    active={liked} 
                />
                <ActionBtn 
                    icon={<HiChatAlt2 />} 
                    label={short.commentsCount || 0} 
                    onClick={e => e.stopPropagation()} 
                />
                <ActionBtn 
                    icon={<HiShare />} 
                    onClick={handleShare} 
                />
                <ActionBtn 
                    icon={muted ? <HiVolumeOff /> : <HiVolumeUp />} 
                    onClick={e => { e.stopPropagation(); setMuted(m => !m) }} 
                />
            </div>

            {/* Bottom Info */}
            <div className="shorts-bottom-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, pointerEvents: 'auto' }}>
                    <Link to={`/profile/${author._id}`} style={{ textDecoration: 'none' }}>
                        <span className="shorts-author-name">{author.username}</span>
                    </Link>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>• {timeago(short.createdAt)}</span>
                </div>
                {caption && (
                    <p className="shorts-caption">
                        {caption.length > 80 && !captionExpanded ? caption.slice(0, 80) : caption}
                        {caption.length > 80 && (
                            <button onClick={e => { e.stopPropagation(); setCaptionExpanded(x => !x) }}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', paddingLeft: 6, fontWeight: 700 }}>
                                {captionExpanded ? 'less' : '...more'}
                            </button>
                        )}
                    </p>
                )}
            </div>

            {/* Progress Bar */}
            <div className="shorts-progress-bar" onClick={handleSeek}>
                <div className="shorts-progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <div style={{ position: 'absolute', bottom: 6, right: 12, fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, zIndex: 11 }}>
                {formatTime(progress * duration)} / {formatTime(duration)}
            </div>
        </div>
    )
}

export default function Shorts() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { isDark, toggle } = useTheme()
    const [currentIdx, setCurrentIdx] = useState(0)
    const containerRef = useRef()
    const observerRef = useRef()

    const { data, status, fetchNextPage, hasNextPage, refetch } = useInfiniteQuery({
        queryKey: ['shorts'],
        queryFn: fetchShorts,
        getNextPageParam: (last) => last.nextCursor ?? undefined,
        staleTime: 30_000,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
    })

    const shorts = data?.pages.flatMap(p => p.data || []) ?? []

    useEffect(() => {
        if (!containerRef.current) return
        const items = containerRef.current.querySelectorAll('[data-short]')
        observerRef.current?.disconnect()
        observerRef.current = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    const idx = Number(e.target.dataset.short)
                    setCurrentIdx(idx)
                    if (idx >= shorts.length - 2 && hasNextPage) fetchNextPage()
                }
            })
        }, { threshold: 0.6 })
        items.forEach(el => observerRef.current.observe(el))
        return () => observerRef.current?.disconnect()
    }, [shorts.length, hasNextPage, fetchNextPage])

    if (status === 'pending') return (
        <div className="shorts-viewer-overlay">
            <div className="shorts-phone-wrapper skeleton !bg-surface-2 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <div className="absolute bottom-12 left-6 right-20 space-y-4 z-10">
                    <div className="skeleton h-6 w-1/3 rounded-md" />
                    <div className="space-y-2">
                        <div className="skeleton h-4 w-full rounded-md opacity-40" />
                        <div className="skeleton h-4 w-2/3 rounded-md opacity-20" />
                    </div>
                </div>
                <div className="absolute right-4 bottom-28 space-y-8 z-10">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="skeleton size-12 rounded-full" />
                            <div className="skeleton h-2 w-6 rounded-sm opacity-20" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    if (shorts.length === 0) return (
        <div className="shorts-viewer-overlay" style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, gap: 16 }}>
            <div style={{ fontSize: 64, filter: 'drop-shadow(0 0 12px var(--accent-muted, rgba(99,102,241,0.3)))' }}>🎬</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>No Shorts Found</h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 300, margin: 0, lineHeight: 1.5 }}>
                Be the first to share a video! Tap the create button to start.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button onClick={() => refetch()} style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 24, padding: '12px 24px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
                    <HiRefresh size={18} /> Retry
                </button>
                <button onClick={() => navigate(-1)} style={{ background: 'var(--text-primary)', color: 'var(--bg)', border: 'none', borderRadius: 24, padding: '12px 32px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                    Go Back
                </button>
            </div>
        </div>
    )

    return (
        <div className="shorts-viewer-overlay">
            <div className="shorts-phone-wrapper">
                {/* Header Actions */}
                <div className="shorts-header-actions">
                    <motion.button 
                        onClick={() => navigate(-1)}
                        className="shorts-pill-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <HiArrowLeft size={18} />
                        <span>Back</span>
                    </motion.button>

                    <motion.button 
                         onClick={() => queryClient.invalidateQueries({ queryKey: ['shorts'] })}
                         className="shorts-icon-btn"
                         whileHover={{ rotate: 180 }}
                         transition={{ duration: 0.4 }}
                    >
                        <HiRefresh size={20} />
                    </motion.button>

                    <motion.button
                        onClick={toggle}
                        className="shorts-icon-btn"
                        title="Toggle theme"
                        whileTap={{ scale: 0.9 }}
                    >
                        {isDark ? <HiSun size={20} /> : <HiMoon size={20} />}
                    </motion.button>
                </div>

                <div ref={containerRef} className="shorts-scroll-container">
                    {shorts.map((short, i) => (
                        <div key={short._id || i} data-short={i}>
                            <ShortsItem short={short} isActive={currentIdx === i} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
