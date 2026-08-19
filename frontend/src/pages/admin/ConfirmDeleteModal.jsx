import { motion } from 'framer-motion'
import { HiFlag } from '../../components/ui/icons'
export default function ConfirmDeleteModal({ onClose, onConfirm }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md" onClick={onClose}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-md admin-surface-el-v2 p-10 text-center shadow-2xl border-error/20">
                <div className="w-16 h-16 rounded-full bg-error/10 border border-error/20 flex items-center justify-center text-error mx-auto mb-6">
                    <HiFlag size={32} />
                </div>
                <h2 className="text-2xl font-black text-primary mb-3 uppercase tracking-tighter">Terminate Asset?</h2>
                <p className="text-muted font-bold text-sm mb-10 leading-relaxed opacity-60">This operation is destructive and cannot be reversed. All associated data will be purged.</p>
                <div className="grid grid-cols-2 gap-4">
                    <button className="py-4 rounded-xl border border-subtle font-black text-[10px] tracking-[0.2em] uppercase hover:bg-surface-subtle transition-all" onClick={onClose}>Abort</button>
                    <button className="py-4 rounded-xl bg-error text-white font-black text-[10px] tracking-[0.2em] uppercase shadow-lg shadow-error/20 hover:scale-[1.02] active:scale-95 transition-all" onClick={onConfirm}>Terminate</button>
                </div>
            </motion.div>
        </motion.div>
    )
}
