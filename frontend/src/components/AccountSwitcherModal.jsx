import { HiPlus, HiCheckCircle } from 'react-icons/hi'
import { useNavigate } from 'react-router'
import { useMultiAccount } from '../context/MultiAccountContext'
import { useAuth } from '../context/AuthContext'
import { Modal, Avatar } from './ui'

export default function AccountSwitcherModal({ onClose }) {
    const { accounts, switchAccount } = useMultiAccount()
    const { user } = useAuth()
    const navigate = useNavigate()

    const handleSwitch = (accountId) => {
        if (accountId === user?._id) return
        // Reloads the page, so there is nothing to close afterwards.
        switchAccount(accountId)
    }

    const handleAddAccount = () => {
        onClose()
        // The flag is what gets a signed-in user past GuestRoute.
        navigate('/login?addAccount=1')
    }

    return (
        <Modal onClose={onClose} title="Switch accounts" size="sm">
            <div className="p-2 max-h-[60vh] overflow-y-auto">
                {accounts.length === 0 && (
                    <div className="p-4 text-center text-text-3 text-sm">
                        Only your current account is saved. Add another account to switch freely.
                    </div>
                )}

                {accounts.map(acc => {
                    const isActive = acc.id === user?._id
                    return (
                        <button
                            key={acc.id}
                            onClick={() => handleSwitch(acc.id)}
                            aria-current={isActive || undefined}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group
                                ${isActive ? 'bg-accent/10' : 'hover:bg-white/5'}`}
                        >
                            <Avatar
                                src={acc.avatarUrl}
                                name={acc.username}
                                size="lg"
                                className="object-cover border border-border"
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
        </Modal>
    )
}
