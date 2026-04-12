import { motion } from 'framer-motion'
import { HiX, HiPlus, HiCheckCircle } from 'react-icons/hi'
import { useMultiAccount } from '../context/MultiAccountContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function AccountSwitcherModal({ onClose }) {
    const { accounts, switchAccount } = useMultiAccount()
    const { user } = useAuth()
    const navigate = useNavigate()

    const handleSwitch = (accountId) => {
        if (accountId === user?._id) return
        switchAccount(accountId)
        onClose()
    }

    const handleAddAccount = () => {
        onClose()
        navigate('/login')
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div
                className="relative w-full max-w-sm glass-card overflow-hidden"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
            >
                <div className="glass-header p-4 flex items-center justify-between">
                    <h3 className="font-bold text-lg m-0">Switch accounts</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full"><HiX size={20} /></button>
                </div>

                <div className="p-2 max-h-[60vh] overflow-y-auto">
                    {accounts.length === 0 && (
                        <div className="p-4 text-center text-text-3 text-sm">
                            Only your current account is saved. Add another account to switch freely.
                        </div>
                    )}
                    
                    {/* List saved accounts */}
                    {accounts.map(acc => {
                        const isActive = acc.id === user?._id
                        return (
                            <button
                                key={acc.id}
                                onClick={() => handleSwitch(acc.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group
                                    ${isActive ? 'bg-accent/10' : 'hover:bg-white/5'}`}
                            >
                                <img
                                    src={acc.avatarUrl || `https://ui-avatars.com/api/?name=${acc.username}&background=6366F1&color=fff`}
                                    alt=""
                                    className="w-12 h-12 rounded-full object-cover border border-border"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-text-1 truncate">{acc.username}</div>
                                    <div className="text-xs text-text-3 truncate">{acc.fullName || '@' + acc.username}</div>
                                </div>
                                {isActive && <HiCheckCircle className="text-accent shrink-0" size={24} />}
                            </button>
                        )
                    })}

                    <div className="h-px bg-border my-2 mx-3 opacity-50" />

                    <button
                        onClick={handleAddAccount}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-left group"
                    >
                        <div className="w-12 h-12 rounded-full border border-dashed border-border-md flex items-center justify-center shrink-0 group-hover:border-accent group-hover:text-accent transition-colors">
                            <HiPlus size={20} />
                        </div>
                        <div className="font-semibold text-text-2 group-hover:text-accent transition-colors">
                            Log into an existing account
                        </div>
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
