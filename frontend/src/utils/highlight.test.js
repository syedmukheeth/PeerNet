import { describe, it, expect } from 'vitest'
import { splitOnQuery, escapeRegex } from './highlight'

describe('splitOnQuery', () => {
    it('returns the whole string unmarked when there is no query', () => {
        expect(splitOnQuery('hello world', '')).toEqual([
            { text: 'hello world', match: false },
        ])
    })

    it('marks the matching segment', () => {
        expect(splitOnQuery('hello world', 'world')).toEqual([
            { text: 'hello ', match: false },
            { text: 'world', match: true },
        ])
    })

    it('matches case-insensitively', () => {
        expect(splitOnQuery('Hello World', 'world')).toEqual([
            { text: 'Hello ', match: false },
            { text: 'World', match: true },
        ])
    })

    // The regression this module exists for: these characters used to reach
    // `new RegExp` unescaped and throw during render, blanking the whole app.
    it.each(['(', ')', '[', '*', '+', '?', '\\', '^', '$', '(a'])(
        'does not throw on the regex metacharacter %j',
        (query) => {
            expect(() => splitOnQuery('some message body', query)).not.toThrow()
        },
    )

    it('treats a metacharacter as a literal to match on', () => {
        expect(splitOnQuery('a (b) c', '(b)')).toEqual([
            { text: 'a ', match: false },
            { text: '(b)', match: true },
            { text: ' c', match: false },
        ])
    })

    it('tolerates a null body, which media-only messages have', () => {
        // An empty body yields no segments at all, which renders as nothing.
        // The point is that it does not throw on m.body.split.
        expect(splitOnQuery(null, 'anything')).toEqual([])
        expect(splitOnQuery(undefined, '')).toEqual([{ text: '', match: false }])
    })
})

describe('escapeRegex', () => {
    it('escapes every regex metacharacter', () => {
        expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c')
    })
})
