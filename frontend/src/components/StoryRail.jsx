import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { HiPlus, HiX, HiDotsVertical, HiPlay, HiPause, HiTrash } from './ui/icons'
import api from '../api/axios'
import toast from 'react-hot-toast'
import CreateStoryModal from './CreateStoryModal'

// Import new Instagram styles

import { optimizeAvatarUrl, optimizeCloudinaryUrl, optimizeCloudinaryVideo } from '../utils/cloudinary'
import avatarFallback from './ui/avatarFallback'

/*
 * Progress bar. Purely a display of `progress` (0..1).
 *
 * Advancement used to be driven by this component's onAnimationComplete, which
 * had two problems: `animate={{ scaleX: paused ? undefined : 1 }}` does not
 * actually pause a running animation, so the pause button did not stop the
 * story; and under prefers-reduced-motion the stylesheet zeroes every duration,
 * so the animation "completed" immediately and the whole set of stories flashed
 * past in a fraction of a second. The owning component now runs a real clock.
 */
function ViewerProgressBar({ total, current, progress }) {
    return (
        <div className="story-progress-row">
            {Array.from({ length: total }, (_, i) => (
                <div key={i} className="story-progress-item" style={{
                    background: i < current ? '#fff' : 'rgba(255,255,255,0.3)',
                }}>
                    {i === current && (
                        <div
                            className="story-progress-fill"
                            style={{ transform: `scaleX(${progress})`, transformOrigin: 'left' }}
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

    /*
     * Story clock. Tracks elapsed time explicitly so that pausing genuinely
     * stops the story and resuming continues from where it left off, and so
     * that progression is independent of any CSS animation. rAF rather than an
     * interval, so it stops while the tab is backgrounded instead of racing
     * through the whole set when the user returns.
     */
    const [progress, setProgress] = useState(0)
    const elapsedRef = useRef(0)

    useEffect(() => {
        elapsedRef.current = 0
        setProgress(0)
    }, [groupIdx, storyIdx])

    useEffect(() => {
        if (paused) return

        let frame
        let last = performance.now()

        const tick = (now) => {
            elapsedRef.current += now - last
            last = now
            const ratio = Math.min(1, elapsedRef.current / DURATION)
            setProgress(ratio)
            if (ratio >= 1) nextStory()
            else frame = requestAnimationFrame(tick)
        }

        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paused, groupIdx, storyIdx, DURATION])

    // Keyboard control. The viewer covers the whole screen and was mouse- and
    // touch-only: no way to close it, advance, or go back from the keyboard.
    useEffect(() => {
        const onKeyDown = (e) => {
            switch (e.key) {
                case 'Escape':
                    if (menuOpen) setMenuOpen(false)
                    else onClose()
                    break
                case 'ArrowRight':
                    nextStory()
                    break
                case 'ArrowLeft':
                    prevStory()
                    break
                case ' ':
                    e.preventDefault()
                    togglePause()
                    break
                default:
            }
        }
        document.addEventListener('keydown', onKeyDown)

        // The overlay sits above the page, so the document behind it must not
        // scroll underneath.
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = previousOverflow
        }
    })

    // Move focus into the viewer when it opens, and restore it on close.
    const containerRef = useRef(null)
    useEffect(() => {
        const previouslyFocused = document.activeElement
        containerRef.current?.focus()
        return () => previouslyFocused?.focus?.()
    }, [])

    if (!story) return null
    const rawAuthorAvatar = group.author.avatarUrl || avatarFallback(group.author.username)
    const authorAvatar = optimizeAvatarUrl(rawAuthorAvatar)

    return (
        <motion.div
            className="story-viewer-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => { if (menuOpen) { setMenuOpen(false); return } onClose() }}>

            <motion.div
                ref={containerRef}
                role="dialog"
                aria-modal="true"
                aria-label={`Stories from ${group.author.username}`}
                tabIndex={-1}
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
                        progress={progress} />

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
                            <button onClick={togglePause} className="story-control-btn" aria-label={paused ? 'Resume story' : 'Pause story'}>
                                {paused ? <HiPlay size={20} color="#fff" /> : <HiPause size={20} color="#fff" />}
                            </button>
                            <button onClick={() => setMenuOpen(o => !o)} className="story-control-btn" aria-label="Story options" aria-expanded={menuOpen}>
                                <HiDotsVertical size={20} color="#fff" />
                            </button>
                            <button onClick={onClose} className="story-control-btn" aria-label="Close stories">
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

                {/* Tap zones. These were empty <button> elements with no
                    children and no label, so a screen reader announced two
                    anonymous buttons and gave no way to move between stories. */}
                <button
                    onClick={prevStory}
                    className="story-tap-zone story-tap-left"
                    style={{ zIndex: 100 }}
                    aria-label="Previous story"
                />
                <button
                    onClick={nextStory}
                    className="story-tap-zone story-tap-right"
                    style={{ zIndex: 100 }}
                    aria-label="Next story"
                />
            </motion.div>
        </motion.div>
    )
}


// ── Story Item Circle ─────────────────────────────────────────
function StoryCircle({ label, avatar, seen, onClick, isAdd, hasStory }) {
    // A real button, not a click-handled div: this is the only way into the
    // story viewer, and it was unreachable from the keyboard.
    const accessibleLabel = isAdd && !hasStory
        ? 'Add to your story'
        : `View ${isAdd ? 'your' : `${label}'s`} story${seen ? ', already seen' : ''}`

    return (
        <button type="button" className="story-item" onClick={onClick} aria-label={accessibleLabel}>
            <div className="story-avatar-container">
                <div className={`story-ring-vibrant ${seen ? 'seen' : ''} ${(!hasStory && !isAdd) || (isAdd && !hasStory) ? 'hidden-ring' : ''}`}>
                    <div className="story-avatar-inner">
                        <img src={avatar} alt="" draggable={false} />
                    </div>
                </div>
                {isAdd && (
                    <div className="story-add-button-ig">
                        <HiPlus size={14} />
                    </div>
                )}
            </div>
            <span className={`story-label-ig ${seen ? 'seen' : ''}`} aria-hidden="true">
                {isAdd ? 'Your story' : label}
            </span>
        </button>
    )
}

// ── Main StoryRail Component ──────────────────────────────────
export default function StoryRail() {
    const { user } = useAuth()
    const [stories, setStories] = useState([])
    const [viewerGroup, setViewerGroup] = useState(null)
    const [showCreate, setShowCreate] = useState(false)
    const [loading, setLoading] = useState(true)
    const [loadFailed, setLoadFailed] = useState(false)

    const loadStories = useCallback(async () => {
        if (!user) {
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const { data } = await api.get('/stories')
            setStories(data.data || [])
            setLoadFailed(false)
        } catch {
            // The rail sits above the feed and collapses to nothing when empty,
            // so a swallowed failure was indistinguishable from "no stories".
            // Not a toast: this is secondary content and the feed below it is
            // what the user came for.
            setStories([])
            setLoadFailed(true)
        } finally { setLoading(false) }
    }, [user])

    useEffect(() => { loadStories() }, [loadStories])

    const groups = Object.values(
        stories.reduce((acc, s) => {
            const id = s.author._id
            if (!acc[id]) acc[id] = { author: s.author, stories: [] }
            acc[id].stories.push(s)
            return acc
        }, {})
    )

    const userAvatar = user?.avatarUrl || avatarFallback(user?.username)

    const userGroupIdx = groups.findIndex(g => g.author._id === user?._id)
    const hasUserStory = userGroupIdx !== -1

    return (
        <div className="story-rail-wrap">
            <div className="story-rail">
                {loading ? (
                    [...Array(8)].map((_, i) => (
                        <div key={i} className="story-item px-2">
                            <div className="relative">
                                <div className="skeleton rounded-full w-[76px] h-[76px]" />
                                <div className="absolute inset-[-4px] border-2 border-white/5 rounded-full" />
                            </div>
                            <div className="skeleton w-14 h-2 mt-3 rounded-full opacity-30" />
                        </div>
                    ))
                ) : (
                    <StoryCircle
                        label="Your story"
                        avatar={optimizeAvatarUrl(userAvatar)}
                        isAdd={true}
                        seen={hasUserStory ? groups[userGroupIdx].stories.every(s => s.viewedByMe) : false}
                        hasStory={hasUserStory}
                        onClick={() => {
                            if (hasUserStory) setViewerGroup({ groups, startIdx: userGroupIdx })
                            else setShowCreate(true)
                        }}
                    />
                )}

                {!loading && loadFailed && (
                    <button type="button" className="story-rail-retry" onClick={loadStories}>
                        Stories did not load. Retry
                    </button>
                )}

                {!loading && groups.map((g, i) => {
                    if (g.author._id === user?._id) return null // Skip own story here as it's first
                    const rawAvatarUrl = g.author.avatarUrl || avatarFallback(g.author.username)
                    return (
                        <StoryCircle
                            key={g.author._id}
                            label={g.author.username}
                            avatar={optimizeAvatarUrl(rawAvatarUrl)}
                            seen={g.stories.every(s => s.viewedByMe)}
                            hasStory={true}
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
