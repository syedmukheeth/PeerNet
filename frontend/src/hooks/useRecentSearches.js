import { useState, useCallback } from 'react'

/*
 * Recent searches, kept on the device.
 *
 * The idle search screen was a single line of text, and the "See All" link in
 * the suggestions rail pointed straight at it, so the app's own link led to a
 * blank page. This is half of what fills it.
 *
 * Keyed per account, because these devices get shared and one person's search
 * history is not another's. Entries are whole people rather than query strings:
 * tapping a past result should take you back to that profile, not re-run a
 * search for their name.
 */
const KEY = 'pn_recent_searches'
const MAX = 8

const readAll = () => {
    try {
        return JSON.parse(localStorage.getItem(KEY) || '{}')
    } catch {
        // Corrupt or blocked storage should cost the feature, not the page.
        return {}
    }
}

export function useRecentSearches(userId) {
    const [recents, setRecents] = useState(() => (userId ? readAll()[userId] || [] : []))

    const persist = useCallback((next) => {
        setRecents(next)
        if (!userId) return
        try {
            const all = readAll()
            all[userId] = next
            localStorage.setItem(KEY, JSON.stringify(all))
        } catch {
            // Storage full or blocked. The list still works for this session.
        }
    }, [userId])

    const remember = useCallback((person) => {
        if (!person?._id) return
        const entry = {
            _id: person._id,
            username: person.username,
            fullName: person.fullName,
            avatarUrl: person.avatarUrl,
            isVerified: person.isVerified,
        }
        // Most recent first, and visiting someone again moves them up rather
        // than adding a duplicate.
        persist([entry, ...recents.filter((r) => r._id !== person._id)].slice(0, MAX))
    }, [recents, persist])

    const forget = useCallback((id) => {
        persist(recents.filter((r) => r._id !== id))
    }, [recents, persist])

    const clear = useCallback(() => persist([]), [persist])

    return { recents, remember, forget, clear }
}

export default useRecentSearches
