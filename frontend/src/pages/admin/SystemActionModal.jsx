import { motion } from 'framer-motion'
import { HiShieldCheck } from 'react-icons/hi'

export default function SystemActionModal({
    actionType,
    confirmCode,
    setConfirmCode,
    adminPassword,
    setAdminPassword,
    isExecuting,
    onClose,
    onExecute,
}) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-lg admin-glass-v2 border border-error/30 rounded-[40px] overflow-hidden shadow-2xl shadow-error/20"
            >
                <div className="p-10 lg:p-12">
                    <div className="flex items-center gap-6 mb-10">
                        <div className="w-16 h-16 rounded-3xl bg-error/10 border border-error/20 flex items-center justify-center text-error">
                            <HiShieldCheck size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-primary uppercase tracking-tighter">Security Clearance</h3>
                            <p className="text-[10px] font-black text-error uppercase tracking-[0.3em] mt-1.5 opacity-80">Action: {actionType}</p>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <div>
                            <label className="block text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-4 opacity-50">
                                1. Identity Confirmation (Type <span className="text-error">DELETE</span>)
                            </label>
                            <input
                                type="text"
                                value={confirmCode}
                                onChange={(e) => setConfirmCode(e.target.value)}
                                placeholder="CONFIRMATION_CODE"
                                className="w-full bg-surface-subtle border border-subtle rounded-2xl px-6 py-5 text-sm font-black text-primary focus:border-error/50 focus:bg-error/5 outline-none transition-all placeholder:opacity-10"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-4 opacity-50">
                                2. Administrative Key
                            </label>
                            <input
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="w-full bg-surface-subtle border border-subtle rounded-2xl px-6 py-5 text-sm font-black text-primary focus:border-error/50 focus:bg-error/5 outline-none transition-all placeholder:opacity-10"
                            />
                        </div>
                    </div>

                    <div className="flex gap-6 mt-14">
                        <button
                            onClick={onClose}
                            className="flex-1 py-5 text-[11px] font-black text-muted uppercase tracking-[0.3em] hover:text-primary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={confirmCode !== 'DELETE' || !adminPassword || isExecuting}
                            onClick={onExecute}
                            className={`flex-[2] py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${
                                confirmCode === 'DELETE' && adminPassword
                                ? 'bg-error text-white shadow-xl shadow-error/40 hover:scale-[1.02] active:scale-95'
                                : 'bg-surface-subtle text-muted/30 cursor-not-allowed'
                            }`}
                        >
                            {isExecuting ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Authorize & Execute</>
                            )}
                        </button>
                    </div>
                </div>

                <div className="bg-error/10 p-5 border-t border-error/10 text-center">
                    <p className="text-[9px] font-black text-error uppercase tracking-[0.4em]">Audit Trail Logging: Active</p>
                </div>
            </motion.div>
        </motion.div>
    )
}
