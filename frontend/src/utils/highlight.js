/**
 * Splits text into alternating non-matching and matching segments for search
 * highlighting.
 *
 * The query is user input typed into the in-chat search box. It used to be
 * interpolated straight into `new RegExp("(" + query + ")", "gi")`, so typing
 * a single "(" threw a SyntaxError during render. With no error boundary in the
 * app at the time, that blanked the entire SPA.
 *
 * Returns an array of { text, match } rather than JSX so it can be tested
 * without a renderer.
 */

const REGEX_METACHARACTERS = /[.*+?^${}()|[\]\\]/g

export const escapeRegex = (value) => String(value).replace(REGEX_METACHARACTERS, '\\$&')

export const splitOnQuery = (text, query) => {
    // body is null on media-only messages.
    const source = text ?? ''
    if (!query) return [{ text: source, match: false }]

    const needle = String(query)
    let parts
    try {
        parts = source.split(new RegExp(`(${escapeRegex(needle)})`, 'gi'))
    } catch {
        // Belt and braces: even an escaped pattern must never take down a render.
        return [{ text: source, match: false }]
    }

    const lowered = needle.toLowerCase()
    return parts
        .filter((part) => part !== '')
        .map((part) => ({ text: part, match: part.toLowerCase() === lowered }))
}
