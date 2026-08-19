import { motion } from 'framer-motion'
import { HiSearch, HiShieldCheck, HiTrash, HiCheck, HiUsers } from '../../../components/ui/icons'
import avatarFallback from '../../../components/ui/avatarFallback'
import { isAdmin } from '../../../utils/roles'

/**
 * UserModule Component
 * Provides a high-fidelity interface for identity management,
 * featuring responsive table-to-card transformation for mobile administrative access.
 */
export default function UserModule({ users, onVerify, onDelete, loading, search, setSearch }) {
    return (
        <motion.div className="admin-surface-el overflow-hidden border-0 md:border">
            {/* Header */}
            <div className="p-6 border-b border-admin-border bg-gradient-to-r from-accent/[0.02] to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-0.5">
                    <h3 className="text-xl font-black text-primary uppercase tracking-tighter">Users</h3>
                    <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] opacity-80">{users.length} total users</p>
                </div>
                <div className="relative group w-full md:w-72">
                    <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-all" size={16} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-admin-card border border-admin-border rounded-xl pl-11 pr-4 py-3 text-[13px] font-bold text-primary focus:border-accent/50 outline-none transition-all w-full"
                    />
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-admin-border">
                {loading ? (
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="p-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="skeleton w-12 h-12 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <div className="skeleton h-3.5 w-1/3 rounded" />
                                    <div className="skeleton h-2 w-1/2 rounded opacity-50" />
                                </div>
                                <div className="skeleton h-5 w-16 rounded-full" />
                            </div>
                            <div className="flex gap-2">
                                <div className="skeleton h-10 flex-1 rounded-xl" />
                                <div className="skeleton h-10 flex-1 rounded-xl" />
                            </div>
                        </div>
                    ))
                ) : users.filter(u =>
                    // Guarded: guest accounts created through /auth/guest have
                    // no email, and the bare .toLowerCase() threw a TypeError
                    // that took down the whole admin console.
                    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
                    (u.email || '').toLowerCase().includes(search.toLowerCase())
                ).map(user => (
                    <div key={user._id} className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-admin-border bg-admin-card">
                                <img src={user.avatarUrl || avatarFallback(user.username)} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[14px] font-black text-primary tracking-tight truncate">@{user.username}</div>
                                <div className="text-[10px] font-bold text-muted truncate opacity-60">{user.email}</div>
                            </div>
                            <span className={`shrink-0 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                user.isVerified
                                    ? 'bg-success/10 border-success/20 text-success'
                                    : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                            }`}>
                                {user.isVerified ? 'Verified' : 'Unverified'}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => onVerify(user._id)}
                                className={`flex-1 py-3 rounded-xl text-white text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-95 transition-all ${
                                    user.isVerified
                                        ? 'bg-orange-500 shadow-lg shadow-orange-500/20'
                                        : 'bg-success shadow-lg shadow-success/20'
                                }`}
                            >
                                <HiShieldCheck size={15} />
                                {user.isVerified ? 'Unverify' : 'Verify'}
                            </button>
                            <button
                                onClick={() => onDelete(user._id)}
                                className="flex-1 py-3 rounded-xl bg-error text-white text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-error/20"
                            >
                                <HiTrash size={15} />
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block admin-table-wrap">
                <table className="admin-table w-full">
                    <thead>
                        <tr className="bg-surface-subtle/30">
                            <th scope="col" className="pl-8">User</th>
                            <th scope="col">Status</th>
                            <th scope="col">Role</th>
                            <th scope="col" className="text-right pr-8">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border">
                        {loading ? (
                            Array(6).fill(0).map((_, i) => (
                                <tr key={i}>
                                    <td className="pl-8 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="skeleton w-10 h-10 rounded-xl" />
                                            <div className="space-y-2">
                                                <div className="skeleton h-3 w-24 rounded" />
                                                <div className="skeleton h-2 w-32 rounded opacity-50" />
                                            </div>
                                        </div>
                                    </td>
                                    <td><div className="skeleton h-6 w-24 rounded-full" /></td>
                                    <td><div className="skeleton h-5 w-16 rounded-lg opacity-40" /></td>
                                    <td className="text-right pr-8">
                                        <div className="flex justify-end gap-2">
                                            <div className="skeleton w-20 h-8 rounded-xl" />
                                            <div className="skeleton w-8 h-8 rounded-xl" />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : users.filter(u =>
                            (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
                            (u.email || '').toLowerCase().includes(search.toLowerCase())
                        ).map(user => (
                            <tr key={user._id} className="group hover:bg-accent/[0.02] transition-colors">
                                <td className="pl-8 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-admin-border bg-admin-card">
                                                <img src={user.avatarUrl || avatarFallback(user.username)} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            {user.isVerified && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-success text-white rounded-full flex items-center justify-center border-2 border-admin-card">
                                                    <HiCheck size={8} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-black text-primary tracking-tight">@{user.username}</span>
                                            <span className="text-[10px] font-bold text-muted opacity-50">{user.email}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                                        user.isVerified
                                            ? 'bg-success/5 border-success/20 text-success'
                                            : 'bg-orange-500/5 border-orange-500/20 text-orange-400'
                                    }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                            user.isVerified ? 'bg-success animate-pulse' : 'bg-orange-400'
                                        }`} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                            {user.isVerified ? 'Verified' : 'Unverified'}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <span className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border ${
                                        isAdmin(user)
                                            ? 'bg-accent/10 border-accent/30 text-accent'
                                            : 'bg-surface-subtle border-admin-border text-muted/60'
                                    }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="text-right pr-8">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => onVerify(user._id)}
                                            title={user.isVerified ? 'Unverify User' : 'Verify User'}
                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] flex items-center gap-1.5 transition-all border ${
                                                user.isVerified
                                                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500 hover:text-white'
                                                    : 'bg-success/10 border-success/30 text-success hover:bg-success hover:text-white'
                                            }`}
                                        >
                                            <HiShieldCheck size={14} />
                                            {user.isVerified ? 'Unverify' : 'Verify'}
                                        </button>
                                        <button
                                            onClick={() => onDelete(user._id)}
                                            title="Delete User"
                                            className="w-9 h-9 rounded-xl bg-surface-subtle border border-admin-border text-muted hover:text-error hover:bg-error/10 hover:border-error/30 transition-all flex items-center justify-center"
                                        >
                                            <HiTrash size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {users.filter(u => (u.username || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase())).length === 0 && (
                <div className="p-16 text-center space-y-3">
                    <div className="text-muted/20 flex justify-center"><HiUsers size={40} /></div>
                    <p className="text-[11px] font-black text-muted uppercase tracking-widest">No users found</p>
                </div>
            )}
        </motion.div>
    )
}
