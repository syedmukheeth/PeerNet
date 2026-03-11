import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import {
    HiHeart, HiOutlineHeart, HiChatAlt2, HiVolumeOff, HiVolumeUp,
    HiChevronLeft, HiChevronRight, HiShare
} from 'react-icons/hi'
import { timeago } from '../utils/timeago'
import { useInfiniteQuery } from '@tanstack/react-query'

/* ── Ripple (double-tap feedback) ───────────────────────────── */
function Ripple({ side }) {
    return (
        <div style={{
            position: 'absolute',
            top: '50%', left: side === 'left' ? '25%' : '75%',
            transform: 'translate(-50%, -50%)',
            width: 80, height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            animation: 'rippleAnim 0.5s ease-out forwards',
            pointerEvents: 'none',
            zIndex: 10,
        }} />
    )
}

/* ── Individual Reel ─────────────────────────────────────────── */
function ReelItem({ reel, isActive, onPrev, onNext, hasPrev, hasNext }) {
    const videoRef = useRef()
    const [liked, setLiked] = useState(reel.isLiked || false)
    const [likesCount, setLikesCount] = useState(reel.likesCount || 0)
    const [muted, setMuted] = useState(true)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [paused, setPaused] = useState(false)
    const [ripple, setRipple] = useState(null) // 'left' | 'right' | null
    const [caption, setCaptionExpanded] = useState(false)
    const tapTimer = useRef(null)
    const tapCount = useRef(0)
    const tapSide = useRef(null)

    /* ── Auto play/pause on active ── */
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

    /* ── Progress ── */
    const handleTimeUpdate = () => {
        const v = videoRef.current
        if (v && v.duration) {
            setProgress(v.currentTime / v.duration)
            setDuration(v.duration)
        }
    }

    /* ── Double-tap seek ── */
    const SEEK_SECS = 10
    const handleTap = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const side = x < rect.width / 2 ? 'left' : 'right'
        tapSide.current = side
        tapCount.current += 1

        if (tapTimer.current) clearTimeout(tapTimer.current)
        tapTimer.current = setTimeout(() => {
            if (tapCount.current >= 2) {
                // Double tap — seek
                const v = videoRef.current
                if (v) {
                    if (side === 'left') v.currentTime = Math.max(0, v.currentTime - SEEK_SECS)
                    else v.currentTime = Math.min(v.duration, v.currentTime + SEEK_SECS)
                }
                setRipple(side)
                setTimeout(() => setRipple(null), 550)
            } else {
                // Single tap — toggle pause
                if (videoRef.current) {
                    if (videoRef.current.paused) { videoRef.current.play(); setPaused(false) }
                    else { videoRef.current.pause(); setPaused(true) }
                }
            }
            tapCount.current = 0
        }, 230)
    }, [])

    /* ── Progress bar seek ── */
    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const ratio = (e.clientX - rect.left) / rect.width
        if (videoRef.current && videoRef.current.duration) {
            videoRef.current.currentTime = ratio * videoRef.current.duration
        }
    }

    const handleLike = async (e) => {
        e.stopPropagation()
        const newLiked = !liked
        setLiked(newLiked)
        setLikesCount(newLiked ? likesCount + 1 : likesCount - 1)
        try {
            if (newLiked) await api.post(`/dscrolls/${reel._id}/like`)
            else await api.delete(`/dscrolls/${reel._id}/like`)
        } catch { setLiked(!newLiked); setLikesCount(likesCount) }
    }

    const author = reel.author || {}
    const avatar = author.avatarUrl || `https://ui-avatars.com/api/?name=${author.username}&background=6c63ff&color=fff`
    const captionText = reel.caption || ''
    const isLong = captionText.length > 80
    const displayCaption = isLong && !caption ? captionText.slice(0, 80) + '…' : captionText

    return (
        <div
            style={{ position: 'relative', height: '100dvh', background: '#000', overflow: 'hidden', flexShrink: 0 }}
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

            {/* Double-tap ripple */}
            {ripple && <Ripple side={ripple} key={Date.now()} />}

            {/* Pause icon */}
            {paused && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                }}>
                    <svg viewBox="0 0 24 24" fill="white" style={{ width: 38, height: 38 }}>
                        <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                    </svg>
                </div>
            )}

            {/* Seek hint overlays (show on hover) */}
            <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0)', transition: 'color 0.2s',
                fontSize: 36, pointerEvents: 'none',
            }} className="seek-hint-left">◀◀</div>
            <div style={{
                position: 'absolute', right: 0, top: 0, bottom: 0, width: '30%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0)', transition: 'color 0.2s',
                fontSize: 36, pointerEvents: 'none',
            }} className="seek-hint-right">▶▶</div>

            {/* Bottom gradient & info */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
                padding: '0 0 12px 0', pointerEvents: 'none',
            }}>
                {/* Author + caption */}
                <div style={{ padding: '0 16px 8px', pointerEvents: 'auto' }}>
                    <Link to={`/profile/${author._id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 8 }}
                        onClick={e => e.stopPropagation()}>
                        <img src={avatar} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff' }} />
                        <div>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: 15, letterSpacing: 0.2 }}>{author.username}</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{timeago(reel.createdAt)}</div>
                        </div>
                    </Link>
                    {captionText && (
                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
                            {displayCaption}{' '}
                            {isLong && (
                                <span onClick={e => { e.stopPropagation(); setCaptionExpanded(v => !v) }}
                                    style={{ color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 13 }}>
                                    {caption ? 'less' : 'more'}
                                </span>
                            )}
                        </p>
                    )}
                </div>

                {/* Progress bar — Instagram-style thin line */}
                <div style={{ padding: '0 4px 0' }}>
                    <div
                        onClick={e => { e.stopPropagation(); handleSeek(e) }}
                        style={{ height: 3, background: 'rgba(255,255,255,0.25)', borderRadius: 2, cursor: 'pointer', position: 'relative', margin: '0 4px' }}>
                        <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0,
                            width: `${progress * 100}%`,
                            background: '#fff', borderRadius: 2,
                            transition: 'width 0.1s linear',
                        }} />
                    </div>
                    {/* Time */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px 0', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        <span>{fmt(duration * progress)}</span>
                        <span>{fmt(duration)}</span>
                    </div>
                </div>
            </div>

            {/* Side actions */}
            <div style={{
                position: 'absolute', bottom: 100, right: 12,
                display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center',
            }} onClick={e => e.stopPropagation()}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#fff' }} onClick={handleLike}>
                    {liked
                        ? <HiHeart style={{ fontSize: 32, color: '#ff3040' }} />
                        : <HiOutlineHeart style={{ fontSize: 32 }} />}
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{likesCount}</span>
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#fff' }}>
                    <HiChatAlt2 style={{ fontSize: 30 }} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{reel.commentsCount || 0}</span>
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
                    <HiShare style={{ fontSize: 26 }} />
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }} onClick={() => setMuted(!muted)}>
                    {muted ? <HiVolumeOff style={{ fontSize: 26 }} /> : <HiVolumeUp style={{ fontSize: 26 }} />}
                </button>
            </div>

            {/* Prev / Next navigation arrows (keyboard-style) */}
            {hasPrev && (
                <button onClick={e => { e.stopPropagation(); onPrev() }} style={{
                    position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                    border: 'none', borderRadius: '50%', width: 40, height: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: 22,
                }}>
                    <HiChevronLeft />
                </button>
            )}
            {hasNext && (
                <button onClick={e => { e.stopPropagation(); onNext() }} style={{
                    position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                    border: 'none', borderRadius: '50%', width: 40, height: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: 22,
                }}>
                    <HiChevronRight />
                </button>
            )}
        </div>
    )
}

/* ── Helpers ─────────────────────────────────────────────────── */
function fmt(secs) {
    if (!secs || isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

/* ── Main Reels Page ────────────────────────────────────────── */
export default function Reels() {
    const [activeIdx, setActiveIdx] = useState(0)
    const containerRef = useRef()

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
        queryKey: ['dscrolls'],
        queryFn: async ({ pageParam = null }) => {
            const params = { limit: 5 }
            if (pageParam) params.cursor = pageParam
            const res = await api.get('/dscrolls', { params })
            return res.data
        },
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const reels = data ? data.pages.flatMap((page) => page.data || []) : []
    const loading = status === 'pending'

    useEffect(() => {
        if (reels.length > 0 && activeIdx === reels.length - 1 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
        }
    }, [activeIdx, reels.length, hasNextPage, isFetchingNextPage, fetchNextPage])

    const scrollTo = useCallback((idx) => {
        const container = containerRef.current
        if (!container) return
        const els = container.querySelectorAll('[data-idx]')
        if (els[idx]) els[idx].scrollIntoView({ behavior: 'smooth' })
        setActiveIdx(idx)
    }, [])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveIdx(Number(entry.target.dataset.idx))
                })
            },
            { threshold: 0.6, root: container },
        )
        setTimeout(() => {
            const els = container.querySelectorAll('[data-idx]')
            els.forEach(el => observer.observe(el))
        }, 100)
        return () => observer.disconnect()
    }, [reels])

    if (loading) return <div className="flex justify-center" style={{ padding: 60 }}><div className="spinner" /></div>

    if (reels.length === 0) return (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 40 }}>🎬</p>
            <p style={{ fontSize: 16, marginTop: 12, color: 'var(--text-secondary)' }}>No Dscrolls yet</p>
        </div>
    )

    return (
        <>
            <style>{`
                @keyframes rippleAnim {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
                }
            `}</style>
            <div
                ref={containerRef}
                style={{ height: '100dvh', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', margin: '-24px' }}
            >
                {reels.map((reel, i) => (
                    <div key={`${reel._id}-${i}`} data-idx={i} style={{ scrollSnapAlign: 'start' }}>
                        <ReelItem
                            reel={reel}
                            isActive={activeIdx === i}
                            hasPrev={i > 0}
                            hasNext={i < reels.length - 1 || hasNextPage}
                            onPrev={() => scrollTo(i - 1)}
                            onNext={() => scrollTo(i + 1)}
                        />
                    </div>
                ))}
                {isFetchingNextPage && (
                    <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'start', background: '#000' }}>
                        <div className="spinner" />
                    </div>
                )}
            </div>
        </>
    )
}
