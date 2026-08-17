import { motion } from 'framer-motion'
import { HiSearch, HiTrash, HiTrendingUp, HiChatAlt2, HiCollection } from 'react-icons/hi'
import avatarFallback from '../../../components/ui/avatarFallback'

/**
 * PostModule Component
 * Manages the global content feed, allowing administrators to filter by type
 * (Image, Video, Text) and search through the operational database.
 *
 * @param {Array} posts - Filtered list of post objects
 * @param {Function} onDelete - Handler for content termination
 * @param {String} contentType - Current active filter state
 * @param {Function} setContentType - State setter for type filtering
 */
export default function PostModule({ posts, onDelete, contentType, setContentType, search, setSearch, loading }) {
    return (
        <motion.div className="space-y-8">
            {/* Navigation & Search Header */}
            <div className="flex flex-col lg:flex-row gap-6 items-center">
                {/* Segmented controls */}
                <div className="flex-1 flex items-center gap-1.5 bg-admin-card p-2 rounded-[24px] border border-admin-border w-full backdrop-blur-xl shadow-inner">
                    {['all', 'image', 'video', 'text'].map(type => (
                        <button
                            key={type}
                            onClick={() => setContentType(type)}
                            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-[18px] transition-all duration-300 ${
                                contentType === type
                                ? 'bg-accent text-white shadow-xl shadow-accent/40 scale-[1.02]'
                                : 'text-primary hover:bg-surface-subtle hover:text-accent'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Global Search */}
                <div className="relative group w-full lg:w-96">
                    <HiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search global feed..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-admin-card border border-admin-border rounded-[24px] pl-16 pr-8 py-5 text-[14px] font-bold text-primary focus:border-accent/50 focus:bg-accent/[0.02] outline-none transition-all w-full backdrop-blur-xl"
                    />
                </div>
            </div>

            {/* High-Density Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {loading ? (
                    Array(10).fill(0).map((_, i) => (
                        <div key={i} className="admin-surface-el p-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="skeleton w-8 h-8 rounded-full" />
                                <div className="flex flex-col gap-2">
                                    <div className="skeleton h-2 w-16 rounded-full" />
                                    <div className="skeleton h-1.5 w-12 rounded-full opacity-40" />
                                </div>
                            </div>
                            <div className="skeleton h-32 w-full rounded-2xl" />
                            <div className="space-y-2.5">
                                <div className="skeleton h-2 w-full rounded-full" />
                                <div className="skeleton h-2 w-2/3 rounded-full opacity-40" />
                            </div>
                        </div>
                    ))
                ) : posts.map(post => (
                    <div key={post._id} className="admin-surface-el group overflow-hidden flex flex-col h-full hover:border-accent/20 transition-all duration-500 hover:shadow-2xl hover:shadow-accent/[0.05]">
                        {/* Header */}
                        <div className="p-4 flex items-center justify-between border-b border-admin-border bg-gradient-to-r from-accent/[0.02] to-transparent">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-admin-border p-[1px] bg-gradient-to-tr from-accent to-accent/20">
                                    <img
                                        src={post.author?.avatarUrl || avatarFallback(post.author?.username)}
                                        className="w-full h-full object-cover rounded-full border border-admin-card"
                                        alt=""
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[12px] font-black text-primary lowercase tracking-tight line-clamp-1 max-w-[80px]">@{post.author?.username}</span>
                                    <span className="text-[8px] font-bold text-muted uppercase tracking-widest opacity-50">{new Date(post.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="hidden xs:block px-2 py-1 rounded-lg bg-surface-subtle border border-admin-border text-[8px] font-black text-muted uppercase tracking-widest">
                                    {post.type}
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(post._id); }}
                                    className="w-8 h-8 rounded-xl bg-error/5 text-error border border-error/10 flex items-center justify-center hover:bg-error hover:text-white transition-all group/del shadow-sm hover:shadow-error/20"
                                    title="Purge Content"
                                >
                                    <HiTrash size={14} className="group-hover/del:scale-110 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Media Body - Pro Aspect Ratio */}
                        <div className="aspect-[4/5] bg-black relative overflow-hidden group/media">
                            {post.mediaUrl ? (
                                <img src={post.mediaUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover/media:scale-110" alt="" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted/10 bg-surface-subtle/20 gap-2">
                                    <HiCollection size={40} />
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em]">Artifact</span>
                                </div>
                            )}
                        </div>

                        {/* Meta/Content */}
                        <div className="p-4 flex-1 flex flex-col gap-3">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-accent">
                                    <HiTrendingUp size={14} className="opacity-80" />
                                    <span className="text-[12px] font-black">{post.likes?.length || 0}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-muted">
                                    <HiChatAlt2 size={14} className="opacity-80" />
                                    <span className="text-[12px] font-black">{post.comments?.length || 0}</span>
                                </div>
                            </div>

                            {post.content && (
                                <p className="text-[12px] font-medium text-muted leading-relaxed line-clamp-3 bg-surface-subtle/30 p-3 rounded-xl border border-admin-border">
                                    {post.content}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {posts.length === 0 && (
                <div className="admin-surface-el p-32 text-center space-y-6">
                    <div className="text-muted/10 flex justify-center"><HiCollection size={80} /></div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-primary uppercase tracking-tighter">No Active Artifacts</h3>
                        <p className="text-[11px] font-black text-muted uppercase tracking-widest opacity-50">Global feed synchronized with zero results</p>
                    </div>
                </div>
            )}
        </motion.div>
    )
}
