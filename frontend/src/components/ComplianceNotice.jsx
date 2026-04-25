import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiInformationCircle } from 'react-icons/hi'
import { Link } from 'react-router-dom'

export default function ComplianceNotice() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const consent = localStorage.getItem('peernet-compliance-consent')
        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 1500)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem('peernet-compliance-consent', 'true')
        setIsVisible(false)
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div 
                    className="compliance-banner"
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                    <div className="compliance-banner-content">
                        <div className="compliance-icon-wrap">
                            <HiInformationCircle size={22} />
                        </div>
                        <div className="compliance-text">
                            <p className="t-small">
                                We use essential technologies to enhance your decentralized experience. 
                                By continuing, you agree to our <Link to="/privacy" onClick={() => setIsVisible(false)}>Privacy Policy</Link>.
                            </p>
                        </div>
                        <div className="compliance-actions">
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
