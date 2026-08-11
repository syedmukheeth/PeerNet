import { motion } from 'framer-motion'
import { HiClock, HiTerminal } from 'react-icons/hi'
import toast from 'react-hot-toast'

export default function AuditModule({ logs, loading }) {
    return (
        <motion.div className="admin-surface-el overflow-hidden border-0 md:border">
            {/* Header Section */}
            <div className="p-8 border-b border-admin-border bg-gradient-to-r from-accent/[0.02] to-transparent flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-1">
                    <h3 className="text-2xl font-black text-primary uppercase tracking-tighter">Activity Ledger</h3>
                    <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] opacity-80">{logs.length} operational records</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `peernet-audit-${new Date().toISOString()}.json`
                            a.click()
                            // The URL was never revoked and the anchor never
                            // removed, so every export leaked the full log
                            // payload for the life of the page.
                            URL.revokeObjectURL(url)
                            a.remove()
                            toast.success('Audit trail exported successfully')
                        }}
                        className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-admin-card border border-admin-border text-[10px] font-black uppercase tracking-widest text-primary hover:text-accent hover:border-accent/30 transition-all shadow-inner"
                    >
                        <HiTerminal size={16} />
                        Export Registry
                    </button>
                </div>
            </div>

            {/* Mobile Audit Cards */}
            <div className="md:hidden divide-y divide-admin-border bg-admin-card/50">
                {logs.map(log => (
                    <div key={log._id} className="p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <HiClock size={12} className="text-muted opacity-40" />
                                <span className="text-[10px] font-black text-muted uppercase tracking-widest tabular-nums opacity-60">
                                    {new Date(log.createdAt).toLocaleTimeString()}
                                </span>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-surface-subtle border border-admin-border text-[8px] font-black text-muted uppercase tracking-[0.2em]">
                                {log.targetType}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-[10px] font-black border border-accent/20">
                                {log.adminId?.username?.charAt(0).toUpperCase() || 'S'}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[12px] font-black text-primary">@{log.adminId?.username || 'system'}</span>
                                <span className="text-[10px] font-black text-accent uppercase tracking-tighter">{log.action}</span>
                            </div>
                        </div>

                        <p className="text-[11px] font-bold text-muted/60 uppercase bg-black/10 p-3 rounded-xl border border-white/5 truncate">
                            {log.details}
                        </p>
                    </div>
                ))}
            </div>

            {/* Desktop Audit Table */}
            <div className="hidden md:block admin-table-wrap">
                <table className="admin-table w-full">
                    <thead>
                        <tr className="bg-surface-subtle/30">
                            <th scope="col" className="pl-8">Temporal Vector</th>
                            <th scope="col">Auth Actor</th>
                            <th scope="col">Operation Context</th>
                            <th scope="col" className="text-right pr-8">Context Hash</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border">
                        {loading ? (
                            Array(10).fill(0).map((_, i) => (
                                <tr key={i}>
                                    <td className="pl-8 py-5"><div className="skeleton h-3 w-32 rounded opacity-40" /></td>
                                    <td><div className="skeleton h-3 w-24 rounded opacity-40" /></td>
                                    <td><div className="skeleton h-3 w-48 rounded opacity-40" /></td>
                                    <td className="text-right pr-8"><div className="skeleton h-3 w-20 ml-auto rounded opacity-20" /></td>
                                </tr>
                            ))
                        ) : logs.map(log => (
                            <tr key={log._id} className="group hover:bg-accent/[0.01] transition-colors">
                                <td className="pl-8 py-5">
                                    <span className="text-[11px] font-black text-muted uppercase tracking-widest tabular-nums opacity-60">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-accent/10 flex items-center justify-center text-accent text-[10px] font-black border border-accent/20">
                                            {log.adminId?.username?.charAt(0).toUpperCase() || 'S'}
                                        </div>
                                        <span className="text-[13px] font-black text-primary tracking-tight">@{log.adminId?.username || 'system'}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-black text-accent uppercase tracking-tighter">{log.action}</span>
                                        <span className="text-[10px] text-muted opacity-50 truncate max-w-xs font-bold uppercase">{log.details}</span>
                                    </div>
                                </td>
                                <td className="text-right pr-8">
                                    <span className="inline-flex px-3 py-1.5 rounded-xl bg-surface-subtle border border-admin-border text-[9px] font-black text-muted uppercase tracking-[0.2em]">
                                        {log.targetType}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {logs.length === 0 && (
                <div className="p-20 text-center space-y-4">
                    <div className="text-muted/10 flex justify-center"><HiTerminal size={48} /></div>
                    <p className="text-[11px] font-black text-muted uppercase tracking-widest">Registry stream empty</p>
                </div>
            )}
        </motion.div>
    )
}
