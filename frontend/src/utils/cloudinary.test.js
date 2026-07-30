import { describe, it, expect } from 'vitest'
import { optimizeCloudinaryUrl, optimizeCloudinaryVideo, optimizeAvatarUrl } from './cloudinary'

const CLOUD = 'https://res.cloudinary.com/demo/image/upload/v1/peernet/post.jpg'

describe('optimizeCloudinaryUrl', () => {
    it('injects format, quality and width after /upload/', () => {
        expect(optimizeCloudinaryUrl(CLOUD)).toBe(
            'https://res.cloudinary.com/demo/image/upload/q_auto,f_auto,w_800/v1/peernet/post.jpg'
        )
    })

    it('honours a custom width', () => {
        expect(optimizeCloudinaryUrl(CLOUD, 400)).toContain('w_400')
    })

    it('leaves non-Cloudinary and already-transformed URLs alone', () => {
        const external = 'https://ui-avatars.com/api/?name=alex'
        expect(optimizeCloudinaryUrl(external)).toBe(external)
        const already = 'https://res.cloudinary.com/demo/image/upload/q_auto/v1/a.jpg'
        expect(optimizeCloudinaryUrl(already)).toBe(already)
    })

    it('returns falsy input unchanged rather than throwing', () => {
        expect(optimizeCloudinaryUrl(undefined)).toBe(undefined)
        expect(optimizeCloudinaryUrl('')).toBe('')
    })
})

describe('optimizeCloudinaryVideo', () => {
    it('injects format and quality but no width', () => {
        const video = 'https://res.cloudinary.com/demo/video/upload/v1/clip.mp4'
        expect(optimizeCloudinaryVideo(video)).toBe(
            'https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/v1/clip.mp4'
        )
    })
})

describe('optimizeAvatarUrl', () => {
    it('resizes Cloudinary avatars down to 150px', () => {
        expect(optimizeAvatarUrl(CLOUD)).toContain('w_150')
    })

    it('passes generated placeholder avatars straight through', () => {
        const placeholder = 'https://ui-avatars.com/api/?name=alex&background=6366F1'
        expect(optimizeAvatarUrl(placeholder)).toBe(placeholder)
    })
})
