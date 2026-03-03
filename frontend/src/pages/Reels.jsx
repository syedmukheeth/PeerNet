import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { HiHeart, HiOutlineHeart, HiChatAlt2, HiVolumeOff, HiVolumeUp } from 'react-icons/hi'
import { timeago } from '../utils/timeago'

function ReelItem({ reel, isActive }) {
    const videoRef = useRef()
    const [liked, setLiked] = useState(reel.isLiked || false)
    const [likesCount, setLikesCount] = useState(reel.likesCount || 0)
    const [muted, setMuted] = useState(true)

    useEffect(() => {
        if (!videoRef.current) return
        if (isActive) videoRef.current.play().catch(() => { })
        else { videoRef.current.pause(); videoRef.current.currentTime = 0 }
    }, [isActive])

    const handleLike = async () => {
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

    return (
        <div style={{ position: 'relative', height: 'calc(100dvh - 48px)', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <video
                ref={videoRef}
                src={reel.mediaUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loop muted={muted} playsInline
            />

            {/* Overlay bottom */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 16px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)'
            }}>
                <div className="flex items-center gap-10" style={{ marginBottom: 8 }}>
                    <Link to={`/profile/${author._id}`}>
                        <img src={avatar} className="avatar avatar-md avatar-story" alt="" />
                    </Link>
                    <div>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>{author.username}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{timeago(reel.createdAt)}</div>
                    </div>
                </div>
                {reel.caption && <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.5 }}>{reel.caption}</p>}
            </div>

            {/* Side actions */}
            <div style={{ position: 'absolute', bottom: 100, right: 16, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#fff' }}
                    onClick={handleLike}>
                    {liked
                        ? <HiHeart style={{ fontSize: 30, color: 'var(--danger)' }} />
                        : <HiOutlineHeart style={{ fontSize: 30 }} />
                    }
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{likesCount}</span>
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#fff' }}>
                    <HiChatAlt2 style={{ fontSize: 28 }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{reel.commentsCount || 0}</span>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}
                    onClick={() => setMuted(!muted)}>
                    {muted ? <HiVolumeOff style={{ fontSize: 26 }} /> : <HiVolumeUp style={{ fontSize: 26 }} />}
                </button>
            </div>
        </div>
    )
}

export default function Reels() {
    const [reels, setReels] = useState([])
    const [activeIdx, setActiveIdx] = useState(0)
    const [loading, setLoading] = useState(true)
    const containerRef = useRef()

    useEffect(() => {
        api.get('/dscrolls').then(({ data }) => setReels(data.data || [])).finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveIdx(Number(entry.target.dataset.idx))
                    }
                })
            },
            { threshold: 0.6, root: container },
        )
        container.querySelectorAll('[data-idx]').forEach(el => observer.observe(el))
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
        <div ref={containerRef} style={{ height: 'calc(100dvh - 48px)', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', margin: '-24px' }}>
            {reels.map((reel, i) => (
                <div key={reel._id} data-idx={i} style={{ scrollSnapAlign: 'start' }}>
                    <ReelItem reel={reel} isActive={activeIdx === i} />
                </div>
            ))}
        </div>
    )
}
