import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { HiPlus, HiX, HiDotsVertical, HiPlay, HiPause, HiTrash } from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'
import CreateStoryModal from './CreateStoryModal'
import { StorySkeleton } from './SkeletonLoader'
import { optimizeAvatarUrl, optimizeCloudinaryUrl, optimizeCloudinaryVideo } from '../utils/cloudinary'

// ── Story ring gradient colors ────────────────────────────────
const RING_COLORS = [
    ['#FF375F', '#FF9500'],   // Rose → Amber   (Apple accent + energy)
    ['#DD2A7B', '#F58529'],   // Instagram magenta → orange
    ['#8134AF', '#DD2A7B'],   // Instagram purple → magenta
    ['#515BD4', '#8134AF'],   // Instagram blue → purple
    ['#06C8FF', '#515BD4'],   // Cyan → blue
    ['#30D158', '#06C8FF'],   // Apple green → cyan
    ['#FFD60A', '#FF375F'],   // Gold → rose
]

// ── Animated Progress Bar (pause-aware) ──────────────────────
function ViewerProgressBar({ total, current, duration, paused, onNext }) {
    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: total }, (_, i) => (
                <div key={i} style={{
                    flex: 1, height: 3,
                    background: i < current ? '#fff' : 'rgba(255,255,255,0.3)',
                    borderRadius: 2, position: 'relative', overflow: 'hidden',
                }}>
                    {i === current && (
                        <motion.div
                            style={{ position: 'absolute', inset: 0, background: '#fff', borderRadius: 2, transformOrigin: 'left' }}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: paused ? undefined : 1 }}
                            transition={{ duration: duration / 1000, ease: 'linear' }}
                            onAnimationComplete={paused ? undefined : onNext}
                        />
                    )}
                </div>
            ))}
        </div>
    )
}

// ── Full Story Viewer ─────────────────────────────────────────
export function StoryViewer({ groups, startGroupIdx, onClose, onStoryDeleted }) {
    const { user } = useAuth()
    const [groupIdx, setGroupIdx] = useState(startGroupIdx)
    const [storyIdx, setStoryIdx] = useState(0)
    const [paused, setPaused] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)

    const group = groups[groupIdx]
    const story = group?.stories[storyIdx]
    const DURATION = story?.mediaType === 'video' ? 15000 : 5000

    const isMyStory = story?.author?._id === user?._id ||
        group?.author?._id === user?._id

    const nextStory = () => {
        setMenuOpen(false)
        if (storyIdx < group.stories.length - 1) {
            setStoryIdx(i => i + 1)
        } else if (groupIdx < groups.length - 1) {
            setGroupIdx(g => g + 1)
            setStoryIdx(0)
        } else {
            onClose()
        }
    }

    const prevStory = () => {
        setMenuOpen(false)
        if (storyIdx > 0) setStoryIdx(i => i - 1)
        else if (groupIdx > 0) { setGroupIdx(g => g - 1); setStoryIdx(0) }
    }

    const handleDelete = async () => {
        setMenuOpen(false)
        try {
            await api.delete(`/stories/${story._id}`)
            toast.success('Story deleted')
            onStoryDeleted?.()
            nextStory()
        } catch {
            toast.error('Could not delete story')
        }
    }

    const togglePause = () => {
        setPaused(p => !p)
        setMenuOpen(false)
    }

    // Reset pause when story changes
    useEffect(() => { setPaused(false); setMenuOpen(false) }, [groupIdx, storyIdx])

    if (!story) return null
    const rawAuthorAvatar = group.author.avatarUrl || `https://ui-avatars.com/api/?name=${group.author.username}&background=6366F1&color=fff`
    const authorAvatar = optimizeAvatarUrl(rawAuthorAvatar)

    return (
        <motion.div
            style={{
                position: 'fixed', inset: 0, zIndex: 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.95)',
            }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => { if (menuOpen) { setMenuOpen(false); return } onClose() }}>

            <motion.div
                style={{
                    position: 'relative', width: '100%', maxWidth: 420,
                    height: '100dvh', maxHeight: 820,
                    borderRadius: 20, overflow: 'hidden',
                    background: '#000',
                    boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
                }}
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                transition={{ duration: 0.3, ease: [0.34, 1.1, 0.64, 1] }}
                onClick={e => e.stopPropagation()}>

                {/* Media */}
                <AnimatePresence mode="wait">
                    <motion.div key={`${groupIdx}-${storyIdx}`}
                        style={{ position: 'absolute', inset: 0 }}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}>
                        {story.mediaType === 'video'
                            ? <video src={optimizeCloudinaryVideo(story.mediaUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                autoPlay muted loop />
                            : <img src={optimizeCloudinaryUrl(story.mediaUrl, 1000)} alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        }
                    </motion.div>
                </AnimatePresence>

                {/* Gradient overlays */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.4) 100%)', pointerEvents: 'none' }} />

                {/* Top bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 14px 8px', zIndex: 10 }}>
                    <ViewerProgressBar
                        total={group.stories.length}
                        current={storyIdx}
                        duration={DURATION}
                        paused={paused}
                        onNext={nextStory} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                        {/* Author */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src={authorAvatar} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.7)' }} alt="" />
                            <div>
                                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{group.author.username}</p>
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                                    {story.expiresAt ? `${Math.max(0, Math.ceil((new Date(story.expiresAt) - Date.now()) / 3600000))}h left` : 'Story'}
                                </p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            {/* Pause / Play */}
                            <button onClick={togglePause}
                                style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                                {paused
                                    ? <HiPlay style={{ color: '#fff', fontSize: 16 }} />
                                    : <HiPause style={{ color: '#fff', fontSize: 16 }} />
                                }
                            </button>

                            {/* Three-dots menu */}
                            <button onClick={() => setMenuOpen(o => !o)}
                                style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                                <HiDotsVertical style={{ color: '#fff', fontSize: 18 }} />
                            </button>

                            {/* Close */}
                            <button onClick={onClose}
                                style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                                <HiX style={{ color: '#fff', fontSize: 18 }} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Slide-up action menu ── */}
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            style={{
                                position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20,
                                background: 'rgba(15,15,20,0.92)', backdropFilter: 'blur(24px)',
                                borderTop: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '20px 20px 0 0', padding: '8px 0 28px',
                            }}
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 380, damping: 36 }}>

                            {/* Handle */}
                            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '8px auto 18px' }} />

                            {/* Pause / Resume */}
                            <button onClick={togglePause}
                                style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '14px 24px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 15, fontWeight: 500 }}>
                                {paused
                                    ? <><HiPlay style={{ fontSize: 22, opacity: 0.8 }} /> Resume story</>
                                    : <><HiPause style={{ fontSize: 22, opacity: 0.8 }} /> Pause story</>
                                }
                            </button>

                            {/* Delete — only for own stories */}
                            {isMyStory && (
                                <button onClick={handleDelete}
                                    style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '14px 24px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 15, fontWeight: 500 }}>
                                    <HiTrash style={{ fontSize: 22 }} />
                                    Delete story
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tap zones — behind the top bar */}
                <button onClick={prevStory} style={{ position: 'absolute', left: 0, top: '10%', bottom: '10%', width: '30%', background: 'none', border: 'none', cursor: 'pointer', zIndex: 1 }} />
                <button onClick={nextStory} style={{ position: 'absolute', right: 0, top: '10%', bottom: '10%', width: '30%', background: 'none', border: 'none', cursor: 'pointer', zIndex: 1 }} />
            </motion.div>
        </motion.div>
    )
}


// ── Story Item Circle ─────────────────────────────────────────
function StoryCircle({ label, avatar, ringColors, seen, onClick, isAdd, index }) {
    const [from, to] = ringColors || ['#6366F1', '#A78BFA']

    return (
        <motion.div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}
            onClick={onClick}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.22 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.93 }}>
            <div style={{ position: 'relative' }}>
                {/* Gradient ring */}
                {!isAdd && (
                    <div style={{
                        position: 'absolute', inset: -3,
                        borderRadius: '50%',
                        background: seen
                            ? `conic-gradient(from 0deg, var(--border-md) 0%, var(--border-md) 100%)`
                            : `conic-gradient(from 0deg, ${from}, ${to}, ${from})`,
                        animation: seen ? 'none' : 'rotateBorder 3s linear infinite',
                        padding: 2,
                    }} />
                )}
                <div style={{
                    position: 'relative',
                    width: 64, height: 64,
                    borderRadius: '50%',
                    background: 'var(--bg)',
                    padding: 2.5,
                    zIndex: 1,
                }}>
                    <img src={avatar} alt={label}
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                    {isAdd && (
                        <div style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366F1, #A78BFA)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2.5px solid var(--bg)',
                            boxShadow: '0 2px 8px rgba(99,102,241,0.5)',
                        }}>
                            <HiPlus style={{ color: '#fff', fontSize: 12 }} />
                        </div>
                    )}
                </div>
            </div>
            <span style={{
                fontSize: 11, color: seen ? 'var(--text-3)' : 'var(--text-2)',
                fontWeight: 500, maxWidth: 64, textAlign: 'center',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{label}</span>
        </motion.div>
    )
}

// ── Main StoryRail Component ──────────────────────────────────
export default function StoryRail() {
    const { user } = useAuth()
    const [stories, setStories] = useState([])
    const [viewerGroup, setViewerGroup] = useState(null)
    const [showCreate, setShowCreate] = useState(false)

    const [loading, setLoading] = useState(true)

    const loadStories = async () => {
        setLoading(true)
        try {
            const { data } = await api.get('/stories')
            setStories(data.data || [])
        } catch { /* silent */ }
        finally { setLoading(false) }
    }

    useEffect(() => { loadStories() }, [])

    // Group stories by author, excluding your own
    const groups = Object.values(
        stories.reduce((acc, s) => {
            const id = s.author._id
            if (!acc[id]) acc[id] = { author: s.author, stories: [] }
            acc[id].stories.push(s)
            return acc
        }, {})
    )

    const userAvatar = user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=6366F1&color=fff`

    return (
        <>
            {/* ── Scrollable Rail ── */}
            <div style={{
                display: 'flex', gap: 14,
                overflowX: 'auto', padding: '4px 4px 16px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
            }}>
                {loading && stories.length === 0 ? (
                    <StorySkeleton />
                ) : (
                    <>
                        {/* "Your story" / add button */}
                        <StoryCircle
                            label="Your story"
                            avatar={userAvatar}
                            ringColors={null}
                            isAdd={true}
                            seen={false}
                            index={0}
                            onClick={() => setShowCreate(true)}
                        />

                        {groups.map((g, i) => {
                            const rawAvatarUrl = g.author.avatarUrl || `https://ui-avatars.com/api/?name=${g.author.username}&background=6366F1&color=fff`
                            return (
                                <StoryCircle
                                    key={g.author._id}
                                    label={g.author.username}
                                    avatar={optimizeAvatarUrl(rawAvatarUrl)}
                                    ringColors={RING_COLORS[i % RING_COLORS.length]}
                                    seen={g.stories.every(s => s.viewedByMe)}
                                    index={i + 1}
                                    onClick={() => setViewerGroup({ groups, startIdx: i })}
                                />
                            )
                        })}
                    </>
                )}
            </div>

            {/* Divider */}
            <div className="divider" style={{ marginBottom: 20 }} />

            {/* ── Story Viewer overlay ── */}
            <AnimatePresence>
                {viewerGroup && (
                    <StoryViewer
                        groups={viewerGroup.groups}
                        startGroupIdx={viewerGroup.startIdx}
                        onClose={() => setViewerGroup(null)}
                        onStoryDeleted={loadStories}
                    />
                )}
            </AnimatePresence>

            {/* ── Create Story Modal ── */}
            {showCreate && (
                <CreateStoryModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={loadStories}
                />
            )}
        </>
    )
}
