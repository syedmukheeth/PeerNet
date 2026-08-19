import { motion } from 'framer-motion'
import { HiFlag, HiShieldCheck, HiCheck } from '../../../components/ui/icons'
export default function ReportModule({ reports, onResolve, loading }) {
    return (
        <motion.div className="admin-surface-el overflow-hidden border-0 md:border border-error/20">
            {/* Header Section */}
            <div className="p-8 border-b border-error/20 bg-gradient-to-r from-error/[0.03] to-transparent flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-2xl font-black text-primary uppercase tracking-tighter flex items-center gap-3">
                        <HiFlag className="text-error" /> Integrity Queue
                    </h3>
                    <p className="text-[10px] font-black text-error uppercase tracking-[0.3em] opacity-80">{reports.length} security flags pending</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center text-error border border-error/20">
                    <HiShieldCheck size={24} />
                </div>
            </div>

            {/* Mobile Report Cards */}
            <div className="md:hidden divide-y divide-error/10 bg-error/[0.02]">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="skeleton w-8 h-8 rounded-lg" />
                                    <div className="skeleton h-3 w-20 rounded" />
                                </div>
                                <div className="skeleton h-5 w-16 rounded-full" />
                            </div>
                            <div className="skeleton h-20 w-full rounded-2xl" />
                        </div>
                    ))
                ) : reports.map(report => (
                    <div key={report._id} className="p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-admin-border flex items-center justify-center text-muted font-black text-[10px]">
                                    {report.reporterId?.username?.[0]?.toUpperCase()}
                                </div>
                                <span className="text-[12px] font-black text-primary">@{report.reporterId?.username}</span>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-error/10 border border-error/20 text-error text-[8px] font-black uppercase tracking-widest">
                                {report.reason}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="text-[9px] font-black text-muted uppercase tracking-widest opacity-40">Targeted Content:</div>
                            <p className="text-[13px] text-muted leading-relaxed font-medium bg-black/20 p-4 rounded-2xl border border-white/5 italic">
                                &quot;{report.targetId?.content || report.targetId?.body || 'Content Unavailable'}&quot;
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => onResolve(report._id, 'dismissed')}
                                className="py-4 rounded-2xl bg-surface-subtle text-muted text-[10px] font-black uppercase tracking-[0.2em] border border-admin-border active:scale-95 transition-all"
                            >
                                Dismiss
                            </button>
                            <button
                                onClick={() => onResolve(report._id, 'resolved')}
                                className="py-4 rounded-2xl bg-error text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-error/20 active:scale-95 transition-all"
                            >
                                Enforce
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Report Table */}
            <div className="hidden md:block admin-table-wrap">
                <table className="admin-table w-full">
                    <thead>
                        <tr className="bg-error/[0.03]">
                            <th scope="col" className="pl-8">Origin Node</th>
                            <th scope="col">Classification</th>
                            <th scope="col">Target Fragment</th>
                            <th scope="col" className="text-right pr-8">Resolution Protocol</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-error/10">
                        {loading ? (
                            Array(6).fill(0).map((_, i) => (
                                <tr key={i}>
                                    <td className="pl-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="skeleton w-8 h-8 rounded-lg" />
                                            <div className="skeleton h-3 w-24 rounded" />
                                        </div>
                                    </td>
                                    <td><div className="skeleton h-5 w-20 rounded-full" /></td>
                                    <td><div className="skeleton h-4 w-48 rounded-md" /></td>
                                    <td className="text-right pr-8"><div className="skeleton h-8 w-24 ml-auto rounded-xl" /></td>
                                </tr>
                            ))
                        ) : reports.map(report => (
                            <tr key={report._id} className="group hover:bg-error/[0.01] transition-colors">
                                <td className="pl-8 py-5">
                                    <span className="text-[13px] font-black text-primary">@{report.reporterId?.username}</span>
                                </td>
                                <td>
                                    <span className="inline-flex px-3 py-1.5 rounded-xl bg-error/5 border border-error/20 text-error text-[9px] font-black uppercase tracking-widest">
                                        {report.reason}
                                    </span>
                                </td>
                                <td>
                                    <p className="text-[13px] font-medium text-muted leading-relaxed line-clamp-1 max-w-md italic opacity-60">
                                        {report.targetId?.content || report.targetId?.body || 'Content Unavailable'}
                                    </p>
                                </td>
                                <td className="text-right pr-8">
                                    <div className="flex items-center justify-end gap-3">
                                        <button
                                            onClick={() => onResolve(report._id, 'dismissed')}
                                            className="px-4 py-2 rounded-xl bg-surface-subtle text-muted text-[9px] font-black uppercase tracking-[0.2em] hover:bg-border transition-all border border-admin-border"
                                        >
                                            Dismiss
                                        </button>
                                        <button
                                            onClick={() => onResolve(report._id, 'resolved')}
                                            className="px-6 py-2 rounded-xl bg-error text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-error/20 hover:scale-[1.02] active:scale-95 transition-all"
                                        >
                                            Resolve
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {reports.length === 0 && (
                <div className="p-20 text-center space-y-4">
                    <div className="text-error/10 flex justify-center"><HiCheck size={48} /></div>
                    <p className="text-[11px] font-black text-muted uppercase tracking-widest">Queue Status: Optimal (0 Flags)</p>
                </div>
            )}
        </motion.div>
    )
}
