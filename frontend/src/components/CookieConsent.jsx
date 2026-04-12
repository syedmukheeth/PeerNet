import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiInformationCircle } from 'react-icons/hi'
import { Link } from 'react-router-dom'

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const consent = localStorage.getItem('peernet-cookie-consent')
        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 1500)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem('peernet-cookie-consent', 'true')
        setIsVisible(false)
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div 
                    className="cookie-banner"
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                    <div className="cookie-banner-content">
                        <div className="cookie-icon-wrap">
                            <HiInformationCircle size={22} />
                        </div>
                        <div className="cookie-text">
                            <p className="t-small">
                                We use cookies to enhance your decentralized experience. 
                                By continuing, you agree to our <Link to="/privacy" onClick={() => setIsVisible(false)}>Privacy Policy</Link>.
                            </p>
                        </div>
                        <div className="cookie-actions">
                            <button className="btn btn-primary btn-sm" onClick={handleAccept}>
                                Understood
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
