import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import logo from '../assets/logo.png'

/**
 * Brief brand frame shown once per session while the app boots.
 * Kept short on purpose, it sits in front of the first paint.
 */
export default function SplashScreen({ onDone }) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const hide = setTimeout(() => setVisible(false), 700)
        const done = setTimeout(() => onDone?.(), 1000)
        return () => { clearTimeout(hide); clearTimeout(done) }
    }, [onDone])

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="splash"
                    className="splash-screen"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <div className="splash-logo-wrap">
                        <img src={logo} alt="" className="splash-logo-img" />
                    </div>
                    <div className="splash-brand">PeerNet</div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
