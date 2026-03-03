import { useTheme } from '../context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { HiSun, HiMoon } from 'react-icons/hi'

export default function ThemeToggle({ className = '' }) {
    const { isDark, toggle } = useTheme()

    return (
        <button
            onClick={toggle}
            className={`theme-toggle ${className}`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
        >
            <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                    <motion.span key="moon"
                        initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={{ display: 'flex' }}>
                        <HiMoon style={{ width: 18, height: 18 }} />
                    </motion.span>
                ) : (
                    <motion.span key="sun"
                        initial={{ opacity: 0, rotate: 90, scale: 0.6 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: -90, scale: 0.6 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={{ display: 'flex' }}>
                        <HiSun style={{ width: 18, height: 18 }} />
                    </motion.span>
                )}
            </AnimatePresence>
        </button>
    )
}
