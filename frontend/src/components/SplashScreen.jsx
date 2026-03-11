import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import logo from '../assets/logo.png'

export default function SplashScreen({ onDone }) {
    const [phase, setPhase] = useState('logo') // 'logo' | 'out'

    useEffect(() => {
        const t1 = setTimeout(() => setPhase('out'), 1800)
        const t2 = setTimeout(() => onDone?.(), 2400)
        return () => { clearTimeout(t1); clearTimeout(t2) }
    }, [onDone])

    return (
        <AnimatePresence>
            {phase !== 'done' && (
                <motion.div
                    key="splash"
                    className="splash-screen"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: phase === 'out' ? 0 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: 'easeInOut' }}
                    onAnimationComplete={() => { if (phase === 'out') setPhase('done') }}
                >
                    {/* Background orbs */}
                    <div className="splash-orb splash-orb-1" />
                    <div className="splash-orb splash-orb-2" />
                    <div className="splash-orb splash-orb-3" />

                    {/* Logo */}
                    <motion.div
                        className="splash-logo-wrap"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                    >
                        <img src={logo} alt="PeerNet" className="splash-logo-img" />
                    </motion.div>

                    {/* Brand name */}
                    <motion.div
                        className="splash-brand"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                    >
                        PeerNet
                    </motion.div>

                    {/* Tagline */}
                    <motion.p
                        className="splash-tagline"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.4 }}
                    >
                        Connect · Share · Discover
                    </motion.p>

                    {/* Bottom Meta logo (Instagram-style) */}
                    <motion.div
                        className="splash-meta"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.0, duration: 0.4 }}
                    >
                        Built by <span>PeerNet</span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
