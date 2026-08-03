import { useReducedMotion } from 'framer-motion'

/*
 * Shared motion vocabulary.
 *
 * Every animated component used to inline its own initial/animate/exit and its
 * own durations, so nothing agreed with anything else. The easings below mirror
 * the --ease-* and --trans-* tokens in styles/tokens.css numerically, so a CSS
 * transition and a framer-motion animation on the same element move alike.
 */

export const DURATION = {
    instant: 0.1,
    fast: 0.15,
    base: 0.25,
    slow: 0.4,
}

// Numerically identical to --ease-standard, --ease-out and --trans-spring.
export const EASE = {
    standard: [0.4, 0, 0.2, 1],
    out: [0.16, 1, 0.3, 1],
    spring: [0.175, 0.885, 0.32, 1.275],
}

export const SPRING = {
    // The enter/exit used by every modal in the app.
    modal: { type: 'spring', stiffness: 350, damping: 25 },
    pop: { type: 'spring', stiffness: 500, damping: 30 },
}

export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: DURATION.base, ease: EASE.standard },
}

export const fadeInUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 12 },
    transition: { duration: DURATION.base, ease: EASE.out },
}

export const scaleIn = {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    transition: { duration: DURATION.fast, ease: EASE.out },
}

export const modalOverlay = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: DURATION.fast },
}

export const modalCard = {
    initial: { opacity: 0, scale: 0.95, y: 15 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 15 },
    transition: SPRING.modal,
}

export const listItem = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: DURATION.fast, ease: EASE.out },
}

export const staggerContainer = (stagger = 0.04) => ({
    animate: { transition: { staggerChildren: stagger } },
})

// Zero-motion equivalents: same keys so a variant swap never breaks a component.
const STILL = {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 1 },
    transition: { duration: 0 },
}

/**
 * Returns a variant honouring the user's reduced-motion preference.
 *
 * This closes a real gap: the prefers-reduced-motion block in index.css zeroes
 * CSS transitions but has no effect on JS driven animation, so reduced-motion
 * users were still getting every framer-motion animation at full strength.
 *
 *   const motionProps = useMotionPreset(modalCard)
 *   <motion.div {...motionProps} />
 */
export const useMotionPreset = (variant) => {
    const reduced = useReducedMotion()
    return reduced ? STILL : variant
}
