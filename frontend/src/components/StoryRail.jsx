import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { HiPlus, HiX, HiDotsVertical, HiPlay, HiPause, HiTrash } from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'
import CreateStoryModal from './CreateStoryModal'
import { StorySkeleton } from './SkeletonLoader'
import { optimizeAvatarUrl, optimizeCloudinaryUrl, optimizeCloudinaryVideo } from '../utils/cloudinary'

// ── Animated Progress Bar ────────────────────────────────────
function ViewerProgressBar({ total, current, duration, paused, onNext }) {
    return (
        <div className="story-progress-row">
            {Array.from({ length: total }, (_, i) => (
                <div key={i} className="story-progress-item" style={{
                    background: i < current ? '#fff' : 'rgba(255,255,255,0.3)',
                }}>
                    {i === current && (
                        <motion.div
                            className="story-progress-fill"
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

    useEffect(() => { setPaused(false); setMenuOpen(false) }, [groupIdx, storyIdx])

    if (!story) return null
    const rawAuthorAvatar = group.author.avatarUrl || `https://ui-avatars.com/api/?name=${group.author.username}&background=6366F1&color=fff`
    const authorAvatar = optimizeAvatarUrl(rawAuthorAvatar)

    return (
        <motion.div
            className="story-viewer-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => { if (menuOpen) { setMenuOpen(false); return } onClose() }}>

            <motion.div
                className="story-viewer-container"
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                transition={{ duration: 0.3, ease: [0.34, 1.1, 0.64, 1] }}
                onClick={e => e.stopPropagation()}>

                {/* Media / Content */}
                <AnimatePresence mode="wait">
                    <motion.div key={`${groupIdx}-${storyIdx}`}
                        className="story-media-container"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}>
                        {story.mediaType === 'text' ? (() => {
                            const fontClasses = { Modern: 'font-modern', Classic: 'font-classic', Neon: 'font-neon', Strong: 'font-strong' }
                            const fontClass = fontClasses[story.fontFamily] || 'font-modern'
                            
                            const calcFontSize = (content) => {
                                const len = content?.length || 0
                                if (len < 20) return '42px'
                                if (len < 50) return '32px'
                                if (len < 100) return '24px'
                                return '18px'
                            }

                            return (
                                <div className="story-text-container" style={{ background: story.backgroundColor || '#000' }}>
                                    <h1 className={fontClass} style={{
                                        fontSize: calcFontSize(story.content),
                                        textAlign: story.textAlign || 'center',
                                        fontWeight: story.isBold ? 900 : 400,
                                        color: story.textColor || '#fff',
                                        lineHeight: 1.25,
                                        margin: 0,
                                        wordBreak: 'break-word'
                                    }}>
                                        {story.content}
                                    </h1>
                                </div>
                            )
                        })()
                                 : story.mediaType === 'video' ? (
                                    <video src={optimizeCloudinaryVideo(story.mediaUrl)} 
                                        className="story-media"
                                        style={{ boxShadow: 'var(--shadow-specular)', filter: paused ? 'brightness(0.8)' : 'none' }}
                                        autoPlay muted loop playsInline
                                        ref={el => {
                                            if (el) {
                                                if (paused) el.pause()
                                                else el.play().catch(() => {})
                                            }
                                        }} />
                                ) : (
                                    <img src={optimizeCloudinaryUrl(story.mediaUrl, 1000)} alt=""
                                        className="story-media"
                                        style={{ boxShadow: 'var(--shadow-specular)' }} />
                                )}
                    </motion.div>
                </AnimatePresence>

                {/* Overlays */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.4) 100%)', pointerEvents: 'none' }} />

                {/* Top bar */}
                <div className="story-top-bar">
                    <ViewerProgressBar
                        total={group.stories.length}
                        current={storyIdx}
                        duration={DURATION}
                        paused={paused}
                        onNext={nextStory} />

                    <div className="story-header">
                        <div className="story-author">
                            <img src={authorAvatar} className="story-author-avatar" alt="" />
                            <div className="story-author-info">
                                <p className="t-h3 m-0" style={{ color: '#fff' }}>{group.author.username}</p>
                                <p className="t-caption m-0" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    {story.expiresAt ? `${Math.max(0, Math.ceil((new Date(story.expiresAt) - Date.now()) / 3600000))}h left` : 'Story'}
                                </p>
                            </div>
                        </div>

                        <div className="story-controls">
                            <button onClick={togglePause} className="story-control-btn">
                                {paused ? <HiPlay size={18} color="#fff" /> : <HiPause size={18} color="#fff" />}
                            </button>
                            <button onClick={() => setMenuOpen(o => !o)} className="story-control-btn">
                                <HiDotsVertical size={18} color="#fff" />
                            </button>
                            <button onClick={onClose} className="story-control-btn">
                                <HiX size={18} color="#fff" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Action menu */}
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            className="story-action-sheet"
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
                            <div className="story-sheet-handle" />
                            <button onClick={togglePause} className="story-sheet-item">
                                {paused ? <><HiPlay size={20} /> Resume</> : <><HiPause size={20} /> Pause</>}
                            </button>
                            {isMyStory && (
                                <button onClick={handleDelete} className="story-sheet-item" style={{ color: 'var(--error)' }}>
                                    <HiTrash size={20} /> Delete story
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tap zones */}
                <button onClick={prevStory} className="story-tap-zone story-tap-left" />
                <button onClick={nextStory} className="story-tap-zone story-tap-right" />
            </motion.div>
        </motion.div>
    )
}


// ── Story Item Circle ─────────────────────────────────────────
function StoryCircle({ label, avatar, seen, onClick, isAdd, index }) {
    return (
        <motion.div
            className="story-item"
            onClick={onClick}
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: index * 0.04 
            }}
            whileHover={{ y: -4, scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
        >
            <div className="story-avatar-wrap">
                <div className={`story-ring${seen ? ' story-ring--seen' : ''}`}>
                    <div className="story-inner">
                        <img src={avatar} alt={label} loading="lazy" />
                    </div>
                </div>
                {isAdd && (
                    <div className="story-add-badge">
                        <HiPlus size={12} color="#fff" />
                    </div>
                )}
            </div>
            <span className={`story-name${seen ? ' story-name--seen' : ''}`}>
                {label}
            </span>
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
        <div className="story-rail-wrap">
            <div className="story-rail">
                {loading && stories.length === 0 ? (
                    <StorySkeleton />
                ) : (
                    <>
                        <StoryCircle
                            label="Your story"
                            avatar={optimizeAvatarUrl(userAvatar)}
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
                                    seen={g.stories.every(s => s.viewedByMe)}
                                    index={i + 1}
                                    onClick={() => setViewerGroup({ groups, startIdx: i })}
                                />
                            )
                        })}
                    </>
                )}
            </div>

            <div className="divider mt-4 opacity-10" />

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

            {showCreate && (
                <CreateStoryModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={loadStories}
                />
            )}
        </div>
    )
}
