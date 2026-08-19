import { ICON_PATHS, ICON_ALIASES } from './paths'

/*
 * The one icon component.
 *
 * size defaults to '1em' to match what react-icons did, so the many call sites
 * that size an icon with a Tailwind font-size class (className="text-2xl")
 * keep working unchanged. Pass a number for an explicit pixel size.
 *
 * Stroke width is expressed in user units against a 24x24 viewBox, so it scales
 * with `size` rather than staying pinned at 1.75 device pixels and going hairline
 * on a 40px icon.
 *
 * Icons are decorative by default: aria-hidden, focusable="false". Pass `title`
 * only when the icon is the sole label for a control, and prefer aria-label on
 * the button itself where there is one.
 */

const resolve = (name, solid) => {
    const base = ICON_ALIASES[name] || name
    if (solid && ICON_PATHS[`${base}-solid`]) return ICON_PATHS[`${base}-solid`]
    return ICON_PATHS[base]
}

export default function Icon({
    name,
    size = '1em',
    solid = false,
    strokeWidth = 1.75,
    className,
    title,
    ...rest
}) {
    const entry = resolve(name, solid)

    if (!entry) {
        if (import.meta.env.DEV) console.warn(`<Icon name="${name}"> is not in the set`)
        return null
    }

    const filled = typeof entry === 'object' && !Array.isArray(entry) && entry.fill
    const d = filled ? entry.fill : entry
    const paths = Array.isArray(d) ? d : [d]

    return (
        <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className={className}
            fill={filled ? 'currentColor' : 'none'}
            stroke={filled ? 'none' : 'currentColor'}
            strokeWidth={filled ? undefined : strokeWidth}
            strokeLinecap={filled ? undefined : 'round'}
            strokeLinejoin={filled ? undefined : 'round'}
            role={title ? 'img' : undefined}
            aria-hidden={title ? undefined : 'true'}
            focusable="false"
            {...rest}
        >
            {title && <title>{title}</title>}
            {paths.map((p, i) => (
                <path key={i} d={p} />
            ))}
        </svg>
    )
}
