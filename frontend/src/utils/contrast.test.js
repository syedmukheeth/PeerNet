import { describe, it, expect } from 'vitest'
import { relativeLuminance, contrastRatio, readableTextOn } from './contrast'

const INK = '#0B0A0F'
const PAPER = '#FFFFFF'

/* The three backgrounds the status composer offers. Each one is a case where a
   single fixed foreground would fail: near-black is 3.13:1 on the violet, white
   is 2.00:1 on the green. */
const COMPOSER_BACKGROUNDS = ['#5B45D6', '#3ECF8E', '#F5A623']

describe('relativeLuminance', () => {
    it('anchors black and white', () => {
        expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
        expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5)
    })

    it('expands three-digit hex', () => {
        expect(relativeLuminance('#fff')).toBeCloseTo(relativeLuminance('#ffffff'), 10)
    })

    it('returns null for anything that is not a hex colour', () => {
        for (const bad of [undefined, null, '', 'var(--accent-2)', 'rgb(1,2,3)', '#12345']) {
            expect(relativeLuminance(bad)).toBeNull()
        }
    })
})

describe('contrastRatio', () => {
    it('gives 21:1 for black on white', () => {
        expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    })

    it('is symmetric', () => {
        expect(contrastRatio(INK, '#5B45D6')).toBeCloseTo(contrastRatio('#5B45D6', INK), 10)
    })

    it('returns null when either colour is unparseable', () => {
        expect(contrastRatio('#fff', 'var(--x)')).toBeNull()
    })
})

describe('readableTextOn', () => {
    it('picks the higher-contrast option for every composer background', () => {
        for (const bg of COMPOSER_BACKGROUNDS) {
            const chosen = readableTextOn(bg)
            const other = chosen === INK ? PAPER : INK
            expect(contrastRatio(chosen, bg)).toBeGreaterThanOrEqual(contrastRatio(other, bg))
        }
    })

    it('clears WCAG AA on every composer background', () => {
        for (const bg of COMPOSER_BACKGROUNDS) {
            expect(contrastRatio(readableTextOn(bg), bg)).toBeGreaterThanOrEqual(4.5)
        }
    })

    it('uses ink on light backgrounds and white on dark ones', () => {
        expect(readableTextOn('#F5A623')).toBe(INK)
        expect(readableTextOn('#3ECF8E')).toBe(INK)
        expect(readableTextOn('#5B45D6')).toBe(PAPER)
    })

    // The composer default is the CSS token var(--accent-2), which cannot be
    // resolved here and is dark, so white is the safe answer.
    it('falls back to white for an unparseable colour', () => {
        for (const bad of [undefined, null, '', 'var(--accent-2)']) {
            expect(readableTextOn(bad)).toBe(PAPER)
        }
    })
})
