import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiUsers, HiCollection, HiTrash, HiRefresh,
    HiDatabase, HiGlobe, HiSearch, HiChatAlt2, HiFlag, 
    HiTrendingUp, HiShieldCheck, HiCheck,
    HiServer, HiLightningBolt,
    HiClock, HiChevronRight, HiChevronLeft, HiTerminal, HiDatabase as HiHardDrive,
    HiOutlineLogout as HiExit, HiMenu
} from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'
import '../admin_v2.css'



const navGroups = [
    {
        title: 'Insights',
        items: [
            { id: 'dashboard', label: 'Summary', icon: HiGlobe },
            { id: 'analytics', label: 'Performance', icon: HiTrendingUp }
        ]
    },
    {
        title: 'Moderation',
        items: [
            { id: 'users', label: 'Users', icon: HiUsers },
            { id: 'posts', label: 'All Content', icon: HiCollection },
            { id: 'comments', label: 'Comments', icon: HiChatAlt2 },
            { id: 'reports', label: 'Reports', icon: HiFlag }
        ]
    },
    {
        title: 'Settings',
        items: [
            { id: 'infrastructure', label: 'Server Health', icon: HiDatabase },
            { id: 'audit', label: 'Activity Logs', icon: HiShieldCheck }
        ]
    }
]

const AdminSidebar = ({ activeTab, setActiveTab, pulse, reports = [], isOpen, setIsOpen }) => {
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
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-lg shadow-accent/20 shrink-0">
                                <span className="text-white font-black text-xs">PN</span>
                            </div>
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


const InfrastructurePulse = ({ pulse }) => {
    const [load, setLoad] = useState(pulse?.load || 24)
    const [latency, setLatency] = useState(pulse?.latency || 12)

    useEffect(() => {
        if (pulse) {
            setLoad(prev => pulse.load || prev)
            setLatency(prev => pulse.latency || prev)
        }
    }, [pulse])

    return (
        <div className="p-4 rounded-[24px] bg-black/20 border border-white/5 space-y-4 relative overflow-hidden group infrastructure-pulse-details">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    <span className="text-[9px] font-black text-muted uppercase tracking-widest">Node Status</span>
                </div>
                <HiHardDrive className="text-muted opacity-20" size={12} />
            </div>
            
            <div className="space-y-3">
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-muted">
                        <span>CPU Load</span>
                        <span className="text-primary tabular-nums">{load.toFixed(1)}%</span>
                    </div>
                    <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${load}%` }}
                            className={`h-full rounded-full ${load > 80 ? 'bg-error' : 'bg-accent'}`}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black text-muted uppercase">Latency</span>
                        <span className="text-[10px] font-black text-primary">{latency}ms</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] font-black text-muted uppercase">Users</span>
                        <span className="text-[10px] font-black text-primary">{pulse?.users || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

const Sparkline = ({ data = [], color = 'var(--accent)' }) => {
    if (!data || data.length < 2) return null
    
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const width = 100
    const height = 40
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((val - min) / range) * height
        return `${x},${y}`
    }).join(' ')

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible preserve-3d">
            <defs>
                <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <motion.polyline
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
            <path
                d={`M 0 ${height} L ${points} L ${width} ${height} Z`}
                fill="url(#sparkGradient)"
                stroke="none"
            />
        </svg>
    )
}

const StatCard = ({ label, value, sub, icon, chartData, accent, loading }) => (
    <div className="admin-stat-card-v2 group">
        {loading ? (
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div className="skeleton w-12 h-12 rounded-2xl" />
                    <div className="skeleton w-24 h-6 rounded-lg opacity-20" />
                </div>
                <div className="space-y-3">
                    <div className="skeleton h-8 w-2/3 rounded-xl" />
                    <div className="skeleton h-3 w-1/2 rounded-md opacity-40" />
                </div>
                <div className="skeleton h-12 w-full rounded-2xl opacity-10" />
            </div>
        ) : (
            <>
                <div className="flex items-start justify-between mb-8">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${accent ? 'bg-error/10 text-error shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-accent/10 text-accent shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]'} group-hover:scale-110 group-hover:rotate-3`}>
                        {React.cloneElement(icon, { size: 22 })}
                    </div>
                    {chartData && (
                        <div className="w-20 h-10 opacity-30 group-hover:opacity-100 transition-opacity duration-700">
                            <Sparkline data={chartData} color={accent ? 'var(--error)' : 'var(--accent)'} />
                        </div>
                    )}
                </div>
                
                <div>
                    <div className="flex items-center gap-2 mb-1 opacity-40">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
                    </div>
                    <div className="text-4xl font-black text-primary tracking-tighter mb-4 group-hover:text-accent transition-colors duration-500">
                        {value}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${accent ? 'bg-error animate-pulse' : 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.4)]'}`} />
                        <span className="text-[9px] font-bold text-muted uppercase tracking-widest">{sub}</span>
                    </div>
                </div>
            </>
        )}
    </div>
)



// --- High-Fidelity Modules ---

const AnalyticsModule = ({ stats }) => {
    const chartData = stats?.charts?.userGrowth || []
    const pathData = chartData.length > 0 
        ? chartData.map((d, i) => `${(i / (chartData.length - 1)) * 1000},${300 - (d.count * 10)}`).join(' L ')
        : "0,250 Q100,220 200,240 T400,180 T600,120 T800,150 T1000,80"

    const svgPath = `M ${pathData}`
    const areaPath = `${svgPath} V 300 H 0 Z`
    
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
            <div className="grid grid-cols-1 2xl:grid-cols-3 gap-8">
                <div className="2xl:col-span-2 admin-surface-el p-8 md:p-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_12px_rgba(var(--accent-rgb),0.5)]" />
                                <h3 className="text-2xl font-black text-primary uppercase tracking-tighter">Traffic Growth</h3>
                            </div>
                            <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] opacity-70">Live platform performance & activity</p>
                        </div>
                        <div className="flex gap-8">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest opacity-70 mb-1">System Status</span>
                                <span className="text-[12px] font-black text-success uppercase flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                                    Working
                                </span>
                            </div>
                            <div className="flex flex-col items-end border-l border-border/50 pl-8">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest opacity-70 mb-1">Reliability</span>
                                <span className="text-[12px] font-black text-primary uppercase tabular-nums">99.9%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-[340px] w-full relative">
                        <svg viewBox="0 0 1000 300" className="w-full h-full overflow-visible preserve-3d">
                            <defs>
                                <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                                </linearGradient>
                                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="6" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>
                            {/* Grid Lines */}
                            {[0, 1, 2, 3].map(i => (
                                <line key={i} x1="0" y1={i * 100} x2="1000" y2={i * 100} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="8 8" opacity="0.3" />
                            ))}
                             <motion.path
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 2.5, ease: "easeInOut" }}
                                d={svgPath}
                                fill="none"
                                stroke="var(--accent)"
                                strokeWidth="4"
                                strokeLinecap="round"
                                filter="url(#glow)"
                            />
                            <path
                                d={areaPath}
                                fill="url(#velocityGradient)"
                            />
                        </svg>
                    </div>
                </div>

                <div className="admin-surface-el p-8 md:p-12 flex flex-col justify-between bg-gradient-to-br from-surface-subtle/20 to-transparent">
                    <div>
                        <h3 className="text-xl font-black text-primary uppercase tracking-tighter">Traffic Locations</h3>
                        <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mt-1 opacity-70">Where users are coming from</p>
                    </div>
                    <div className="space-y-8 py-12">
                        {[
                            { label: 'North America', value: 42, color: 'bg-accent' },
                            { label: 'Europe', value: 28, color: 'bg-success' },
                            { label: 'Asia Pacific', value: 18, color: 'bg-warning' },
                            { label: 'Others', value: 12, color: 'bg-muted' }
                        ].map(region => (
                            <div key={region.label} className="group cursor-default">
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-primary mb-3">
                                    <span className="opacity-60 group-hover:opacity-100 transition-opacity">{region.label}</span>
                                    <span className="text-accent drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.3)] tabular-nums">{region.value}%</span>
                                </div>
                                <div className="h-2 w-full bg-surface-subtle rounded-full overflow-hidden p-[1.5px] border border-subtle shadow-inner">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${region.value}%` }}
                                        transition={{ duration: 1.5, ease: "circOut" }}
                                        className={`h-full rounded-full ${region.color} shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full py-5 bg-accent/5 border border-accent/20 text-[11px] font-black uppercase tracking-[0.3em] rounded-[22px] text-accent hover:bg-accent hover:text-white transition-all shadow-xl shadow-accent/5 active:scale-95">
                        Full Topology View
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

const InfrastructureModule = ({ pulse }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Memory Heap" value={pulse?.system?.heapUsed || '0 MB'} sub="NODEJS ALLOCATION" icon={<HiServer />} />
            <StatCard label="Processing" value={`${pulse?.system?.cpuSeconds || 0}s`} sub="CPU EXECUTION TIME" icon={<HiLightningBolt />} />
            <StatCard label="Network Pulse" value={pulse?.connectedClients || 0} sub="ACTIVE SOCKETS" icon={<HiGlobe />} />
        </div>
        
        <div className="admin-surface-el p-10">
            <h3 className="text-xl font-black text-primary uppercase tracking-tight mb-8">System Registry</h3>
            <div className="space-y-6">
                {[
                    { label: 'Database Status', status: 'Online', color: 'text-success' },
                    { label: 'Chat Connection', status: 'Active', color: 'text-success' },
                    { label: 'System Uptime', status: pulse?.system?.uptime ? `${Math.floor(pulse.system.uptime / 60)}m ${pulse.system.uptime % 60}s` : 'Initializing', color: 'text-accent' },
                    { label: 'Activity Log', status: 'Recording', color: 'text-warning' }
                ].map(node => (
                    <div key={node.label} className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5">
                        <span className="text-[11px] font-black text-muted uppercase tracking-widest">{node.label}</span>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full bg-current ${node.color}`} />
                            <span className={`text-[11px] font-black uppercase tracking-widest ${node.color}`}>{node.status}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </motion.div>
)

/**
 * UserModule Component
 * Provides a high-fidelity interface for identity management, 
 * featuring responsive table-to-card transformation for mobile administrative access.
 */
const UserModule = ({ users, onVerify, onDelete, loading, search, setSearch }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-surface-el overflow-hidden border-0 md:border">
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
                u.username.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase())
            ).map(user => (
                <div key={user._id} className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-admin-border bg-admin-card">
                            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=random`} className="w-full h-full object-cover" alt="" />
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
                        u.username.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase())
                    ).map(user => (
                        <tr key={user._id} className="group hover:bg-accent/[0.02] transition-colors">
                            <td className="pl-8 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-admin-border bg-admin-card">
                                            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=random`} className="w-full h-full object-cover" alt="" />
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
                                    user.role === 'admin'
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
        {users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())).length === 0 && (
            <div className="p-16 text-center space-y-3">
                <div className="text-muted/20 flex justify-center"><HiUsers size={40} /></div>
                <p className="text-[11px] font-black text-muted uppercase tracking-widest">No users found</p>
            </div>
        )}
    </motion.div>
)

const CommentModule = ({ comments, onDelete, search, setSearch, loading }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-surface-el overflow-hidden border-0 md:border">
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

const AuditModule = ({ logs, loading }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-surface-el overflow-hidden border-0 md:border">
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

/**
 * PostModule Component
 * Manages the global content feed, allowing administrators to filter by type
 * (Image, Video, Text) and search through the operational database.
 * 
 * @param {Array} posts - Filtered list of post objects
 * @param {Function} onDelete - Handler for content termination
 * @param {String} contentType - Current active filter state
 * @param {Function} setContentType - State setter for type filtering
 */const PostModule = ({ posts, onDelete, contentType, setContentType, search, setSearch, loading }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
        {/* Navigation & Search Header */}
        <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Premium Segmented Controls */}
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
                            <div className="space-y-1.5">
                                <div className="skeleton h-2.5 w-16 rounded" />
                                <div className="skeleton h-2 w-12 rounded opacity-40" />
                            </div>
                        </div>
                        <div className="skeleton h-32 w-full rounded-xl" />
                        <div className="space-y-2">
                            <div className="skeleton h-3 w-full rounded" />
                            <div className="skeleton h-3 w-2/3 rounded" />
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
                                    src={post.author?.avatarUrl || `https://ui-avatars.com/api/?name=${post.author?.username}&background=random`} 
                                    className="w-full h-full object-cover rounded-full border border-admin-card" 
                                    alt="" 
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[12px] font-black text-primary lowercase tracking-tight line-clamp-1 max-w-[80px]">@{post.author?.username}</span>
                                <span className="text-[8px] font-bold text-muted uppercase tracking-widest opacity-50">{new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="px-2 py-0.5 rounded-lg bg-surface-subtle border border-admin-border text-[8px] font-black text-muted uppercase tracking-widest">
                            {post.type}
                        </div>
                    </div>

                    {/* Media Body - Compact Height */}
                    <div className="h-32 bg-black relative overflow-hidden group/media">
                        {post.mediaUrl ? (
                            <img src={post.mediaUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover/media:scale-110" alt="" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted/10 bg-surface-subtle/20 gap-2">
                                <HiCollection size={40} />
                                <span className="text-[9px] font-black uppercase tracking-[0.4em]">Artifact</span>
                            </div>
                        )}
                        
                        {/* Desktop Hover Overlay */}
                        <div className="hidden lg:flex absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all items-center justify-center backdrop-blur-[4px]">
                            <button 
                                onClick={() => onDelete(post._id)} 
                                className="px-5 py-3 rounded-xl bg-error text-white shadow-2xl shadow-error/40 hover:scale-110 active:scale-95 transition-all transform translate-y-2 group-hover:translate-y-0 duration-500 flex items-center gap-2"
                            >
                                <HiTrash size={18} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Delete</span>
                            </button>
                        </div>
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
                            <p className="text-[12px] font-medium text-muted leading-relaxed line-clamp-2 bg-surface-subtle/30 p-3 rounded-xl border border-admin-border">
                                {post.content}
                            </p>
                        )}
                        
                        {/* Mobile Action Bar (Visible < 1024px) */}
                        <div className="lg:hidden mt-auto pt-3 border-t border-admin-border">
                            <button 
                                onClick={() => onDelete(post._id)} 
                                className="w-full py-3 rounded-xl bg-error text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-error/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                <HiTrash size={16} />
                                Delete
                            </button>
                        </div>
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

const ReportModule = ({ reports, onResolve, loading }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-surface-el overflow-hidden border-0 md:border border-error/20">
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

export default function Admin() {

    const [activeTab, setActiveTab] = useState('dashboard')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [stats, setStats] = useState(null)
    const [analytics, setAnalytics] = useState(null)
    const [pulse, setPulse] = useState({ load: 0.12, latency: 42, activeUsers: 0 })
    const [users, setUsers] = useState([])
    const [posts, setPosts] = useState([])
    const [comments, setComments] = useState([])
    const [reports, setReports] = useState([])
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [contentType, setContentType] = useState('all')

    const { user } = useAuth()
    const socket = useSocket(user)

    useEffect(() => {
        if (socket) {
            socket.on('infrastructure_pulse', (data) => {
                setPulse(data)
                // Optionally update stats with latest user count etc.
                setStats(prev => prev ? { ...prev, ...data } : data)
            })
            return () => socket.off('infrastructure_pulse')
        }
    }, [socket])

    const [showSystemModal, setShowSystemModal] = useState(false)
    const [systemActionType, setSystemActionType] = useState('')
    const [systemConfirmCode, setSystemConfirmCode] = useState('')
    const [systemAdminPassword, setSystemAdminPassword] = useState('')
    const [isExecutingSystem, setIsExecutingSystem] = useState(false)
    
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [targetUserId, setTargetUserId] = useState(null)

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/stats')
            if (data.success) setStats(data.data)
        } catch {
            toast.error('Failed to load system metrics')
        }
    }, [])

    const fetchUsers = useCallback(async (q = '') => {
        try {
            const { data } = await api.get(`/admin/users?search=${q}`)
            if (data.success) setUsers(data.users)
        } catch {
            toast.error('Failed to connect to user database')
        }
    }, [])

    const fetchPosts = useCallback(async (type = 'all') => {
        try {
            const { data } = await api.get(`/admin/posts?type=${type}`)
            if (data.success) setPosts(data.posts)
        } catch {
            toast.error('Failed to load moderation feed')
        }
    }, [])

    const fetchComments = useCallback(async (q = '') => {
        try {
            const { data } = await api.get(`/admin/comments?search=${q}`)
            if (data.success) setComments(data.comments)
        } catch {
            toast.error('Failed to load comment database')
        }
    }, [])


    const fetchReports = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/reports?status=pending')
            if (data.success) setReports(data.reports || [])
        } catch {
            toast.error('Failed to load pending reports')
        }
    }, [])

    const fetchLogs = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/logs')
            if (data.success) setLogs(data.logs || [])
        } catch {
            toast.error('Audit trail disconnected')
        }
    }, [])

    const handleResolveReport = async (reportId, status, resolution = '') => {
        try {
            await api.patch(`/admin/reports/${reportId}`, { status, resolution })
            toast.success(`Report ${status}`)
            fetchReports()
        } catch {
            toast.error('Action failed')
        }
    }


    const fetchAnalytics = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/analytics')
            if (data.success) setAnalytics(data.data)
        } catch {
            console.error('Failed to load advanced analytics')
        }
    }, [])

    /**
     * Data Initialization & Polling
     * Orchestrates the retrieval of system-wide metrics, user databases, 
     * and security logs from the central infrastructure.
     */
    const init = useCallback(async () => {
        setLoading(true)
        await Promise.all([
            fetchStats(), 
            fetchAnalytics(),
            fetchUsers(), 
            fetchPosts(contentType), 
            fetchComments(),
            fetchReports(), 
            fetchLogs()
        ])
        setLoading(false)
    }, [fetchStats, fetchAnalytics, fetchUsers, fetchPosts, fetchComments, fetchReports, fetchLogs, contentType])

    useEffect(() => {
        init()
    }, [init])

    const handleDeleteUser = async () => {
        if (!targetUserId) return
        try {
            await api.delete(`/admin/users/${targetUserId}`)
            toast.success('User account deleted successfully')
            setShowDeleteModal(false)
            setTargetUserId(null)
            init()
        } catch {
            toast.error('Deletion operation failed')
            setShowDeleteModal(false)
        }
    }

    const handleDeletePost = async (postId) => {
        try {
            await api.delete(`/admin/posts/${postId}`)
            toast.success('Post removed from platform')
            fetchPosts(contentType)
            fetchReports()
            fetchStats()
            fetchUsers()
        } catch {
            toast.error('Removal failed')
        }
    }

    const handleDeleteComment = async (commentId) => {
        try {
            await api.delete(`/admin/comments/${commentId}`)
            toast.success('Comment purged')
            fetchComments(search)
            fetchReports()
            fetchStats()
        } catch {
            toast.error('Purge operation failed')
        }
    }

    const handleToggleVerify = async (userId, currentlyVerified) => {
        try {
            await api.patch(`/admin/users/${userId}/verify`)
            toast.success(currentlyVerified ? 'User unverified' : 'User verified')
            fetchUsers(search)
            fetchStats()
        } catch {
            toast.error('Verification update failed')
        }
    }

    const handleSystemAction = async () => {
        if (systemConfirmCode !== 'DELETE') {
            return toast.error('Please type DELETE to confirm')
        }
        if (!systemAdminPassword) {
            return toast.error('Admin password is required')
        }

        try {
            setIsExecutingSystem(true)
            const { data } = await api.delete('/admin/infrastructure/nuke', {
                data: { 
                    type: systemActionType, 
                    confirmationCode: systemConfirmCode,
                    adminPassword: systemAdminPassword
                }
            })
            if (data.success) {
                toast.success('Operation executed successfully')
                setShowSystemModal(false)
                setSystemConfirmCode('')
                setSystemAdminPassword('')
                init()
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Authentication failed')
        } finally {
            setIsExecutingSystem(false)
        }
    }

    /**
     * Module Orchestrator
     * Dynamically renders the appropriate administrative interface based
     * on the active navigation context.
     * 
     * @returns {React.Component} The active module interface
     */
    const renderModule = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            <StatCard 
                                label="Global Identities" 
                                value={(stats?.totalUsers || 0).toLocaleString()} 
                                sub="Verified Users" 
                                icon={<HiUsers />} 
                                chartData={stats?.charts?.userGrowth?.map(d => d.count)}
                                loading={loading}
                            />
                            <StatCard 
                                label="Feed Velocity" 
                                value={(stats?.totalPosts || 0).toLocaleString()} 
                                sub="Broadcast Objects" 
                                icon={<HiCollection />} 
                                chartData={[4, 8, 5, 9, 12, 10, 15, 8, 14, 18]}
                                loading={loading}
                            />
                            <StatCard 
                                label="Security Queue" 
                                value={reports.length.toString()} 
                                sub="Pending Violations" 
                                icon={<HiFlag />} 
                                accent={reports.length > 0}
                                loading={loading}
                            />
                            <StatCard 
                                label="System Health" 
                                value="99.9%" 
                                sub="Uptime Velocity" 
                                icon={<HiTrendingUp />} 
                                loading={loading}
                            />
                        </div>
                        <AnalyticsModule stats={stats} analytics={analytics} />
                    </div>
                )
            case 'analytics':
                return <AnalyticsModule stats={stats} analytics={analytics} />
            case 'users':
                return (
                    <UserModule 
                        users={users} 
                        search={search} 
                        setSearch={setSearch} 
                        onVerify={(id) => { const u = users.find(x => x._id === id); handleToggleVerify(id, u?.isVerified); }}
                        onDelete={(id) => { setTargetUserId(id); setShowDeleteModal(true); }}
                        loading={loading}
                    />
                )
            case 'posts':
                return (
                    <PostModule 
                        posts={posts.filter(p => 
                            (p.content || '').toLowerCase().includes(search.toLowerCase()) || 
                            (p.author?.username || '').toLowerCase().includes(search.toLowerCase())
                        )} 
                        onDelete={handleDeletePost} 
                        contentType={contentType} 
                        setContentType={setContentType}
                        search={search}
                        setSearch={setSearch}
                        loading={loading}
                    />
                )
            case 'comments':
                return (
                    <CommentModule 
                        comments={comments.filter(c => (c.content || '').toLowerCase().includes(search.toLowerCase()))} 
                        onDelete={handleDeleteComment} 
                        search={search}
                        setSearch={setSearch}
                        loading={loading}
                    />
                )
            case 'reports':
                return (
                    <ReportModule 
                        reports={reports} 
                        onResolve={handleResolveReport} 
                        loading={loading}
                    />
                )
            case 'infrastructure':
                return <InfrastructureModule pulse={pulse} />
            case 'audit':
                return <AuditModule logs={logs} loading={loading} />
            case 'settings':
                return (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="admin-surface-el p-10 bg-gradient-to-br from-accent/[0.03] to-transparent">
                                <h3 className="text-xl font-black text-primary uppercase tracking-tighter mb-8">Platform Identity</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-5 bg-surface-subtle rounded-2xl border border-subtle">
                                        <span className="text-[11px] font-black text-muted uppercase tracking-widest">Environment</span>
                                        <span className="text-[11px] font-black text-accent uppercase tracking-widest px-3 py-1 rounded-full bg-accent/10 border border-accent/20">Production-PN</span>
                                    </div>
                                    <div className="flex items-center justify-between p-5 bg-surface-subtle rounded-2xl border border-subtle">
                                        <span className="text-[11px] font-black text-muted uppercase tracking-widest">Registry Lock</span>
                                        <div className="w-10 h-5 bg-success/20 rounded-full relative shadow-inner"><div className="absolute right-1 top-1 w-3 h-3 bg-success rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" /></div>
                                    </div>
                                </div>
                            </div>
                            <div className="admin-surface-el p-10 border-dashed border-error/20 bg-error/[0.02]">
                                <h3 className="text-xl font-black text-error uppercase tracking-tighter mb-8">Danger Zone</h3>
                                <p className="text-[12px] text-muted font-bold mb-10 opacity-50 leading-relaxed">High-risk administrative operations. All executions are recorded to the permanent system registry.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button
                                        onClick={() => { setSystemActionType('users'); setShowSystemModal(true); }}
                                        className="py-4 bg-error/5 text-error text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-error/10 hover:bg-error hover:text-white transition-all"
                                    >
                                        Purge Identities
                                    </button>
                                    <button
                                        onClick={() => { setSystemActionType('full'); setShowSystemModal(true); }}
                                        className="py-4 bg-error text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-error/20 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        Factory Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    if (loading && !stats) {
        return (
            <div className="admin-root-v2">
                {/* Sidebar Skeleton */}
                <aside className="sidebar admin-sidebar-override">
                    <div className="px-4 mb-8">
                        <div className="skeleton h-4 w-24 mb-2 rounded-full opacity-50" />
                        <div className="skeleton h-8 w-32 rounded-xl" />
                    </div>
                    <div className="space-y-6 px-2">
                        {[1, 2, 3].map(g => (
                            <div key={g} className="space-y-3">
                                <div className="skeleton h-3 w-16 ml-2 opacity-30" />
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="skeleton h-12 w-full rounded-2xl opacity-40" />
                                ))}
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="admin-main-col">
                    <div className="admin-content-inner p-6 md:p-12 space-y-12">
                        <header className="flex justify-between items-end pb-8 border-b border-white/5">
                            <div className="space-y-4">
                                <div className="skeleton h-4 w-32 rounded-full opacity-50" />
                                <div className="skeleton h-12 w-64 rounded-2xl" />
                            </div>
                            <div className="flex gap-4">
                                <div className="skeleton h-12 w-12 rounded-2xl" />
                                <div className="skeleton h-12 w-48 rounded-2xl" />
                            </div>
                        </header>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="skeleton h-48 rounded-[32px]" />
                            ))}
                        </div>
                        <div className="skeleton h-[400px] rounded-[40px]" />
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="admin-root-v2 h-screen overflow-hidden">
            {/* Sidebar */}
            <AdminSidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                pulse={stats?.health}
                stats={stats}
                reports={reports}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />



            {/* Main Content Area */}
            <main className="admin-main-col h-[100dvh] overflow-y-auto custom-scrollbar">
                <div className="px-4 pt-2 pb-4 md:px-10 md:pt-4 md:pb-10 max-w-[1700px] mx-auto">
                    {/* Page Header */}
                    <header className="flex items-center justify-between gap-4 mb-4 md:mb-6 border-b border-subtle pb-4 md:pb-5">
                        <div className="flex items-center gap-6">
                            <button 
                                onClick={() => setIsSidebarOpen(prev => !prev)}
                                className={`lg:hidden p-4 rounded-2xl bg-admin-card border text-primary shadow-xl transition-all ${isSidebarOpen ? 'border-accent bg-accent/5' : 'border-admin-border'}`}
                            >
                                <HiMenu size={24} />
                            </button>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-[2px] bg-accent" />
                                    <span className="text-[10px] font-black text-accent uppercase tracking-[0.4em]">Admin Console</span>
                                </div>
                                <h1 className="admin-h1-v2">
                                    {navGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || activeTab}
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => init()}
                                className="w-12 h-12 rounded-2xl bg-surface-subtle border border-subtle flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-all group"
                                title="Refresh Data"
                            >
                                <HiRefresh size={20} className="group-hover:rotate-180 transition-all duration-700" />
                            </button>
                            <div className="hidden sm:flex items-center gap-4 pl-4 border-l border-subtle">
                                <div className="text-right">
                                    <div className="text-xs font-black text-primary uppercase tracking-tight">@{user?.username}</div>
                                    <div className="text-[9px] font-bold text-success uppercase tracking-widest">Platform Admin</div>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center font-black shadow-lg shadow-accent/20">
                                    {user?.username?.substring(0, 2).toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </header>


                    {/* Module Render */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            >
                                {renderModule()}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <footer className="mt-20 py-10 border-t border-white/5 opacity-40">
                        <div className="max-w-[1700px] mx-auto">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="flex items-center gap-8">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] mb-1.5 opacity-50">Infrastructure</span>
                                        <span className="text-[11px] font-bold text-primary tracking-widest uppercase">v2.0.0-GOV</span>
                                    </div>
                                    <div className="h-10 w-[1px] bg-white/10" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] mb-1.5 opacity-50">Status</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[11px] font-bold text-success uppercase tracking-widest">Nominal</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[9px] font-bold text-muted uppercase tracking-[0.4em] opacity-20">© 2026 PeerNet Admin • Restricted Infrastructure Access</p>
                            </div>
                        </div>
                    </footer>
                </div>
            </main>

            {/* Global Overlays */}
            <AnimatePresence>
                {/* Delete Confirmation */}
                {showDeleteModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md" onClick={() => setShowDeleteModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-md admin-surface-el-v2 p-10 text-center shadow-2xl border-error/20">
                            <div className="w-16 h-16 rounded-full bg-error/10 border border-error/20 flex items-center justify-center text-error mx-auto mb-6">
                                <HiFlag size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-primary mb-3 uppercase tracking-tighter">Terminate Asset?</h2>
                            <p className="text-muted font-bold text-sm mb-10 leading-relaxed opacity-60">This operation is destructive and cannot be reversed. All associated data will be purged.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button className="py-4 rounded-xl border border-subtle font-black text-[10px] tracking-[0.2em] uppercase hover:bg-surface-subtle transition-all" onClick={() => setShowDeleteModal(false)}>Abort</button>
                                <button className="py-4 rounded-xl bg-error text-white font-black text-[10px] tracking-[0.2em] uppercase shadow-lg shadow-error/20 hover:scale-[1.02] active:scale-95 transition-all" onClick={handleDeleteUser}>Terminate</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* System Authentication */}
                {showSystemModal && (
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
                                        <p className="text-[10px] font-black text-error uppercase tracking-[0.3em] mt-1.5 opacity-80">Action: {systemActionType}</p>
                                    </div>
                                </div>

                                <div className="space-y-10">
                                    <div>
                                        <label className="block text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-4 opacity-50">
                                            1. Identity Confirmation (Type <span className="text-error">DELETE</span>)
                                        </label>
                                        <input 
                                            type="text"
                                            value={systemConfirmCode}
                                            onChange={(e) => setSystemConfirmCode(e.target.value)}
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
                                            value={systemAdminPassword}
                                            onChange={(e) => setSystemAdminPassword(e.target.value)}
                                            placeholder="••••••••••••"
                                            className="w-full bg-surface-subtle border border-subtle rounded-2xl px-6 py-5 text-sm font-black text-primary focus:border-error/50 focus:bg-error/5 outline-none transition-all placeholder:opacity-10"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-6 mt-14">
                                    <button 
                                        onClick={() => setShowSystemModal(false)}
                                        className="flex-1 py-5 text-[11px] font-black text-muted uppercase tracking-[0.3em] hover:text-primary transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        disabled={systemConfirmCode !== 'DELETE' || !systemAdminPassword || isExecutingSystem}
                                        onClick={handleSystemAction}
                                        className={`flex-[2] py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${
                                            systemConfirmCode === 'DELETE' && systemAdminPassword
                                            ? 'bg-error text-white shadow-xl shadow-error/40 hover:scale-[1.02] active:scale-95'
                                            : 'bg-surface-subtle text-muted/30 cursor-not-allowed'
                                        }`}
                                    >
                                        {isExecutingSystem ? (
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
                )}
            </AnimatePresence>
        </div>
    )
}
