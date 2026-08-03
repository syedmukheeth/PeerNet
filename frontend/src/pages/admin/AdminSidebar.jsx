import { useState } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
    HiChevronRight, HiChevronLeft,
    HiOutlineLogout as HiExit,
} from 'react-icons/hi'
import { navGroups } from './navGroups'
import InfrastructurePulse from './InfrastructurePulse'

export default function AdminSidebar({ activeTab, setActiveTab, pulse, reports = [], isOpen, setIsOpen }) {
    const groups = navGroups.map(g => ({
        ...g,
        items: g.items.map(i => i.id === 'reports' ? { ...i, badge: reports.length > 0 ? reports.length : null } : i)
    }))
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] lg:hidden"
                    />
                )}
            </AnimatePresence>

            <aside
                className={`admin-sidebar-v2 ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''} grid grid-rows-[auto_1fr_auto] h-[100dvh] max-h-[100dvh] overflow-hidden`}
                style={{ height: '100dvh', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}
            >
                {/* Header Section */}
                <div className="p-6 border-b border-admin-border/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <Link to="/" className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent-hover/20 p-[1px] shadow-2xl shadow-accent/20 shrink-0 hover:scale-105 transition-transform group/logo">
                                <div className="w-full h-full bg-admin-card rounded-[inherit] flex items-center justify-center overflow-hidden border border-white/5">
                                    <img src="/logo.png" className="w-8 h-8 object-contain group-hover/logo:scale-110 transition-transform" alt="Logo" />
                                </div>
                            </Link>
                            <div className={`transition-all duration-500 sidebar-brand-text ${isCollapsed ? 'opacity-0 -translate-x-10' : 'opacity-100 translate-x-0'}`}>
                                <span className="text-[10px] font-black text-accent uppercase tracking-[0.4em] block">Admin</span>
                                <span className="text-lg font-black text-primary uppercase tracking-tighter">PeerNet</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="hidden lg:flex w-10 h-10 rounded-xl bg-admin-surface-subtle border border-admin-border items-center justify-center text-muted hover:text-accent hover:border-accent transition-all"
                        >
                            {isCollapsed ? <HiChevronRight size={18} /> : <HiChevronLeft size={18} />}
                        </button>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="lg:hidden p-3 rounded-xl bg-admin-surface-subtle text-muted"
                        >
                            <HiChevronLeft size={20} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Navigation */}
                <nav className="overflow-y-auto px-5 custom-scrollbar py-4" style={{ minHeight: 0 }}>
                    <div className="space-y-6">
                        {groups.map(group => (
                            <div key={group.title}>
                                <div className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-4 px-4 opacity-40 admin-sidebar-header-text">{group.title}</div>
                                <div className="flex flex-col gap-1.5">
                                    {group.items.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setActiveTab(item.id)
                                                if (window.innerWidth <= 1024) setIsOpen(false)
                                            }}
                                            className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
                                        >
                                            <div className="relative flex items-center justify-center">
                                                <item.icon size={22} className={activeTab === item.id ? 'text-white' : 'text-accent opacity-60'} />
                                                {item.badge && (
                                                    <span className="absolute -top-3 -right-3 min-w-[20px] h-[20px] bg-error text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-admin-card shadow-lg shadow-error/20">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-black">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </nav>

                {/* Fixed Footer - Compressed for PC parity */}
                <div className="p-4 border-t border-admin-border bg-admin-card/50 backdrop-blur-md">
                    <InfrastructurePulse pulse={pulse} />
                    <Link
                        to="/"
                        className="flex items-center justify-center gap-3 w-full py-4 mt-4 rounded-2xl text-white bg-error shadow-xl shadow-error/20 hover:shadow-error/40 hover:scale-[1.02] active:scale-95 transition-all font-black text-[11px] uppercase tracking-widest border border-white/5"
                    >
                        <HiExit size={20} />
                        <span className="exit-console-text">Exit Console</span>
                    </Link>
                </div>
            </aside>
        </>
    )
}
