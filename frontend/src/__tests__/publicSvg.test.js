import { describe, it, expect } from 'vitest'
import logoSvg from '../../public/logo.svg?raw'
import appIconSvg from '../../public/app-icon.svg?raw'

/*
 * public/logo.svg and public/app-icon.svg are loaded by the browser as
 * standalone documents, not parsed as HTML, so they are held to XML rules.
 * A malformed one does not throw anywhere: the favicon and the installed-app
 * icon simply do not appear, which is easy to ship without noticing.
 *
 * The trap that caught logo.svg once: a double hyphen inside an XML comment is
 * a syntax error, and writing a custom property name in a comment puts one
 * there. The file rendered nowhere and nothing reported it.
 */
const files = [
    ['logo.svg', logoSvg],
    ['app-icon.svg', appIconSvg],
]

describe('public SVG assets', () => {
    for (const [name, source] of files) {
        it(`${name} parses as XML`, () => {
            const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
            const error = doc.querySelector('parsererror')
            expect(error?.textContent ?? null).toBeNull()
        })

        it(`${name} has no double hyphen inside a comment`, () => {
            const comments = source.match(/<!--[\s\S]*?-->/g) ?? []
            const offenders = comments.filter(c => c.slice(4, -3).includes('--'))
            expect(offenders).toEqual([])
        })

        it(`${name} draws the mark`, () => {
            const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
            // Two nodes and the edge between them.
            expect(doc.querySelectorAll('circle')).toHaveLength(2)
            expect(doc.querySelectorAll('line')).toHaveLength(1)
        })
    }
})
