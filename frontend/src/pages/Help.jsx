import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { HiQuestionMarkCircle, HiSupport, HiShieldCheck, HiMail } from 'react-icons/hi'

export default function Help() {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 }
    }

    const faqs = [
        {
            q: "How do I create a story?",
            a: "Tap the plus icon in the Story Rail on your home feed to capture or upload a new story. Stories disappear after 24 hours."
        },
        {
            q: "What are PeerNet Shorts?",
            a: "Shorts are our immersive vertical video experience. You can browse them by clicking the film icon in the navigation bar."
        },
        {
            q: "How do I change my privacy settings?",
            a: "Go to Settings > Privacy to manage who can see your profile, comment on your posts, and message you."
        }
    ]

    return (
        <motion.div 
            className="max-w-4xl mx-auto py-12 px-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <Helmet>
                <title>Help Center | PeerNet</title>
            </Helmet>

            <motion.div className="mb-12 text-center" variants={itemVariants}>
                <h1 className="t-h1 mb-4">How can we help?</h1>
                <p className="text-muted text-lg">Search our help center or browse common questions below.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                {[
                    { icon: HiSupport, label: "Account Support", color: "text-blue-500" },
                    { icon: HiShieldCheck, label: "Safety & Privacy", color: "text-green-500" },
                    { icon: HiQuestionMarkCircle, label: "Platform Basics", color: "text-purple-500" },
                ].map((item, idx) => (
                    <motion.div 
                        key={idx} 
                        variants={itemVariants}
                        className="l-card-premium p-6 text-center border border-white/5 cursor-pointer hover:border-accent/30 transition-colors"
                    >
                        <item.icon className={`w-10 h-10 mx-auto mb-4 ${item.color}`} />
                        <h3 className="font-bold">{item.label}</h3>
                    </motion.div>
                ))}
            </div>

            <motion.section variants={itemVariants} className="mb-16">
                <h2 className="t-h2 mb-8 font-bold border-b border-white/10 pb-4">Frequently Asked Questions</h2>
                <div className="space-y-6">
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="l-card-premium p-6 bg-white/[0.02] border border-white/5">
                            <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                                <span className="text-accent font-black">Q:</span> {faq.q}
                            </h4>
                            <p className="text-secondary text-sm leading-relaxed">
                                <span className="text-muted font-bold mr-1">A:</span> {faq.a}
                            </p>
                        </div>
                    ))}
                </div>
            </motion.section>

            <motion.section variants={itemVariants} className="l-card-premium p-8 bg-accent/5 border border-accent/20 rounded-2xl text-center">
                <HiMail className="w-12 h-12 mx-auto mb-4 text-accent" />
                <h2 className="t-h2 mb-2 font-bold">Still need help?</h2>
                <p className="text-muted mb-6">Our support team is available 24/7 to assist you.</p>
                <a href="mailto:support@peernet.com" className="btn btn-primary px-8 py-3 no-underline inline-block">
                    Contact Support
                </a>
            </motion.section>
        </motion.div>
    )
}
