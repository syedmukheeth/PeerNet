/*
 * Pick a readable label colour for a background the user chose.
 *
 * Text posts let the author set any background colour, so no fixed foreground
 * works. Measured against the three palette colours the composer offers:
 *
 *            near-black   white
 *   #5B45D6     3.13         6.43
 *   #3ECF8E    10.08         2.00
 *   #F5A623     9.93         2.03
 *
 * The feed hardcoded white and the profile grid used --accent-fg, so each was
 * unreadable on roughly half the available backgrounds. This derives the answer
 * per colour instead, which is the same rule styles/tokens.css states for
 * --accent-fg: never guess the colour that sits on a fill.
 */

const INK = '#0B0A0F'
const PAPER = '#FFFFFF'

const srgbToLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))

/* WCAG relative luminance. Returns null for anything that is not a hex colour,
   including the `var(--accent-2)` fallback the components pass through. */
export const relativeLuminance = (hex) => {
    if (typeof hex !== 'string') return null
    const m = hex.trim().replace('#', '')
    const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
    const [r, g, b] = full.match(/../g).map((h) => srgbToLinear(parseInt(h, 16) / 255))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrastRatio = (a, b) => {
    const la = relativeLuminance(a)
    const lb = relativeLuminance(b)
    if (la === null || lb === null) return null
    const [hi, lo] = la > lb ? [la, lb] : [lb, la]
    return (hi + 0.05) / (lo + 0.05)
}

/*
 * Returns whichever of near-black or white has more contrast on `bg`.
 * Falls back to white when the colour cannot be parsed, because both the
 * composer default (--accent-2) and the app ground are dark.
 */
export const readableTextOn = (bg) => {
    const l = relativeLuminance(bg)
    if (l === null) return PAPER
    return contrastRatio(INK, bg) >= contrastRatio(PAPER, bg) ? INK : PAPER
}

export default readableTextOn
