import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import logoImg from '../assets/logo.png'

export default function About() {
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { staggerChildren: 0.1 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    }

    return (
        <motion.div 
            className="max-w-3xl mx-auto py-12 px-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <Helmet>
                <title>About | PeerNet</title>
                <meta name="description" content="Learn more about PeerNet, the next-gen social platform." />
            </Helmet>

            <motion.div className="text-center mb-16" variants={itemVariants}>
                <img src={logoImg} alt="PeerNet" className="w-20 h-20 mx-auto mb-6 rounded-2xl shadow-xl" />
                <h1 className="t-h1 logo-gradient-text mb-4">About PeerNet</h1>
                <p className="t-h2 text-muted max-w-lg mx-auto">
                    Connecting creators and innovators through a premium, distraction-free social experience.
                </p>
            </motion.div>

            <div className="space-y-12">
                <motion.section variants={itemVariants} className="l-card-premium p-8 border border-white/5">
                    <h2 className="t-h2 mb-4 font-bold">Our Mission</h2>
                    <p className="t-body text-secondary leading-relaxed">
                        PeerNet was born from a simple idea: social media should be about people, not algorithms. 
                        We've built a space that prioritizes high-fidelity interactions, creative freedom, and 
                        user privacy above all else.
                    </p>
                </motion.section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.section variants={itemVariants} className="l-card-premium p-6 border border-white/5">
                        <div className="text-3xl mb-4">✨</div>
                        <h3 className="t-h3 mb-2 font-bold">Premium Experience</h3>
                        <p className="text-muted text-sm leading-relaxed">
                            Every detail of our interface is crafted for elegance and speed, providing a "Digital Obsidian" aesthetic that feels as good as it looks.
                        </p>
                    </motion.section>

                    <motion.section variants={itemVariants} className="l-card-premium p-6 border border-white/5">
                        <div className="text-3xl mb-4">🛡️</div>
                        <h3 className="t-h3 mb-2 font-bold">Privacy First</h3>
                        <p className="text-muted text-sm leading-relaxed">
                            Your data belongs to you. We implement industry-leading encryption and transparency standards to keep your digital life secure.
                        </p>
                    </motion.section>
                </div>

                <motion.section variants={itemVariants} className="text-center pt-8">
                    <p className="text-muted text-sm italic">
                        Developed with ❤️ in India by Syed Mukheeth
                    </p>
                </motion.section>
            </div>
        </motion.div>
    )
}
