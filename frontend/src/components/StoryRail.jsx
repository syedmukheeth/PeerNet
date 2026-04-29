import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { HiPlus, HiX, HiDotsVertical, HiPlay, HiPause, HiTrash } from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'
import CreateStoryModal from './CreateStoryModal'

// Import new Instagram styles
import './StoryRail.css'

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
                                <div className="flex items-center justify-center w-full h-full p-8" style={{ background: story.backgroundColor || '#000' }}>
                                    <h1 className={fontClass} style={{
                                        fontSize: calcFontSize(story.content),
                                        textAlign: story.textAlign || 'center',
                                        fontWeight: 900,
                                        color: story.textColor || '#fff',
                                        lineHeight: 1.25,
                                        margin: 0,
                                        wordBreak: 'break-word'
                                    }}>
                                        {story.content}
                                    </h1>
                                </div>
                            )
                        })() : (
                            <div className="relative w-full h-full bg-black flex items-center justify-center">
                                {story.mediaType === 'video' ? (
                                    <video src={optimizeCloudinaryVideo(story.mediaUrl)} 
                                        className="story-media"
                                        autoPlay muted loop playsInline
                                        ref={el => {
                                            if (el) {
                                                if (paused) el.pause()
                                                else el.play().catch(() => {})
                                            }
                                        }} />
                                ) : (
                                    <img src={optimizeCloudinaryUrl(story.mediaUrl, 1200)} alt=""
                                        className="story-media" />
                                )}

                                {/* Hybrid Text Overlay - FIXED Z-INDEX & VISIBILITY */}
                                {story.content && (
                                    <div className="absolute inset-0 z-[150] flex items-center justify-center p-12 pointer-events-none">
                                        {/* Bottom Scrim for text depth */}
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent z-[-1]" />
                                        
                                        <motion.h1 
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={(() => {
                                                const fontClasses = { Modern: 'font-modern', Classic: 'font-classic', Neon: 'font-neon', Strong: 'font-strong' }
                                                return fontClasses[story.fontFamily] || 'font-modern'
                                            })()}
                                            style={{
                                                fontSize: story.content.length < 40 ? '36px' : '22px',
                                                textAlign: story.textAlign || 'center',
                                                fontWeight: 900,
                                                color: story.textColor || '#fff',
                                                lineHeight: 1.1,
                                                textShadow: '0 8px 30px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.5)',
                                                zIndex: 160,
                                                margin: 0,
                                                wordBreak: 'break-word',
                                                maxWidth: '90%'
                                            }}
                                        >
                                            {story.content}
                                        </motion.h1>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Top bar (voter over everything) */}
                <div className="story-top-bar" style={{ zIndex: 200 }}>
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
                                <p className="t-h3 m-0" style={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{group.author.username}</p>
                                <p className="t-caption m-0" style={{ color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                                    {story.expiresAt ? `${Math.max(0, Math.ceil((new Date(story.expiresAt) - Date.now()) / 3600000))}h left` : 'Story'}
                                </p>
                            </div>
                        </div>

                        <div className="story-controls">
                            <button onClick={togglePause} className="story-control-btn">
                                {paused ? <HiPlay size={20} color="#fff" /> : <HiPause size={20} color="#fff" />}
                            </button>
                            <button onClick={() => setMenuOpen(o => !o)} className="story-control-btn">
                                <HiDotsVertical size={20} color="#fff" />
                            </button>
                            <button onClick={onClose} className="story-control-btn">
                                <HiX size={20} color="#fff" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Action menu */}
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            className="story-action-sheet"
                            style={{ zIndex: 300 }}
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
                <button onClick={prevStory} className="story-tap-zone story-tap-left" style={{ zIndex: 100 }} />
                <button onClick={nextStory} className="story-tap-zone story-tap-right" style={{ zIndex: 100 }} />
            </motion.div>
        </motion.div>
    )
}


// ── Story Item Circle ─────────────────────────────────────────
function StoryCircle({ label, avatar, seen, onClick, isAdd, index, hasStory }) {
    return (
        <motion.div
            className="story-item"
            onClick={onClick}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
                type: "spring",
                stiffness: 400,
                damping: 30,
                delay: index * 0.05 
            }}
        >
            <div className="story-avatar-container">
                <div className={`story-ring-vibrant ${seen ? 'seen' : ''} ${(!hasStory && !isAdd) || (isAdd && !hasStory) ? 'hidden-ring' : ''}`}>
                    <div className="story-avatar-inner">
                        <img src={avatar} alt={label} draggable={false} />
                    </div>
                </div>
                {isAdd && (
                    <div className="story-add-button-ig">
                        <HiPlus size={14} />
                    </div>
                )}
            </div>
            <span className={`story-label-ig ${seen ? 'seen' : ''}`}>
                {isAdd ? 'Your story' : label}
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

    const userGroupIdx = groups.findIndex(g => g.author._id === user?._id)
    const hasUserStory = userGroupIdx !== -1

    return (
        <div className="story-rail-wrap">
            <div className="story-rail">
                {!loading && (
                    <StoryCircle
                        label="Your story"
                        avatar={optimizeAvatarUrl(userAvatar)}
                        isAdd={true}
                        seen={hasUserStory ? groups[userGroupIdx].stories.every(s => s.viewedByMe) : false}
                        hasStory={hasUserStory}
                        index={0}
                        onClick={() => {
                            if (hasUserStory) setViewerGroup({ groups, startIdx: userGroupIdx })
                            else setShowCreate(true)
                        }}
                    />
                )}

                {!loading && groups.map((g, i) => {
                    if (g.author._id === user?._id) return null // Skip own story here as it's first
                    const rawAvatarUrl = g.author.avatarUrl || `https://ui-avatars.com/api/?name=${g.author.username}&background=6366F1&color=fff`
                    return (
                        <StoryCircle
                            key={g.author._id}
                            label={g.author.username}
                            avatar={optimizeAvatarUrl(rawAvatarUrl)}
                            seen={g.stories.every(s => s.viewedByMe)}
                            hasStory={true}
                            index={i + 1}
                            onClick={() => setViewerGroup({ groups, startIdx: i })}
                        />
                    )
                })}
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
