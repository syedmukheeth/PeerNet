import { describe, it, expect, vi, afterEach } from 'vitest'
import { timeago } from './timeago'

const at = (isoNow) => vi.setSystemTime(new Date(isoNow))
const ago = (ms) => new Date(Date.now() - ms)

describe('timeago', () => {
    afterEach(() => vi.useRealTimers())

    it('returns an empty string for missing or unparseable input', () => {
        expect(timeago(null)).toBe('')
        expect(timeago(undefined)).toBe('')
        expect(timeago('')).toBe('')
        expect(timeago('not a date')).toBe('')
    })

    it('collapses anything under a minute to "just now"', () => {
        vi.useFakeTimers()
        at('2026-07-30T12:00:00Z')
        expect(timeago(ago(0))).toBe('just now')
        expect(timeago(ago(59_000))).toBe('just now')
    })

    it('steps up through minutes, hours, days and weeks', () => {
        vi.useFakeTimers()
        at('2026-07-30T12:00:00Z')
        expect(timeago(ago(60_000))).toBe('1m')
        expect(timeago(ago(59 * 60_000))).toBe('59m')
        expect(timeago(ago(60 * 60_000))).toBe('1h')
        expect(timeago(ago(23 * 3600_000))).toBe('23h')
        expect(timeago(ago(24 * 3600_000))).toBe('1d')
        expect(timeago(ago(6 * 24 * 3600_000))).toBe('6d')
        expect(timeago(ago(7 * 24 * 3600_000))).toBe('1w')
        expect(timeago(ago(4 * 7 * 24 * 3600_000))).toBe('4w')
    })

    it('falls back to an absolute date past five weeks', () => {
        vi.useFakeTimers()
        at('2026-07-30T12:00:00Z')
        expect(timeago(ago(5 * 7 * 24 * 3600_000))).toBe('Jun 25')
    })
})
