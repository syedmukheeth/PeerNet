import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'

export default function Terms() {
    return (
        <motion.div 
            className="max-w-3xl mx-auto py-12 px-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Helmet>
                <title>Terms of Service | PeerNet</title>
            </Helmet>

            <h1 className="t-h1 mb-2">Terms of Service</h1>
            <p className="text-muted text-sm mb-12">Last updated: April 12, 2026</p>
            
            <div className="space-y-10">
                <section className="l-card-premium p-8 border border-white/5 bg-white/[0.01]">
                    <h2 className="t-h2 mb-4 font-bold">Agreement to Terms</h2>
                    <p className="text-secondary leading-relaxed">
                        By accessing PeerNet, you agree to be bound by these terms. If you do not agree with any part of these terms, you are prohibited from using the platform.
                    </p>
                </section>

                <section className="space-y-8">
                    <div>
                        <h3 className="t-h3 mb-3 font-bold">1. User Conduct</h3>
                        <p className="text-muted leading-relaxed">
                            Users are responsible for their own content and behavior. PeerNet prohibits any illegal activity, harassment, or the distribution of harmful content. We reserve the right to terminate accounts that violate these community standards.
                        </p>
                    </div>

                    <div>
                        <h3 className="t-h3 mb-3 font-bold">2. Intellectual Property</h3>
                        <p className="text-muted leading-relaxed">
                            You retain all rights to the content you post on PeerNet. By posting, you grant us a worldwide, non-exclusive license to host and display your content to provide our services.
                        </p>
                    </div>

                    <div>
                        <h3 className="t-h3 mb-3 font-bold">3. Platform Availability</h3>
                        <p className="text-muted leading-relaxed">
                            While we strive for 100% uptime, PeerNet is provided "as is" without warranties of any kind. We reserve the right to modify or discontinue features at any time without notice.
                        </p>
                    </div>

                    <div>
                        <h3 className="t-h3 mb-3 font-bold">4. Limitation of Liability</h3>
                        <p className="text-muted leading-relaxed">
                            PeerNet shall not be held liable for any damages arising from your use of the platform, including data loss, service interruptions, or content posted by other users.
                        </p>
                    </div>
                </section>
            </div>
        </motion.div>
    )
}
