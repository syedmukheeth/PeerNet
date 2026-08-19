/*
 * The PeerNet mark.
 *
 * Two nodes the same size, neither above the other, joined by one edge: a peer
 * network is a relationship between equals, and the geometry says so. The
 * filled node is you, the open one is someone you follow.
 *
 * Inline rather than an <img> because a mark loaded through <img> is an
 * isolated document: it cannot see currentColor or --accent, so it cannot
 * follow the theme. The previous mark was a 28 KB PNG in a blue-to-cyan
 * gradient that disagreed with the app's own accent on every screen.
 *
 * The edge and the open node take currentColor, so the mark inherits whatever
 * text colour its surface uses. Only the filled node is accented.
 *
 * public/logo.svg is the same drawing with literal colours, for the favicon and
 * the manifest, which likewise cannot read the page's custom properties. Keep
 * the two in step.
 */
export default function Logo({ size = 32, className, title }) {
    return (
        <svg
            viewBox="0 0 32 32"
            width={size}
            height={size}
            className={className}
            fill="none"
            role={title ? 'img' : undefined}
            aria-hidden={title ? undefined : 'true'}
            focusable="false"
        >
            {title && <title>{title}</title>}
            <line
                x1="13.4" y1="18.6" x2="18.6" y2="13.4"
                stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
            />
            <circle cx="9.5" cy="22.5" r="5.4" fill="var(--accent)" />
            <circle
                cx="22.5" cy="9.5" r="5.4"
                stroke="currentColor" strokeWidth="2.6"
            />
        </svg>
    )
}
