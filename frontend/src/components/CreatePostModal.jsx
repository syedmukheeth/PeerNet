import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { modalCard, useMotionPreset } from '../lib/motion'
import { HiX, HiPhotograph, HiPencilAlt, HiCheckCircle, HiCloudUpload, HiTrash } from './ui/icons'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'

// Mirrors the limits enforced by the backend's upload middleware, so an
// oversized file is refused here instead of after a long upload.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024

const formatBytes = (bytes) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CreatePostModal({ onClose }) {
    // One spring for every dialog, and it settles instantly under reduced motion.
    const modalVariant = useMotionPreset(modalCard)

    const queryClient = useQueryClient()
    const [isTextMode, setIsTextMode] = useState(false)
    const [backgroundColor, setBackgroundColor] = useState('linear-gradient(135deg, #0f172a 0%, #334155 100%)')

    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [caption, setCaption] = useState('')
    const [loading, setLoading] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    // A rejected file used to be a toast that was gone in four seconds, next to
    // a drop zone that looked exactly as it had before. The reason now stays in
    // the zone itself until the next attempt.
    const [fileError, setFileError] = useState('')
    const [progress, setProgress] = useState(0)


    const inputRef = useRef()
    const textareaRef = useRef()
    const MAX_CHARS = 2200

    const bgPresets = [
        { name: 'Obsidian Night', value: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)' },
        { name: 'Obsidian Flare', value: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)' },
        { name: 'Midnight Aurora', value: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)' },
        { name: 'Eclipse Crimson', value: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)' },
        { name: 'Royal Velvet', value: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' },
    ]

    // Decided by type and extension only. There used to be a third clause
    // treating any octet-stream over 1MB as video, so a 1MB file of unknown
    // type rendered inside a <video> tag and never played.
    const isVideo = file
        ? file.type?.startsWith('video/') ||
          /\.(mp4|mov|webm|mkv|avi|3gp|hevc|m4v)$/i.test(file.name || '')
        : false

    // Auto-expand textarea logic
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [caption])


    // Blob URLs pin the whole file in memory until they are revoked, and
    // nothing revoked them: not replacing the selection, not removing it, not
    // unmounting. Picking several videos in one session leaked every one.
    useEffect(() => {
        if (!preview) return
        return () => URL.revokeObjectURL(preview)
    }, [preview])

    const processFile = useCallback((f) => {
        if (!f) return

        // Matches the limits the upload middleware enforces, so an oversized
        // file is rejected here rather than after a long upload.
        const video = f.type?.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|3gp|hevc|m4v)$/i.test(f.name || '')
        const image = f.type?.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif|heic|bmp)$/i.test(f.name || '')

        if (!video && !image) {
            setFileError(`${f.name} is not a photo or a video.`)
            return
        }

        const limit = video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
        if (f.size > limit) {
            setFileError(`${formatBytes(f.size)} is over the ${video ? '100MB' : '10MB'} limit for a ${video ? 'video' : 'photo'}.`)
            return
        }

        setFileError('')
        setFile(f)
        setPreview(URL.createObjectURL(f))
    }, [])

    // Clearing the input's value matters: picking the same file twice in a row
    // fires no change event otherwise, so "Replace" then re-choosing the file
    // you just removed did nothing.
    const handleFile = (e) => {
        processFile(e.target.files[0])
        e.target.value = ''
    }

    const clearMedia = () => {
        setFile(null)
        setPreview(null)
        setFileError('')
    }


    const onDragOver = (e) => {
        e.preventDefault()
        setDragOver(true)
    }

    const onDragLeave = () => {
        setDragOver(false)
    }

    const onDrop = useCallback((e) => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files[0]
        if (f) processFile(f)
    }, [processFile])

    const handleSubmit = async () => {
        if (!isTextMode && !file) return toast.error('Select a photo or video first')
        if (isTextMode && !caption.trim()) return toast.error('Type something for your post')
        
        setLoading(true)
        setProgress(0)
        try {
            const fd = new FormData()

            if (isTextMode) {
                fd.append('mediaType', 'text')
                fd.append('backgroundColor', backgroundColor)
                fd.append('caption', caption)
                
                await api.post('/posts', fd)
                toast.success('Status shared')
                await queryClient.invalidateQueries({ queryKey: ['feed'] })
                onClose()
            } else {
                // Videos and images both go to /posts, which picks the Cloudinary
                // resource type from the file's mimetype.
                fd.append('media', file)
                fd.append('caption', caption)

                // A 100MB video on a slow connection sat behind a spinner that
                // said "Sharing..." for two minutes with no way to tell whether
                // anything was happening. onUploadProgress reports the browser
                // to server leg; Cloudinary's own processing happens after it
                // reaches 100, which is why the label switches to "Processing".
                await api.post('/posts', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (e) => {
                        if (!e.total) return
                        setProgress(Math.round((e.loaded * 100) / e.total))
                    },
                })
                toast.success(isVideo ? 'Video shared' : 'Post shared')
                await queryClient.invalidateQueries({ queryKey: ['feed'] })
                onClose()
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to share content')
        } finally {
            setLoading(false)
            setProgress(0)
        }
    }

    const addHashtag = (tag) => {
        if (caption.includes(tag)) return
        setCaption(prev => prev.trim() + ' ' + tag)
    }

    return (
        <AnimatePresence>
            <div className="create-post-overlay" onClick={onClose}>
                <motion.div 
                    className="create-post-card"
                    {...modalVariant}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header. The mode switch used to share this row with the
                        title and the close button, which left three items
                        fighting for the same 560px and stacked the tabs on top
                        of the heading. It has its own row now. */}
                    <header className="create-post-header">
                        <h2 className="create-post-heading">
                            {isTextMode ? 'Create Status' : 'Create New Post'}
                        </h2>
                        <button className="btn btn-ghost btn-icon-sm" onClick={onClose} aria-label="Close">
                            <HiX size={20} />
                        </button>
                    </header>

                    <div className="creative-tabs" role="tablist" aria-label="Post type">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={!isTextMode}
                            className={`creative-tab ${!isTextMode ? 'active' : ''}`}
                            onClick={() => setIsTextMode(false)}
                        >
                            <HiPhotograph size={17} /> Media
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={isTextMode}
                            className={`creative-tab ${isTextMode ? 'active' : ''}`}
                            onClick={() => setIsTextMode(true)}
                        >
                            <HiPencilAlt size={17} /> Status
                        </button>
                    </div>

                    {/* Body */}
                    <div className="create-post-body dark-scrollbar">
                        {isTextMode ? (
                            <div className="story-text-preview" style={{ background: backgroundColor, minHeight: 400, borderRadius: 0 }}>
                                <textarea 
                                    placeholder="What's on your mind?"
                                    value={caption}
                                    onChange={e => setCaption(e.target.value)}
                                    style={{ fontSize: 24, padding: '40px 30px', fontWeight: 700 }}
                                />
                                
                                <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', gap: 10 }}>
                                    {bgPresets.map(preset => (
                                        <motion.button
                                            key={preset.name}
                                            onClick={() => setBackgroundColor(preset.value)}
                                            whileHover={{ scale: 1.2 }}
                                            whileTap={{ scale: 0.9 }}
                                            style={{
                                                width: 32, height: 32, borderRadius: '50%',
                                                background: preset.value,
                                                border: backgroundColor === preset.value ? '2px solid white' : '2px solid rgba(255,255,255,0.2)',
                                                cursor: 'pointer',
                                                boxShadow: backgroundColor === preset.value ? '0 0 12px rgba(255,255,255,0.3)' : 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Upload / Preview */}
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    hidden
                                    onChange={handleFile}
                                />

                                {!preview ? (
                                    /* A button, not a div: the zone is the
                                       control that opens the picker, so Enter
                                       and Space have to work on it. The old
                                       markup also nested a real <button> inside
                                       the clickable div, which is invalid and
                                       fired the picker twice. */
                                    <button
                                        type="button"
                                        className={`upload-zone ${dragOver ? 'drag-over' : ''} ${fileError ? 'has-error' : ''}`}
                                        onClick={() => inputRef.current?.click()}
                                        onDragOver={onDragOver}
                                        onDragLeave={onDragLeave}
                                        onDrop={onDrop}
                                    >
                                        <span className="upload-zone__icon">
                                            <HiCloudUpload size={30} />
                                        </span>
                                        <span className="upload-zone__title">
                                            {dragOver ? 'Drop to add it' : 'Drag a photo or video here'}
                                        </span>
                                        <span className="upload-zone__hint">
                                            JPG, PNG, GIF or WEBP up to 10MB. MP4, MOV or WEBM up to 100MB.
                                        </span>
                                        <span className="upload-zone__cta">Select from device</span>
                                        {fileError && (
                                            <span className="upload-zone__error" role="alert">{fileError}</span>
                                        )}
                                    </button>
                                ) : (
                                    <div className="media-preview-wrap">
                                        <div className="media-preview">
                                            {isVideo ? (
                                                <video src={preview} controls playsInline autoPlay muted loop />
                                            ) : (
                                                <img src={preview} alt="Preview" />
                                            )}
                                            <button
                                                type="button"
                                                className="media-preview__remove"
                                                onClick={clearMedia}
                                                aria-label="Remove media"
                                                title="Remove media"
                                            >
                                                <HiTrash size={18} />
                                            </button>
                                        </div>
                                        <div className="media-preview__bar">
                                            <span className="media-preview__meta" title={file?.name}>
                                                {file?.name} <span className="media-preview__size">{formatBytes(file?.size)}</span>
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => inputRef.current?.click()}
                                            >
                                                Replace
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Caption & Tools */}
                                <div className="caption-section">
                                    {/* The ring belongs to the shell, not the
                                        textarea. Both used to draw one, so a
                                        focused caption box showed a purple
                                        rectangle inside a purple rectangle. */}
                                    <div className="caption-shell field-shell">
                                        <textarea
                                            ref={textareaRef}
                                            className="caption-field"
                                            placeholder="Write a caption..."
                                            aria-label="Caption"
                                            value={caption}
                                            onChange={e => setCaption(e.target.value.slice(0, MAX_CHARS))}
                                        />
                                    </div>

                                    <div className="caption-tools">
                                        <div className="hashtags-row">
                                            {['#peernet', '#community', '#web3'].map(tag => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    className="hashtags-helper"
                                                    onClick={() => addHashtag(tag)}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>

                                        <span className={`character-counter ${caption.length > MAX_CHARS * 0.9 ? 'warning' : ''}`}>
                                            {caption.length}/{MAX_CHARS}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <footer className="create-post-footer">
                        {loading && !isTextMode && (
                            <div
                                className="upload-progress"
                                role="progressbar"
                                aria-valuenow={progress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Upload progress"
                            >
                                <div className="upload-progress__bar" style={{ width: `${progress}%` }} />
                            </div>
                        )}
                        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <motion.button
                            className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
                            onClick={handleSubmit}
                            disabled={loading || (!isTextMode && !file) || (isTextMode && !caption.trim())}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {!loading && <HiCheckCircle />}
                            {loading
                                ? (isTextMode || progress >= 100 ? 'Processing...' : `Uploading ${progress}%`)
                                : (isTextMode ? 'Share Status' : 'Share Post')}
                        </motion.button>
                    </footer>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
