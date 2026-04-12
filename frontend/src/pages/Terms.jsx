import { motion } from 'framer-motion'

export default function Terms() {
    return (
        <div className="legal-page fade-in">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="t-display" style={{ marginBottom: 32 }}>Terms of Service</h1>
                
                <div className="legal-section">
                    <p className="t-small" style={{ marginBottom: 24 }}>Last updated: April 12, 2026</p>
                    <p>By accessing PeerNet, you agree to be bound by these terms of service and all applicable laws and regulations.</p>
                </div>

                <div className="legal-section">
                    <h2>1. Use License</h2>
                    <p>Permission is granted to temporarily use the PeerNet platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.</p>
                </div>

                <div className="legal-section">
                    <h2>2. Disclaimer</h2>
                    <p>The materials on PeerNet are provided on an 'as is' basis. PeerNet makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties of merchantability.</p>
                </div>

                <div className="legal-section">
                    <h2>3. Limitations</h2>
                    <p>In no event shall PeerNet or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit) arising out of the use or inability to use PeerNet.</p>
                </div>

                <div className="legal-section">
                    <h2>4. Accuracy of Materials</h2>
                    <p>The materials appearing on PeerNet could include technical, typographical, or photographic errors. PeerNet does not warrant that any of the materials on its website are accurate, complete or current.</p>
                </div>

                <div className="legal-section">
                    <h2>5. Governing Law</h2>
                    <p>These terms and conditions are governed by and construed in accordance with the laws of the digital jurisdiction and you irrevocably submit to the exclusive jurisdiction of the courts in that location.</p>
                </div>
            </motion.div>
        </div>
    )
}
