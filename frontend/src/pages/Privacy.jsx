import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'

export default function Privacy() {
    return (
        <motion.div 
            className="max-w-3xl mx-auto py-12 px-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Helmet>
                <title>Privacy Policy | PeerNet</title>
            </Helmet>

            <h1 className="t-h1 mb-2">Privacy Policy</h1>
            <p className="text-muted text-sm mb-12">Last updated: April 12, 2026</p>
            
            <div className="space-y-10">
                <section className="l-card-premium p-8 border border-white/5 bg-white/[0.01]">
                    <h2 className="t-h2 mb-4 font-bold">1. Data Sovereignty</h2>
                    <p className="text-secondary leading-relaxed">
                        At PeerNet, we prioritize your privacy and data sovereignty. This policy explains how we handle your digital footprint in our network.
                    </p>
                </section>

                <section className="space-y-6">
                    <div>
                        <h3 className="t-h3 mb-2 font-bold">2. Data Collection</h3>
                        <p className="text-muted leading-relaxed">
                            We collect minimal data necessary for functionality. This includes your username, email (for account recovery), and public profile information. Peer-to-peer messages are encrypted and not readable by our central servers.
                        </p>
                    </div>

                    <div>
                        <h3 className="t-h3 mb-2 font-bold">3. Information Usage</h3>
                        <p className="text-muted leading-relaxed">
                            Your data is used solely to provide and improve PeerNet services. We do not sell, trade, or rent your personal identification information to others.
                        </p>
                    </div>

                    <div>
                        <h3 className="t-h3 mb-2 font-bold">4. Data Security</h3>
                        <p className="text-muted leading-relaxed">
                            We adopt appropriate data collection, storage, and processing practices and security measures to protect against unauthorized access, alteration, disclosure, or destruction of your personal information.
                        </p>
                    </div>

                    <div>
                        <h3 className="t-h3 mb-2 font-bold">5. Your Rights</h3>
                        <p className="text-muted leading-relaxed">
                            You have the right to access, rectify, or request the deletion of your personal data at any time through your account settings or by contacting our support team.
                        </p>
                    </div>
                </section>
            </div>
        </motion.div>
    )
}
