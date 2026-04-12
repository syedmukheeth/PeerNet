import { motion } from 'framer-motion'

export default function Privacy() {
    return (
        <div className="legal-page fade-in">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="t-display" style={{ marginBottom: 32 }}>Privacy Policy</h1>
                
                <div className="legal-section">
                    <p className="t-small" style={{ marginBottom: 24 }}>Last updated: April 12, 2026</p>
                    <p>At PeerNet, we prioritize your privacy and data sovereignty. This policy explains how we handle your digital footprint in our decentralized network.</p>
                </div>

                <div className="legal-section">
                    <h2>1. Data Collection</h2>
                    <p>We collect minimal data necessary for functionality. This includes your username, email (for account recovery), and public profile information. Peer-to-peer messages are encrypted and not readable by our servers.</p>
                </div>

                <div className="legal-section">
                    <h2>2. Information Usage</h2>
                    <p>Your data is used solely to provide and improve PeerNet services. We do not sell, trade, or rent your personal identification information to others.</p>
                </div>

                <div className="legal-section">
                    <h2>3. Data Security</h2>
                    <p>We adopt appropriate data collection, storage, and processing practices and security measures to protect against unauthorized access, alteration, disclosure, or destruction of your personal information.</p>
                </div>

                <div className="legal-section">
                    <h2>4. Your Rights</h2>
                    <p>You have the right to access, rectify, or request the deletion of your personal data at any time through your account settings or by contacting us.</p>
                </div>

                <div className="legal-section">
                    <h2>5. Changes to This Policy</h2>
                    <p>PeerNet has the discretion to update this privacy policy at any time. We encourage users to frequently check this page for any changes.</p>
                </div>
            </motion.div>
        </div>
    )
}
