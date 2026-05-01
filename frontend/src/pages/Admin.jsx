import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiUsers, HiCollection, HiTrash, HiRefresh, HiArrowRight,
    HiKey, HiDatabase, HiGlobe, HiSearch, HiChatAlt2, HiFlag, 
    HiTrendingUp, HiCog, HiShieldCheck, HiCheck, HiBan, HiSpeakerphone,
    HiCubeTransparent, HiServer, HiLightningBolt, HiFingerPrint,
    HiClock, HiDotsVertical, HiX, HiAdjustments, HiChevronRight, HiTerminal, HiDatabase as HiHardDrive
} from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'



const AdminSidebar = ({ activeTab, setActiveTab, pulse, stats, reports = [] }) => {
    const navGroups = [
        {
            title: 'Overview',
            items: [
                { id: 'dashboard', label: 'Dashboard', icon: HiGlobe },
                { id: 'analytics', label: 'Analytics', icon: HiTrendingUp }
            ]
        },
        {
            title: 'Manage',
            items: [
                { id: 'users', label: 'Users', icon: HiUsers },
                { id: 'posts', label: 'Posts', icon: HiCollection },
                { id: 'comments', label: 'Comments', icon: HiChatAlt2 },
                { id: 'reports', label: 'Reports', icon: HiFlag, badge: reports.length > 0 ? reports.length : null }
            ]
        },
        {
            title: 'System',
            items: [
                { id: 'infrastructure', label: 'Health', icon: HiDatabase },
                { id: 'audit', label: 'Audit Log', icon: HiShieldCheck }
            ]
        },
        {
            title: 'Admin',
            items: [
                { id: 'settings', label: 'Settings', icon: HiCog }
            ]
        }
    ]

    return (
        <aside className="w-64 flex-shrink-0 flex flex-col gap-6 sticky top-6 h-[calc(100vh-80px)] overflow-y-auto pr-4 scrollbar-hide">
            <div className="flex flex-col gap-12">
                {navGroups.map((group) => (
                    <div key={group.title} className="space-y-6">
                        <div className="flex items-center gap-3 px-6">
                            <div className="w-1 h-1 rounded-full bg-accent/40 shadow-[0_0_8px_rgba(var(--accent-rgb),0.4)]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted opacity-30">{group.title}</span>
                        </div>
                        <div className="space-y-2">
                            {group.items.map(item => (
                                <button 
                                    key={item.id} 
                                    onClick={() => setActiveTab(item.id)} 
                                    className={`w-full group relative flex items-center gap-5 px-6 py-4 rounded-[22px] transition-all duration-300 ${
                                        activeTab === item.id 
                                        ? 'bg-accent text-white shadow-2xl shadow-accent/30 z-10' 
                                        : 'text-muted hover:bg-white/[0.04] hover:text-white'
                                    }`}
                                >
                                    <item.icon size={18} className={`relative z-10 flex-shrink-0 transition-all duration-300 ${activeTab === item.id ? 'text-white' : 'group-hover:text-white'}`} />
                                    <span className="relative z-10 text-[11px] font-black uppercase tracking-[0.25em] truncate">{item.label}</span>
                                    
                                    {item.badge && (
                                        <div className="ml-auto relative z-10 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-lg bg-error text-white text-[9px] font-black shadow-lg shadow-error/30 animate-pulse border border-white/10">
                                            {item.badge}
                                        </div>
                                    )}
                                    
                                    {item.id === 'infrastructure' && pulse?.activeUsers > 0 && activeTab !== item.id && (
                                        <div className="ml-auto relative z-10 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-success/10 text-success text-[8px] font-black border border-success/20">
                                            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
                                            {pulse.activeUsers}
                                        </div>
                                    )}

                                    {activeTab === item.id && (
                                        <motion.div 
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="ml-auto relative z-10 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-auto pt-12 border-t border-border/30">
                <InfrastructurePulse pulse={pulse} />
            </div>
        </aside>
    )
}

const InfrastructurePulse = ({ pulse }) => {
    const [load, setLoad] = useState(pulse?.load || 24)
    const [latency, setLatency] = useState(pulse?.latency || 12)

    useEffect(() => {
        if (pulse) {
            setLoad(pulse.load || load)
            setLatency(pulse.latency || latency)
        }
    }, [pulse])

    return (
        <div className="mt-6 p-6 rounded-[32px] bg-surface-subtle/40 border border-border/40 space-y-6 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
                <HiTerminal className="text-accent" size={12} />
            </div>
            
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em] opacity-50">System Load</span>
                    <span className="text-[11px] font-black text-primary tabular-nums tracking-tighter">{load.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-border/30 rounded-full overflow-hidden p-[1px]">
                    <motion.div 
                        animate={{ width: `${load}%` }}
                        className={`h-full rounded-full ${load > 70 ? 'bg-error shadow-[0_0_10px_rgba(239,68,68,0.5)]' : load > 40 ? 'bg-warning shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-success shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                    <span className="text-[8px] font-black text-muted uppercase tracking-widest block mb-1">Latency</span>
                    <span className="text-[12px] font-black text-primary tabular-nums tracking-tighter">{latency.toFixed(0)}ms</span>
                </div>
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                    <span className="text-[8px] font-black text-muted uppercase tracking-widest block mb-1">Users</span>
                    <span className="text-[12px] font-black text-primary tabular-nums tracking-tighter">{pulse?.activeUsers || 0}</span>
                </div>
            </div>

            <div className="flex gap-1 h-8 items-end justify-between px-1">
                {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div 
                        key={i}
                        animate={{ height: `${20 + Math.random() * 80}%`, opacity: [0.2, 0.5, 0.2] }}
                        transition={{ repeat: Infinity, duration: 1.5 + Math.random(), repeatType: 'reverse' }}
                        className="w-1.5 bg-accent/20 rounded-full"
                    />
                ))}
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

const StatCard = ({ label, value, sub, icon, chartData, accent }) => (
    <div 
        role="article"
        aria-label={`${label}: ${value}`}
        className={`admin-stat-card group relative overflow-hidden transition-all duration-500 hover:-translate-y-1.5 ${accent ? 'border-error/20 ring-1 ring-error/5' : 'hover:border-accent/50'}`}
    >
        <div className="chart-bg opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
                <div className={`p-3 rounded-[18px] bg-surface-subtle text-muted group-hover:text-accent group-hover:scale-110 transition-all duration-500 shadow-inner border border-white/5`}>
                    {React.cloneElement(icon, { size: 18 })}
                </div>
                {chartData && chartData.length > 0 && (
                    <div className="w-20 h-10 opacity-30 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-110">
                        <Sparkline data={chartData} color={accent ? 'var(--error)' : 'var(--accent)'} />
                    </div>
                )}
            </div>
            <div className="space-y-1 mt-auto">
                <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.25em] opacity-50 group-hover:opacity-80 transition-opacity">{label}</h4>
                <div className="text-4xl font-black text-primary tracking-tighter tabular-nums drop-shadow-2xl mb-2">
                    {value}
                </div>
                <div className="flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${accent ? 'bg-error shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]'} animate-pulse`} />
                    <p className="text-[9px] font-black text-muted opacity-40 uppercase tracking-[0.15em] leading-none">{sub}</p>
                </div>
            </div>
        </div>
    </div>
)


// --- High-Fidelity Modules ---

const AnalyticsModule = ({ stats, analytics }) => {
    const chartData = stats?.charts?.userGrowth || []
    const pathData = chartData.length > 0 
        ? chartData.map((d, i) => `${(i / (chartData.length - 1)) * 1000},${300 - (d.count * 10)}`).join(' L ')
        : "0,250 Q100,220 200,240 T400,180 T600,120 T800,150 T1000,80"

    const svgPath = chartData.length > 0 ? `M ${pathData}` : `M ${pathData}`
    const areaPath = chartData.length > 0 ? `${svgPath} V 300 H 0 Z` : `${pathData} V 300 H 0 Z`
    
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
            <div className="grid grid-cols-1 2xl:grid-cols-3 gap-8">
                <div className="2xl:col-span-2 admin-surface-el p-8 md:p-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_12px_rgba(var(--accent-rgb),0.5)]" />
                                <h3 className="text-2xl font-black text-primary uppercase tracking-tighter">Network Velocity</h3>
                            </div>
                            <p className="text-[11px] font-black text-muted uppercase tracking-[0.2em] opacity-40">Live Platform Throughput & Growth</p>
                        </div>
                        <div className="flex gap-8">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-muted uppercase tracking-widest opacity-40 mb-1">Load State</span>
                                <span className="text-[12px] font-black text-success uppercase flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                                    Optimal
                                </span>
                            </div>
                            <div className="flex flex-col items-end border-l border-border/50 pl-8">
                                <span className="text-[10px] font-black text-muted uppercase tracking-widest opacity-40 mb-1">Uptime</span>
                                <span className="text-[12px] font-black text-primary uppercase tabular-nums">99.99%</span>
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
                        <h3 className="text-xl font-black text-primary uppercase tracking-tighter">Geographical</h3>
                        <p className="text-[11px] font-black text-muted uppercase tracking-[0.2em] mt-1 opacity-40">Traffic Distribution</p>
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
                                <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden p-[1.5px] border border-white/5 shadow-inner">
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

const StorageModule = ({ stats }) => {
    const storage = stats?.storage || { usedMB: 2400, maxMB: 10240, percentage: 24 }
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Object Count" value={((stats?.totalPosts || 0) + (stats?.totalStories || 0)).toLocaleString()} sub="TOTAL BUCKET ASSETS" icon={<HiDatabase />} />
                <StatCard label="Bandwidth" value={stats?.bandwidthUsage || '0 GB'} sub="TOTAL CONSUMPTION" icon={<HiTrendingUp />} />
                <StatCard label="Disk Usage" value={`${(storage.usedMB / 1024).toFixed(1)} GB`} sub={`${storage.percentage}% CAPACITY`} icon={<HiHardDrive />} />
                <StatCard label="Synchronicity" value={`${stats?.health?.synchronicity || '100'}%`} sub="SYSTEM HEALTH" icon={<HiShieldCheck />} />
            </div>

            <div className="admin-surface-el p-10">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-xl font-black text-primary uppercase tracking-tight">Cloud Buckets</h3>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 rounded-full bg-success/10 text-success text-[10px] font-black uppercase tracking-widest border border-success/20">Optimized</span>
                    </div>
                </div>
                
                <div className="space-y-10">
                    {[
                        { name: 'Media Storage (Production)', type: 'S3 Standard', size: `${(storage.usedMB * 0.7).toFixed(0)} MB`, usage: storage.percentage, color: 'var(--accent)' },
                        { name: 'Static Assets (CDN)', type: 'CloudFront Edge', size: '120 MB', usage: 15, color: 'var(--success)' },
                        { name: 'Database Backups', type: 'Glacier Deep Archive', size: `${(storage.usedMB * 0.3).toFixed(0)} MB`, usage: Math.min(100, storage.percentage + 10), color: 'var(--warning)' }
                    ].map(bucket => (
                        <div key={bucket.name} className="group cursor-pointer">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <h4 className="text-sm font-black text-primary uppercase tracking-tight group-hover:text-accent transition-colors">{bucket.name}</h4>
                                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1 opacity-40">{bucket.type} • {bucket.size}</p>
                                </div>
                                <span className="text-[13px] font-black text-primary tabular-nums">{bucket.usage}%</span>
                            </div>
                            <div className="h-2 w-full bg-surface-subtle rounded-full overflow-hidden border border-border/50">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${bucket.usage}%` }}
                                    style={{ background: bucket.color }}
                                    className="h-full rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)]"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}

const UserModule = ({ users, onVerify, onDelete, loading, search, setSearch }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-surface-el">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div>
                        <h3 className="text-xl font-black text-primary uppercase tracking-tighter">Users</h3>
                        <p className="text-[11px] font-black text-muted uppercase tracking-[0.2em] mt-1 opacity-40">{users.length} registered accounts</p>
                    </div>
                    <button className="hidden md:flex items-center gap-3 px-5 py-2.5 rounded-[20px] bg-accent text-white text-[10px] font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-[0_8px_20px_rgba(var(--accent-rgb),0.25)] ring-1 ring-white/20">
                        <HiShieldCheck size={14} />
                        Add User
                    </button>
                </div>
                <div className="relative group w-full md:w-96">
                    <HiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-all" />
                    <input 
                        type="text" 
                        placeholder="Search Identity Cluster..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-black/20 border border-border/40 rounded-[22px] pl-14 pr-8 py-4 text-[13px] font-black text-primary placeholder:text-muted/40 focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none transition-all w-full backdrop-blur-md"
                    />
                </div>
        </div>
        <div className="overflow-x-auto">
            <table className="admin-table">
                <thead>
                    <tr>
                        <th scope="col">Identity Cluster</th>
                        <th scope="col">Auth Status</th>
                        <th scope="col">Privilege</th>
                        <th scope="col" className="text-right">Access Control</th>
                    </tr>
                </thead>
                <tbody>
                    {users.filter(u => 
                        u.username.toLowerCase().includes(search.toLowerCase()) || 
                        u.email.toLowerCase().includes(search.toLowerCase())
                    ).map(user => (
                        <tr key={user._id}>
                            <td>
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-surface-subtle shadow-lg">
                                        <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=random`} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-primary tracking-tight">@{user.username}</div>
                                        <div className="text-[10px] font-bold text-muted uppercase opacity-40">{user.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${user.isVerified ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-muted opacity-30'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${user.isVerified ? 'text-success' : 'text-muted opacity-40'}`}>
                                        {user.isVerified ? 'Verified' : 'Pending'}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-surface-subtle border-border text-muted'}`}>
                                    {user.role}
                                </span>
                            </td>
                            <td className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => onVerify(user._id)} 
                                        aria-label={`Verify ${user.username}`}
                                        className="p-2.5 rounded-xl bg-surface-subtle text-muted hover:text-success hover:bg-success/10 transition-all border border-transparent hover:border-success/20 group/btn"
                                    >
                                        <HiShieldCheck size={18} className="group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                    <button 
                                        onClick={() => onDelete(user._id)} 
                                        aria-label={`Delete ${user.username}`}
                                        className="p-2.5 rounded-xl bg-surface-subtle text-muted hover:text-error hover:bg-error/10 transition-all border border-transparent hover:border-error/20 group/btn"
                                    >
                                        <HiTrash size={18} className="group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                <div className="p-20 text-center space-y-4">
                    <div className="text-muted/20 flex justify-center"><HiUsers size={48} /></div>
                    <p className="text-[11px] font-black text-muted uppercase tracking-widest">No matching entities in cluster</p>
                </div>
            )}
        </div>
    </motion.div>
)

const CommentModule = ({ comments, onDelete, search, setSearch }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-surface-el">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h3 className="text-xl font-black text-primary uppercase tracking-tight">Comments</h3>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1 opacity-40">Review and remove comments</p>
            </div>
            <div className="relative group">
                <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
                <input 
                    type="text" 
                    placeholder="Filter comments..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-surface-subtle border border-border rounded-2xl pl-12 pr-6 py-3.5 text-[13px] font-bold text-primary focus:border-accent outline-none transition-all w-full md:w-80"
                />
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="admin-table">
                <thead>
                    <tr>
                        <th scope="col">Operator Node</th>
                        <th scope="col">Transmission Payload</th>
                        <th scope="col">Target Reference</th>
                        <th scope="col" className="text-right">Purge Protocol</th>
                    </tr>
                </thead>
                <tbody>
                    {comments.map(comment => (
                        <tr key={comment._id} className="group">
                            <td>
                                <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-surface-subtle border border-white/5">
                                        <img src={comment.author?.avatarUrl || `https://ui-avatars.com/api/?name=${comment.author?.username}&background=random`} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <span className="text-[11px] font-black text-primary tracking-tight lowercase">@{comment.author?.username}</span>
                                </div>
                            </td>
                            <td>
                                <p className="text-[12px] font-medium text-muted leading-relaxed line-clamp-1 max-w-sm group-hover:text-primary transition-colors">
                                    {comment.content || comment.body}
                                </p>
                            </td>
                            <td>
                                <span className="text-[10px] font-black text-muted/30 uppercase tracking-widest tabular-nums">ID::{comment.post?._id?.slice(-6) || 'N/A'}</span>
                            </td>
                            <td className="text-right">
                                <button 
                                    onClick={() => onDelete(comment._id)} 
                                    aria-label={`Purge comment by ${comment.author?.username}`}
                                    className="p-3 rounded-2xl bg-error/5 text-error opacity-0 group-hover:opacity-100 transition-all border border-error/10 hover:bg-error hover:text-white transform translate-x-2 group-hover:translate-x-0 group/btn"
                                >
                                    <HiTrash size={18} className="group-hover/btn:scale-110 transition-transform" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {comments.length === 0 && (
                <div className="p-20 text-center space-y-4">
                    <div className="text-muted/10 flex justify-center"><HiTerminal size={40} /></div>
                    <p className="text-[11px] font-black text-muted uppercase tracking-widest opacity-30">No communications found in cluster</p>
                </div>
            )}
        </div>
    </motion.div>
)

const AuditModule = ({ logs, loading }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-surface-el">
        <div className="p-6 border-b border-border flex items-center justify-between">
            <div>
                <h3 className="text-xl font-black text-primary uppercase tracking-tight">Audit Log</h3>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1 opacity-40">Permanent record of all admin actions</p>
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
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-subtle border border-border text-[10px] font-black uppercase tracking-widest text-muted hover:text-primary transition-all shadow-sm"
                >
                    <HiTerminal size={14} />
                    Export Epoch
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] font-black text-success uppercase tracking-widest">Live Registry</span>
                </div>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="admin-table">
                <thead>
                    <tr>
                        <th scope="col">Event Timestamp</th>
                        <th scope="col">Auth Actor</th>
                        <th scope="col">Operation Node</th>
                        <th scope="col" className="text-right">System Context</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map(log => (
                        <tr key={log._id} className="group hover:bg-white/[0.01] transition-all">
                            <td>
                                <span className="text-[10px] font-black text-muted uppercase tracking-widest tabular-nums opacity-60">
                                    {new Date(log.createdAt).toLocaleTimeString()}
                                </span>
                            </td>
                            <td>
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-accent/10 flex items-center justify-center text-accent text-[10px] font-black border border-accent/20">
                                        {log.adminId?.username?.charAt(0).toUpperCase() || 'S'}
                                    </div>
                                    <span className="text-[11px] font-black text-primary tracking-tight lowercase">@{log.adminId?.username || 'system'}</span>
                                </div>
                            </td>
                            <td>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-accent uppercase tracking-tighter">{log.action}</span>
                                    <span className="text-[9px] text-muted opacity-40 truncate max-w-[180px] font-bold uppercase">{log.details}</span>
                                </div>
                            </td>
                            <td className="text-right">
                                <span className="px-2.5 py-1 rounded-lg bg-surface-subtle border border-border text-[9px] font-black text-muted uppercase tracking-[0.2em]">{log.targetType}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {logs.length === 0 && (
                <div className="p-20 text-center space-y-4">
                    <div className="text-muted/10 flex justify-center"><HiTerminal size={40} /></div>
                    <p className="text-[11px] font-black text-muted uppercase tracking-widest opacity-30">No operational records found in audit trail</p>
                </div>
            )}
        </div>
    </motion.div>
)

const PostModule = ({ posts, onDelete, contentType, setContentType, search, setSearch }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 flex items-center justify-between bg-surface-subtle p-1.5 rounded-2xl border border-border/50 w-full">
                {['all', 'image', 'video', 'text'].map(type => (
                    <button 
                        key={type}
                        onClick={() => setContentType(type)}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${contentType === type ? 'bg-bg text-accent shadow-sm' : 'text-muted hover:text-primary'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>
            <div className="relative group w-full md:w-80">
                <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search posts..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-surface-subtle border border-border rounded-2xl pl-12 pr-6 py-2.5 text-[12px] font-bold text-primary focus:border-accent outline-none transition-all w-full"
                />
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
            {posts.map(post => (
                <div key={post._id} className="admin-surface-el group overflow-hidden">
                    <div className="aspect-video bg-surface-subtle relative overflow-hidden">
                        {post.mediaUrl ? (
                            <img src={post.mediaUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted/10 bg-black/40">
                                <HiCollection size={48} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                            <button 
                                onClick={() => onDelete(post._id)} 
                                aria-label={`Purge object ${post._id}`}
                                className="p-4 rounded-[22px] bg-error text-white shadow-2xl shadow-error/40 hover:scale-110 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300 flex items-center gap-2 group/btn"
                            >
                                <HiTrash size={22} className="group-hover/btn:rotate-12 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest pr-2">Execute Purge</span>
                            </button>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-6 h-6 rounded-lg overflow-hidden bg-surface-subtle border border-white/5">
                                <img src={post.author?.avatarUrl || `https://ui-avatars.com/api/?name=${post.author?.username}&background=random`} className="w-full h-full object-cover" alt="" />
                            </div>
                            <span className="text-[11px] font-black text-primary tracking-tight lowercase">@{post.author?.username}</span>
                        </div>
                        <p className="text-[13px] text-muted line-clamp-2 leading-relaxed mb-6 font-medium opacity-70">{post.content}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em] opacity-40">{post.type} • {new Date(post.createdAt).toLocaleDateString()}</span>
                            <div className="flex items-center gap-2 text-accent">
                                <HiTrendingUp size={14} className="opacity-50" />
                                <span className="text-[10px] font-black tracking-widest">{post.likes?.length || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
        {posts.length === 0 && (
            <div className="admin-surface-el p-32 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-accent/5 flex items-center justify-center text-accent/20 animate-pulse">
                    <HiCollection size={40} />
                </div>
                <div className="space-y-2">
                    <h4 className="text-sm font-black text-primary uppercase tracking-widest">No Content Found</h4>
                    <p className="text-[11px] font-bold text-muted uppercase tracking-[0.2em] opacity-30">Archive cluster is empty or search returned zero nodes</p>
                </div>
            </div>
        )}
    </motion.div>
)

const ReportModule = ({ reports, onResolve }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-surface-el">
        <div className="p-6 border-b border-border flex items-center justify-between bg-error/[0.02]">
            <div>
                <h3 className="text-xl font-black text-primary uppercase tracking-tight flex items-center gap-3">
                    <HiFlag className="text-error" /> Reports
                </h3>
                <p className="text-[10px] font-bold text-error uppercase tracking-widest mt-1 opacity-60">{reports.length} pending reports</p>
            </div>
            <HiShieldCheck className="text-error/20" size={32} />
        </div>
        <div className="overflow-x-auto">
            <table className="admin-table">
                <thead>
                    <tr>
                        <th scope="col">Origin Node</th>
                        <th scope="col">Violation Classification</th>
                        <th scope="col">Target Artifact</th>
                        <th scope="col" className="text-right">Moderation protocol</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map(report => (
                        <tr key={report._id} className="bg-error/[0.01]">
                            <td>
                                <span className="text-[11px] font-black text-primary">@{report.reporterId?.username}</span>
                            </td>
                            <td>
                                <span className="px-2.5 py-1 rounded-lg bg-error/10 border border-error/20 text-error text-[9px] font-black uppercase tracking-widest">
                                    {report.reason}
                                </span>
                            </td>
                            <td>
                                <div className="text-[11px] font-medium text-muted line-clamp-1 max-w-xs">
                                    {report.targetId?.content || report.targetId?.body || 'Content Unavailable'}
                                </div>
                            </td>
                            <td className="text-right">
                                <div className="flex justify-end gap-3">
                                    <button 
                                        onClick={() => onResolve(report._id, 'dismissed')} 
                                        aria-label="Dismiss violation report"
                                        className="px-5 py-2.5 rounded-xl bg-surface-subtle text-[9px] font-black uppercase tracking-[0.2em] hover:bg-border transition-all border border-white/5"
                                    >
                                        Dismiss
                                    </button>
                                    <button 
                                        onClick={() => onResolve(report._id, 'resolved')} 
                                        aria-label="Resolve violation report"
                                        className="px-5 py-2.5 rounded-xl bg-error text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-error/20 hover:scale-[1.05] active:scale-95 transition-all border border-white/10"
                                    >
                                        Resolve
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {reports.length === 0 && (
                        <tr>
                            <td colSpan="4" className="py-20 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.4em]">Queue Cleared</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </motion.div>
)

export default function Admin() {

    const [activeTab, setActiveTab] = useState('dashboard')
    const [stats, setStats] = useState(null)
    const [analytics, setAnalytics] = useState(null)
    const [pulse, setPulse] = useState({ load: 0.12, latency: 42, activeUsers: 0 })
    const [users, setUsers] = useState([])
    const [posts, setPosts] = useState([])
    const [comments, setComments] = useState([])
    const [feedback, setFeedback] = useState([])
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

    const fetchFeedback = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/feedback')
            if (data.success) setFeedback(data.items)
        } catch {
            toast.error('Feedback queue inaccessible')
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



    const handleModerationAction = async (report, action) => {
        const targetId = report.targetId?._id || report.targetId
        const userId = report.targetId?.author?._id || report.targetId?._id

        try {
            if (action === 'remove') {
                const endpoint = report.targetType === 'Post' ? `/admin/posts/${targetId}` : 
                               report.targetType === 'Comment' ? `/admin/comments/${targetId}` : 
                               `/admin/stories/${targetId}`
                await api.delete(endpoint)
                await handleResolveReport(report._id, 'resolved', 'Content removed by admin')
            } else if (action === 'warn') {
                const message = prompt('Enter warning message for the user:', 'Your content has been flagged for violating community guidelines.')
                if (!message) return
                await api.post(`/admin/users/${userId}/warn`, { message })
                toast.success('Warning sent')
            } else if (action === 'ban') {
                if (!window.confirm('Are you sure you want to BAN this user?')) return
                await api.patch(`/admin/users/${userId}/status`, { status: 'banned', reason: 'Repeated violations' })
                await handleResolveReport(report._id, 'resolved', 'User banned')
            } else if (action === 'approve') {
                await handleResolveReport(report._id, 'dismissed', 'Content approved after review')
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Moderation action failed')
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

    const init = useCallback(async () => {
        setLoading(true)
        await Promise.all([
            fetchStats(), 
            fetchAnalytics(),
            fetchUsers(), 
            fetchPosts(contentType), 
            fetchComments(),
            fetchFeedback(), 
            fetchReports(), 
            fetchLogs()
        ])
        setLoading(false)
    }, [fetchStats, fetchAnalytics, fetchUsers, fetchPosts, fetchComments, fetchFeedback, fetchReports, fetchLogs, contentType])

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

    const handleToggleVerify = async (userId) => {
        try {
            await api.patch(`/admin/users/${userId}/verify`)
            toast.success('Validation status updated')
            fetchUsers(search)
            fetchStats()
        } catch {
            toast.error('Validation update failed')
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

    if (loading && !stats) {
        return (
            <div className="admin-page min-h-screen px-4 py-8 md:px-8 lg:px-12 max-w-[1400px] mx-auto">
                <header className="mb-10 opacity-30">
                    <div className="skeleton h-2 w-16 mb-3" />
                    <div className="skeleton h-7 w-56 rounded-lg" />
                </header>
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-12">
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <div key={i} className="admin-stat-card">
                            <div className="skeleton h-4 w-12 mb-4" />
                            <div className="skeleton h-8 w-20 mb-2" />
                            <div className="skeleton h-3 w-16" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-bg text-primary selection:bg-accent/30 p-4 md:p-8 lg:p-12 xl:p-16 font-sans relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            </div>

            <div className="max-w-[1700px] mx-auto relative">
                {/* SYSTEM HEADER */}
                <header className="mb-16 lg:mb-24 relative">
                    <div className="absolute -left-12 top-0 bottom-0 w-1 bg-accent/20 rounded-full blur-[2px] hidden xl:block opacity-20" />
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 flex items-center gap-2">
                                <span className="text-[8px] font-black text-accent uppercase tracking-[0.3em]">Infra v2.1.0</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                <span className="text-[9px] font-black text-success uppercase tracking-[0.4em]">Operational</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <h1 className="text-6xl md:text-8xl font-black text-primary tracking-tighter uppercase leading-[0.85] drop-shadow-sm">
                                Admin<br/><span className="text-muted/10">Console</span>
                            </h1>
                            <div className="h-20 w-px bg-border/40 hidden md:block" />
                            <button 
                                onClick={init}
                                disabled={loading}
                                className={`group w-16 h-16 rounded-[24px] bg-surface-subtle border border-border/50 flex items-center justify-center text-muted hover:text-accent hover:border-accent/30 transition-all shadow-lg active:scale-90 ${loading ? 'animate-spin text-accent' : ''}`}
                            >
                                <HiRefresh size={28} className="group-hover:rotate-180 transition-transform duration-700" />
                            </button>
                        </div>
                        <nav className="flex items-center gap-4 mt-8 text-[11px] font-black uppercase tracking-[0.4em]">
                            <span className="text-muted/30 hover:text-muted/50 transition-colors cursor-default">System Cluster</span>
                            <HiChevronRight className="text-muted/10" />
                            <span className="text-muted/30 hover:text-muted/50 transition-colors cursor-default">Core Registry</span>
                            <HiChevronRight className="text-muted/10" />
                            <span className="text-accent drop-shadow-[0_0_12px_rgba(var(--accent-rgb),0.5)] bg-accent/5 px-3 py-1.5 rounded-lg border border-accent/10">{activeTab}</span>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-surface-subtle rounded-[24px] border border-border/50">
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20">
                            <HiShieldCheck size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Protocol Active</span>
                            <span className="text-[9px] font-bold text-muted uppercase">Secure Environment</span>
                        </div>
                    </div>
                    </div>
                </header>

                <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-12 lg:mb-16">
                    <StatCard label="Total Users" value={(stats?.totalUsers || 0).toLocaleString()} sub="Registered accounts" icon={<HiUsers size={14} />} chartData={stats?.charts?.userGrowth?.map(d => d.count)} />
                    <StatCard label="New Today" value={stats?.signupsToday || 0} sub="Joined today" icon={<HiTrendingUp size={14} />} />
                    <StatCard label="Active Now" value={pulse?.activeUsers || stats?.activeToday || 0} sub="Online users" icon={<HiGlobe size={14} />} accent />
                    <StatCard label="Total Posts" value={(stats?.totalPosts || 0).toLocaleString()} sub="All content" icon={<HiCollection size={14} />} chartData={stats?.charts?.postGrowth?.map(d => d.count)} />
                    <StatCard label="Comments Today" value={stats?.commentsToday || 0} sub="Daily comments" icon={<HiChatAlt2 size={14} />} />
                    <StatCard label="Pending Reports" value={stats?.pendingReports || 0} accent={stats?.pendingReports > 0} sub="Need review" icon={<HiFlag size={14} />} />
                </section>

                <div className="flex flex-row gap-6 items-start">
                    <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} pulse={pulse} stats={stats} reports={reports} />
                    <main className="flex-1 min-w-0 min-h-[800px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20, filter: 'blur(12px)' }}
                                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, x: -20, filter: 'blur(12px)' }}
                                transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
                            >
                                {activeTab === 'dashboard' && <AnalyticsModule stats={stats} analytics={analytics} key="dashboard" />}
                                {activeTab === 'users' && (
                                    <UserModule 
                                        key="users"
                                        users={users} 
                                        search={search} 
                                        setSearch={setSearch} 
                                        onVerify={handleToggleVerify} 
                                        onDelete={(id) => { setTargetUserId(id); setShowDeleteModal(true); }}
                                        loading={loading}
                                    />
                                )}
                                {activeTab === 'posts' && (
                                    <PostModule 
                                        key="posts"
                                        posts={posts.filter(p => 
                                            (p.content || '').toLowerCase().includes(search.toLowerCase()) || 
                                            (p.author?.username || '').toLowerCase().includes(search.toLowerCase())
                                        )} 
                                        onDelete={handleDeletePost} 
                                        contentType={contentType} 
                                        setContentType={setContentType}
                                        search={search}
                                        setSearch={setSearch}
                                    />
                                )}
                                {activeTab === 'comments' && (
                                    <CommentModule 
                                        key="comments"
                                        comments={comments.filter(c => 
                                            (c.content || c.body || '').toLowerCase().includes(search.toLowerCase()) ||
                                            (c.author?.username || '').toLowerCase().includes(search.toLowerCase())
                                        )} 
                                        onDelete={handleDeleteComment} 
                                        search={search} 
                                        setSearch={setSearch} 
                                    />
                                )}
                                {activeTab === 'reports' && (
                                    <ReportModule 
                                        key="reports"
                                        reports={reports} 
                                        onResolve={handleResolveReport} 
                                        onAction={handleModerationAction}
                                    />
                                )}
                                {activeTab === 'infrastructure' && (
                                    <div key="infra" className="space-y-12">
                                        <InfrastructurePulse pulse={pulse} />
                                        <StorageModule stats={stats} />
                                    </div>
                                )}
                                {activeTab === 'audit' && (
                                    <AuditModule key="audit" logs={logs} loading={loading} />
                                )}
                                {activeTab === 'settings' && (
                                    <div className="space-y-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="admin-surface-el p-10 bg-gradient-to-br from-surface-subtle/20 to-transparent">
                                                <h3 className="text-xl font-black text-primary uppercase tracking-tighter mb-8">Platform Identity</h3>
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between p-5 bg-black/20 rounded-[20px] border border-white/5">
                                                        <span className="text-[11px] font-black text-muted uppercase tracking-widest">Environment</span>
                                                        <span className="text-[11px] font-black text-accent uppercase tracking-widest px-3 py-1 rounded-full bg-accent/10 border border-accent/20">Production</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-5 bg-black/20 rounded-[20px] border border-white/5">
                                                        <span className="text-[11px] font-black text-muted uppercase tracking-widest">Registry Lock</span>
                                                        <div className="w-10 h-5 bg-success/20 rounded-full relative shadow-inner"><div className="absolute right-1 top-1 w-3 h-3 bg-success rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" /></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="admin-surface-el p-10 border-dashed border-error/20 bg-error/[0.02]">
                                                <h3 className="text-xl font-black text-error uppercase tracking-tighter mb-8">Danger Zone</h3>
                                                <p className="text-[12px] text-muted font-medium mb-10 opacity-50 leading-relaxed">Irreversible administrative actions. All events are logged to the permanent system audit trail.</p>
                                                <div className="space-y-4">
                                                    <button
                                                        onClick={() => { setSystemActionType('users'); setShowSystemModal(true); }}
                                                        className="w-full py-4 bg-error/5 text-error text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-error/10 hover:bg-error hover:text-white transition-all"
                                                    >
                                                        Purge User Database
                                                    </button>
                                                    <button
                                                        onClick={() => { setSystemActionType('full'); setShowSystemModal(true); }}
                                                        className="w-full py-4 bg-error text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-error/20 hover:scale-[1.02] active:scale-95 transition-all"
                                                    >
                                                        Full Factory Reset
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>

            {/* --- CORE MODALS --- */}
            
            <AnimatePresence>
                {/* Purge Confirmation */}
                {showDeleteModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="w-full max-w-md admin-surface-el p-12 text-center shadow-2xl">
                            <h2 className="text-2xl font-bold text-primary mb-4 uppercase tracking-tighter">Confirm Deletion?</h2>
                            <p className="text-muted font-medium text-sm mb-10 leading-relaxed">This user account and all their content will be permanently removed from the platform.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button className="py-4 rounded-lg border border-border font-bold text-[10px] tracking-widest uppercase hover:bg-surface-subtle" onClick={() => setShowDeleteModal(false)}>Abort</button>
                                <button className="py-4 rounded-lg bg-error text-white font-bold text-[10px] tracking-widest uppercase" onClick={handleDeleteUser}>Confirm</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* System Authentication */}
                {showSystemModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-surface-overlay/90 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-lg bg-bg border border-error/30 rounded-[32px] overflow-hidden shadow-2xl shadow-error/10"
                        >
                            <div className="p-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-14 h-14 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center text-error">
                                        <HiShieldCheck size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-primary uppercase tracking-tight">Access Clearance Required</h3>
                                        <p className="text-[10px] font-bold text-error uppercase tracking-[0.3em] mt-1">High-Risk Operation: {systemActionType}</p>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {/* Security Step 1 */}
                                    <div>
                                        <label className="block text-[10px] font-black text-muted uppercase tracking-widest mb-4">
                                            1. Type <span className="text-primary">DELETE</span> to confirm
                                        </label>
                                        <input 
                                            type="text"
                                            value={systemConfirmCode}
                                            onChange={(e) => setSystemConfirmCode(e.target.value)}
                                            placeholder="DELETE"
                                            className="w-full bg-surface-subtle border border-border rounded-xl px-5 py-4 text-sm font-bold text-primary focus:border-error/50 focus:bg-error/5 outline-none transition-all placeholder:opacity-20"
                                        />
                                    </div>

                                    {/* Security Step 2 */}
                                    <div>
                                        <label className="block text-[10px] font-black text-muted uppercase tracking-widest mb-4">
                                            2. Verify Administrator Identity
                                        </label>
                                        <input 
                                            type="password"
                                            value={systemAdminPassword}
                                            onChange={(e) => setSystemAdminPassword(e.target.value)}
                                            placeholder="Enter Administrator Password"
                                            className="w-full bg-surface-subtle border border-border rounded-xl px-5 py-4 text-sm font-bold text-primary focus:border-error/50 focus:bg-error/5 outline-none transition-all placeholder:opacity-20"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-12">
                                    <button 
                                        onClick={() => setShowSystemModal(false)}
                                        className="flex-1 py-4 text-[11px] font-black text-muted uppercase tracking-widest hover:text-primary transition-colors"
                                    >
                                        Abort
                                    </button>
                                    <button 
                                        disabled={systemConfirmCode !== 'DELETE' || !systemAdminPassword || isExecutingSystem}
                                        onClick={handleSystemAction}
                                        className={`flex-[2] py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                                            systemConfirmCode === 'DELETE' && systemAdminPassword
                                            ? 'bg-error text-white shadow-xl shadow-error/20 hover:scale-[1.02] active:scale-95'
                                            : 'bg-surface-subtle text-muted cursor-not-allowed'
                                        }`}
                                    >
                                        {isExecutingSystem ? (
                                            <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
                                        ) : (
                                            <>EXECUTE PURGE</>
                                        )}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-error/5 p-4 border-t border-error/10 text-center">
                                <p className="text-[9px] font-bold text-error uppercase tracking-widest opacity-60">This action will be logged in the permanent audit trail</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AdminFooter user={user} />
        </div>
    </div>
    )
}

const AdminFooter = ({ user }) => {
    return (
        <footer className="mt-20 py-10 border-t border-border opacity-40">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] mb-1.5 opacity-50">Infrastructure</span>
                        <span className="text-[11px] font-bold text-primary tracking-widest uppercase">v1.0.0-PROD</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] mb-1.5 opacity-50">Status</span>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[11px] font-bold text-success uppercase tracking-widest">Nominal</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <div className="text-right hidden md:block">
                        <span className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] block mb-1.5 opacity-50">Registry Sync</span>
                        <span className="text-[11px] font-bold text-primary tracking-widest lowercase">Last: {new Date().toLocaleTimeString()}</span>
                    </div>
                    <div className="bg-surface-subtle px-5 py-2.5 rounded-xl border border-border flex items-center gap-3">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-muted uppercase tracking-[0.2em] mb-0.5 opacity-50">Session Operator</span>
                            <span className="text-[12px] font-bold text-accent tracking-tight">@{user?.username}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-12 text-center">
                <p className="text-[9px] font-bold text-text-3 uppercase tracking-[0.4em] opacity-20">© 2026 PeerNet Governance • Restricted Infrastructure Access</p>
            </div>
        </footer>
    )
}
