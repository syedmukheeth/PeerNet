import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { HiX } from './icons'
import { modalCard, useMotionPreset } from '../../lib/motion'
import cx from './cx'

/*
 * The eight modals in this app each reimplemented the overlay, the escape key,
 * the click-outside and the enter/exit spring, and none of them locked body
 * scroll or trapped focus. This owns all of that once.
 */

// Written out in full because Tailwind scans source text for class names, so a
// template literal like `max-w-${size}` would never generate the utility.
const WIDTHS = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
}

export default function Modal({
    onClose,
    title,
    children,
    size = 'sm',
    className,
    showClose = true,
}) {
    const cardRef = useRef(null)
    const variant = useMotionPreset(modalCard)

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.()
                return
            }
            if (e.key !== 'Tab' || !cardRef.current) return

            // Keep focus inside the dialog while it is open.
            const focusable = cardRef.current.querySelectorAll(
                'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
            )
            if (!focusable.length) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }

        document.addEventListener('keydown', onKeyDown)
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        // Move focus into the dialog and put it back where it came from on
        // close. Without this the trap above had nothing to trap: focus stayed
        // on whatever opened the modal, so the first Tab went into the page
        // behind it, and closing left focus on a detached element.
        const previouslyFocused = document.activeElement
        const firstField = cardRef.current?.querySelector(
            'input:not([type="hidden"]), textarea, select, [autofocus]',
        )
        ;(firstField || cardRef.current)?.focus?.()

        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = previousOverflow
            previouslyFocused?.focus?.()
        }
    }, [onClose])

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                ref={cardRef}
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === 'string' ? title : undefined}
                // Focusable so the dialog itself can receive focus when it
                // contains no form field; -1 keeps it out of the tab order.
                tabIndex={-1}
                className={cx('modal-card', 'w-full', WIDTHS[size] || WIDTHS.sm, className)}
                initial={variant.initial}
                animate={variant.animate}
                exit={variant.exit}
                transition={variant.transition}
                onClick={(e) => e.stopPropagation()}
            >
                {(title || showClose) && (
                    <div className="glass-header p-4 flex items-center justify-between">
                        <h3 className="font-bold text-lg m-0">{title}</h3>
                        {showClose && (
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="p-2 hover:bg-white/5 rounded-full"
                            >
                                <HiX size={20} />
                            </button>
                        )}
                    </div>
                )}
                {children}
            </motion.div>
        </div>
    )
}
