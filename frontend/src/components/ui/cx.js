/**
 * Join class names, dropping anything falsy.
 *
 * Deliberately not clsx or tailwind-merge. These primitives emit fixed custom
 * class names rather than utility soup, so there are no conflicting Tailwind
 * utilities to dedupe, and a dependency would earn nothing.
 */
export const cx = (...parts) => parts.filter(Boolean).join(' ')

export default cx
