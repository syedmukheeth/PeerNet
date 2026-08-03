import { motion } from 'framer-motion'
import { HiSearch, HiTrash, HiChatAlt2 } from 'react-icons/hi'

export default function CommentModule({ comments, onDelete, search, setSearch, loading }) {
    return (
        <motion.div className="admin-surface-el overflow-hidden border-0 md:border">
            {/* Header Section */}
            <div className="p-8 border-b border-admin-border bg-gradient-to-r from-accent/[0.02] to-transparent flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-1">
                    <h3 className="text-2xl font-black text-primary uppercase tracking-tighter">Comments Registry</h3>
                    <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] opacity-80">{comments.length} entries in storage</p>
                </div>

                <div className="relative group w-full md:w-80">
                    <HiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-all" size={18} />
                    <input
                        type="text"
                        placeholder="Search comments..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-admin-card border border-admin-border rounded-2xl pl-14 pr-6 py-4 text-[13px] font-bold text-primary focus:border-accent/50 outline-none transition-all w-full backdrop-blur-xl shadow-inner"
                    />
                </div>
            </div>

            {/* Mobile Comment Cards */}
            <div className="md:hidden divide-y divide-admin-border bg-admin-card/50">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="skeleton w-10 h-10 rounded-xl" />
                                <div className="space-y-1.5">
                                    <div className="skeleton h-3 w-24 rounded" />
                                    <div className="skeleton h-2 w-32 rounded opacity-40" />
                                </div>
                            </div>
                            <div className="skeleton h-16 w-full rounded-2xl" />
                        </div>
                    ))
                ) : comments.map(comment => (
                    <div key={comment._id} className="p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-admin-border bg-admin-card p-0.5">
                                <img src={comment.author?.avatarUrl || `https://ui-avatars.com/api/?name=${comment.author?.username}&background=random`} className="w-full h-full object-cover rounded-[10px]" alt="" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-black text-primary tracking-tight truncate">@{comment.author?.username}</div>
                                <div className="text-[9px] font-bold text-muted uppercase tracking-widest opacity-40 tabular-nums">PID::{comment.post?._id?.slice(-6)}</div>
                            </div>
                        </div>
                        <p className="text-[13px] text-muted leading-relaxed font-medium bg-surface-subtle/50 p-4 rounded-2xl border border-admin-border">
                            {comment.content || comment.body}
                        </p>
                        <button
                            onClick={() => onDelete(comment._id)}
                            className="w-full py-4 rounded-2xl bg-error/10 text-error text-[10px] font-black uppercase tracking-[0.2em] border border-error/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <HiTrash size={16} />
                            Purge Communication
                        </button>
                    </div>
                ))}
            </div>

            {/* Desktop Comment Table */}
            <div className="hidden md:block admin-table-wrap">
                <table className="admin-table w-full">
                    <thead>
                        <tr className="bg-surface-subtle/30">
                            <th scope="col" className="pl-8">Author</th>
                            <th scope="col">Content Fragment</th>
                            <th scope="col">Cluster Link</th>
                            <th scope="col" className="text-right pr-8">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border">
                        {loading ? (
                            Array(8).fill(0).map((_, i) => (
                                <tr key={i}>
                                    <td className="pl-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="skeleton w-10 h-10 rounded-xl" />
                                            <div className="skeleton h-3 w-24 rounded" />
                                        </div>
                                    </td>
                                    <td><div className="skeleton h-4 w-64 rounded-md" /></td>
                                    <td><div className="skeleton h-3 w-32 rounded opacity-30" /></td>
                                    <td className="text-right pr-8"><div className="skeleton w-10 h-10 rounded-2xl mx-auto mr-0" /></td>
                                </tr>
                            ))
                        ) : comments.map(comment => (
                            <tr key={comment._id} className="group hover:bg-accent/[0.01] transition-colors">
                                <td className="pl-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-admin-border p-0.5 bg-admin-card shadow-sm">
                                            <img src={comment.author?.avatarUrl || `https://ui-avatars.com/api/?name=${comment.author?.username}&background=random`} className="w-full h-full object-cover rounded-[10px]" alt="" />
                                        </div>
                                        <span className="text-[13px] font-black text-primary tracking-tight">@{comment.author?.username}</span>
                                    </div>
                                </td>
                                <td>
                                    <p className="text-[13px] font-medium text-muted leading-relaxed line-clamp-1 max-w-md group-hover:text-primary transition-colors">
                                        {comment.content || comment.body}
                                    </p>
                                </td>
                                <td>
                                    <span className="text-[10px] font-black text-muted/30 uppercase tracking-widest tabular-nums">POST::{comment.post?._id?.slice(-8)}</span>
                                </td>
                                <td className="text-right pr-8">
                                    <button
                                        onClick={() => onDelete(comment._id)}
                                        className="w-10 h-10 rounded-2xl bg-surface-subtle border border-admin-border text-muted hover:text-error hover:bg-error/10 hover:border-error/30 transition-all flex items-center justify-center group/act mx-auto mr-0"
                                    >
                                        <HiTrash size={18} className="group-hover/act:scale-110 transition-transform" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {comments.length === 0 && (
                <div className="p-20 text-center space-y-4">
                    <div className="text-muted/10 flex justify-center"><HiChatAlt2 size={48} /></div>
                    <p className="text-[11px] font-black text-muted uppercase tracking-widest">No communications found in cluster</p>
                </div>
            )}
        </motion.div>
    )
}
