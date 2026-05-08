import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    HiUsers, HiCollection, HiTrash, HiRefresh, HiArrowRight,
    HiKey, HiDatabase, HiGlobe, HiSearch, HiChatAlt2, HiFlag, 
    HiTrendingUp, HiCog, HiShieldCheck, HiCheck, HiBan, HiSpeakerphone,
    HiCubeTransparent, HiServer, HiLightningBolt, HiFingerPrint,
    HiClock, HiDotsVertical, HiX, HiAdjustments, HiChevronRight, HiTerminal, HiDatabase as HiHardDrive,
    HiHome, HiOutlineLogout as HiExit
} from 'react-icons/hi'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'
import '../admin_v2.css'



const AdminSidebar = ({ activeTab, setActiveTab, pulse, stats, reports = [] }) => {
    const navGroups = [
        {
            title: 'Operations',
            items: [
                { id: 'dashboard', label: 'Command Center', icon: HiGlobe },
                { id: 'analytics', label: 'Intelligence', icon: HiTrendingUp }
            ]
        },
        {
            title: 'Platform Assets',
            items: [
                { id: 'users', label: 'Identities', icon: HiUsers },
                { id: 'posts', label: 'Broadcasts', icon: HiCollection },
                { id: 'comments', label: 'Transmissions', icon: HiChatAlt2 },
                { id: 'reports', label: 'Violations', icon: HiFlag, badge: reports.length > 0 ? reports.length : null }
            ]
        },
        {
            title: 'Infrastructure',
            items: [
                { id: 'infrastructure', label: 'Core Health', icon: HiDatabase },
                { id: 'audit', label: 'Audit Trail', icon: HiShieldCheck }
            ]
        }
    ]

    return (
        <aside className="sidebar admin-sidebar-override">
            {/* Top: Branding */}
            <div className="sidebar-logo-row mb-8">
                <Link to="/" className="flex flex-col gap-1 px-4 group">
                    <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_var(--accent)] animate-pulse" />
                        <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">Governance v2</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <h2 className="text-2xl font-black text-primary tracking-tighter uppercase leading-none group-hover:text-accent transition-colors">Command</h2>
                        <HiHome size={18} className="text-muted/20 group-hover:text-accent transition-all opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0" />
                    </div>
                </Link>
            </div>

            {/* Middle: Navigation */}
            <nav className="sidebar-nav no-scrollbar px-2 flex-1">
                {navGroups.map(group => (
                    <div key={group.title} className="mb-8">
                        <div className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-4 px-4 opacity-50">{group.title}</div>
                        <div className="flex flex-col gap-1.5">
                            {group.items.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`ig-link w-full border-none bg-transparent text-left px-4 py-3.5 rounded-2xl flex items-center gap-4 transition-all duration-300 ${
                                        activeTab === item.id 
                                        ? 'bg-accent/10 text-accent' 
                                        : 'text-muted hover:bg-white/5 hover:text-primary'
                                    }`}
                                >
                                    <div className="relative">
                                        <item.icon size={22} className={activeTab === item.id ? 'text-accent' : 'text-muted/60'} />
                                        {item.badge && (
                                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-error text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-black">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-[13px] tracking-tight ${activeTab === item.id ? 'font-black' : 'font-bold'}`}>
                                        {item.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bottom: Infrastructure */}
            <div className="sidebar-footer border-t border-white/5 pt-4 space-y-4">
                <Link 
                    to="/" 
                    className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-muted hover:bg-white/5 hover:text-primary transition-all group"
                >
                    <div className="ig-icon-wrap !bg-error/10 !border-error/20">
                        <HiExit size={20} className="text-error group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-[13px] font-black uppercase tracking-widest">Exit Console</span>
                </Link>
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
                        animate={{ height: `${20 + Math.random() * 80}%`, opacity: [0.3, 0.7, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.5 + Math.random(), repeatType: 'reverse' }}
                        className="w-1.5 bg-accent/40 rounded-full"
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
    <div className="admin-stat-card-v2 group">
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
                <div className={`w-1 h-1 rounded-full ${accent ? 'bg-error animate-pulse' : 'bg-success shadow-[0_0_10px_#22c55e]'}`} />
                <span className="text-[9px] font-bold text-muted uppercase tracking-widest">{sub}</span>
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

const InfrastructureModule = ({ pulse }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Processor Load" value={`${pulse?.load?.toFixed(1) || 0.1}%`} sub="CPU UTILIZATION" icon={<HiServer />} />
            <StatCard label="Memory Latency" value={`${pulse?.latency || 42}ms`} sub="BUFFER DELAY" icon={<HiLightningBolt />} />
            <StatCard label="Active Nodes" value={pulse?.activeUsers || 0} sub="CONCURRENT CONNECTIONS" icon={<HiGlobe />} />
        </div>
        
        <div className="admin-surface-el p-10">
            <h3 className="text-xl font-black text-primary uppercase tracking-tight mb-8">System Registry</h3>
            <div className="space-y-6">
                {[
                    { label: 'Database Status', status: 'Online', color: 'text-success' },
                    { label: 'Socket Bridge', status: 'Connected', color: 'text-success' },
                    { label: 'CDN Edge', status: 'Optimal', color: 'text-accent' },
                    { label: 'Audit Trail', status: 'Recording', color: 'text-warning' }
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
        <div className="admin-table-wrap">
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
        <div className="admin-table-wrap">
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
        <div className="admin-table-wrap">
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
        <div className="flex flex-col md:flex-row gap-5 items-center">
            <div className="flex-1 flex items-center justify-between bg-surface-subtle/50 p-2 rounded-2xl border border-white/5 w-full backdrop-blur-md">
                {['all', 'image', 'video', 'text'].map(type => (
                    <button 
                        key={type}
                        onClick={() => setContentType(type)}
                        className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${contentType === type ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-primary'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>
            <div className="relative group w-full md:w-96">
                <HiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search global feed..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-surface-subtle/50 border border-white/5 rounded-2xl pl-14 pr-6 py-3.5 text-[13px] font-bold text-primary focus:border-accent/50 outline-none transition-all w-full backdrop-blur-md"
                />
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {posts.map(post => (
                <div key={post._id} className="admin-surface-el group overflow-hidden flex flex-col h-full hover:border-accent/20 transition-colors">
                    {/* IG Style Header */}
                    <div className="p-4 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 p-[2px] bg-gradient-to-tr from-[#6559CA] via-[#E1306C] to-[#FCAF45]">
                                <img 
                                    src={post.author?.avatarUrl || `https://ui-avatars.com/api/?name=${post.author?.username}&background=random`} 
                                    className="w-full h-full object-cover rounded-full border border-black" 
                                    alt="" 
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[12px] font-black text-primary lowercase tracking-tight">@{post.author?.username}</span>
                                <span className="text-[9px] font-bold text-muted uppercase tracking-widest opacity-50">{new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="px-2 py-1 rounded-md bg-surface-subtle border border-white/5 text-[9px] font-black text-muted uppercase tracking-widest">
                            {post.type}
                        </div>
                    </div>

                    {/* Media Body */}
                    <div className="aspect-square bg-black relative overflow-hidden group/media">
                        {post.mediaUrl ? (
                            <img src={post.mediaUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover/media:scale-105" alt="" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted/10 bg-surface-subtle/20 gap-3">
                                <HiCollection size={48} />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Text Entry</span>
                            </div>
                        )}
                        
                        {/* Instant Action Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[4px]">
                            <button 
                                onClick={() => onDelete(post._id)} 
                                className="px-6 py-4 rounded-2xl bg-error text-white shadow-2xl shadow-error/40 hover:scale-110 active:scale-95 transition-all transform translate-y-4 group-hover:translate-y-0 duration-500 flex items-center gap-3"
                            >
                                <HiTrash size={20} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Purge Artifact</span>
                            </button>
                        </div>
                    </div>

                    {/* Meta/Content */}
                    <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center gap-1.5 text-accent">
                                <HiTrendingUp size={16} className="opacity-80" />
                                <span className="text-[12px] font-black">{post.likes?.length || 0}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted">
                                <HiCollection size={16} className="opacity-40" />
                                <span className="text-[12px] font-black">{post.comments?.length || 0}</span>
                            </div>
                        </div>
                        
                        <p className="text-[13px] text-primary/80 line-clamp-3 leading-relaxed font-medium mb-4">
                            {post.content}
                        </p>
                        
                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-black text-muted uppercase tracking-widest opacity-30">ID: {post._id?.substring(0,8)}...</span>
                            <button className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline">Inspect Details</button>
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
        <div className="admin-table-wrap">
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
                            />
                            <StatCard 
                                label="Feed Velocity" 
                                value={(stats?.totalPosts || 0).toLocaleString()} 
                                sub="Broadcast Objects" 
                                icon={<HiCollection />} 
                                chartData={[4, 8, 5, 9, 12, 10, 15, 8, 14, 18]}
                            />
                            <StatCard 
                                label="Security Queue" 
                                value={reports.length.toString()} 
                                sub="Pending Violations" 
                                icon={<HiFlag />} 
                                accent={reports.length > 0}
                            />
                            <StatCard 
                                label="System Health" 
                                value="99.9%" 
                                sub="Uptime Velocity" 
                                icon={<HiTrendingUp />} 
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
                        onVerify={handleToggleVerify} 
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
                    />
                )
            case 'comments':
                return (
                    <CommentModule 
                        comments={comments.filter(c => (c.content || '').toLowerCase().includes(search.toLowerCase()))} 
                        onDelete={handleDeleteComment} 
                        search={search}
                        setSearch={setSearch}
                    />
                )
            case 'reports':
                return (
                    <ReportModule 
                        reports={reports} 
                        onResolve={handleResolveReport} 
                        search={search}
                    />
                )
            case 'infrastructure':
                return <InfrastructureModule pulse={pulse} />
            case 'audit':
                return <AuditModule logs={logs} />
            case 'settings':
                return (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="admin-surface-el-v2 p-10 bg-gradient-to-br from-accent/5 to-transparent">
                                <h3 className="text-xl font-black text-primary uppercase tracking-tighter mb-8">Platform Identity</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-[11px] font-black text-muted uppercase tracking-widest">Environment</span>
                                        <span className="text-[11px] font-black text-accent uppercase tracking-widest px-3 py-1 rounded-full bg-accent/10 border border-accent/20">Production-PN</span>
                                    </div>
                                    <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
                                        <span className="text-[11px] font-black text-muted uppercase tracking-widest">Registry Lock</span>
                                        <div className="w-10 h-5 bg-success/20 rounded-full relative shadow-inner"><div className="absolute right-1 top-1 w-3 h-3 bg-success rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" /></div>
                                    </div>
                                </div>
                            </div>
                            <div className="admin-surface-el-v2 p-10 border-dashed border-error/20 bg-error/[0.02]">
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
            <div className="min-h-screen bg-black text-white p-12">
                <div className="max-w-[1600px] mx-auto space-y-12">
                    <div className="flex justify-between items-end pb-8 border-b border-white/5">
                        <div className="space-y-4">
                            <div className="h-4 w-32 bg-white/5 rounded-full animate-pulse" />
                            <div className="h-12 w-64 bg-white/5 rounded-2xl animate-pulse" />
                        </div>
                        <div className="flex gap-4">
                            <div className="h-12 w-12 bg-white/5 rounded-2xl animate-pulse" />
                            <div className="h-12 w-48 bg-white/5 rounded-2xl animate-pulse" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-48 bg-white/5 rounded-[32px] animate-pulse" />
                        ))}
                    </div>
                    <div className="h-[400px] bg-white/5 rounded-[40px] animate-pulse" />
                </div>
            </div>
        )
    }

    return (
        <div className="admin-root-v2">
            {/* Sidebar */}
            <AdminSidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                pulse={stats?.health}
                stats={stats}
                reports={reports}
            />

            {/* Mobile Navigation */}
            <div className="lg:hidden flex overflow-x-auto gap-3 p-4 bg-black/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-[1000] no-scrollbar">
                {[
                    { id: 'dashboard', label: 'Command', icon: HiGlobe },
                    { id: 'analytics', label: 'Intelligence', icon: HiTrendingUp },
                    { id: 'users', label: 'Identities', icon: HiUsers },
                    { id: 'posts', label: 'Broadcasts', icon: HiCollection },
                    { id: 'reports', label: 'Violations', icon: HiFlag }
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                            activeTab === item.id 
                            ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                            : 'bg-white/5 text-muted'
                        }`}
                    >
                        <item.icon size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <main className="admin-main-col">
                <div className="admin-content-inner p-6 md:p-12 space-y-12">
                    {/* Header */}
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-white/5">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-widest">
                                    Live Console
                                </div>
                                <div className="text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-30">
                                    Ref: PN-GOV-{new Date().getFullYear()}-{Math.floor(Math.random() * 9000) + 1000}
                                </div>
                            </div>
                            <h1 className="admin-h1-v2">
                                {activeTab === 'dashboard' ? 'Governance' : 
                                    activeTab === 'analytics' ? 'Intelligence' :
                                    activeTab === 'users' ? 'Identities' :
                                    activeTab === 'posts' ? 'Broadcasts' :
                                    activeTab === 'comments' ? 'Transmissions' :
                                    activeTab === 'reports' ? 'Violations' :
                                    activeTab}
                            </h1>
                            <p className="text-muted font-bold text-[11px] uppercase tracking-[0.3em] opacity-40 ml-1">
                                Active Administrative Session • Restricted Access
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => init()}
                                className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-accent/30 transition-all group"
                                title="Synchronize Data"
                            >
                                <HiRefresh className="text-muted group-hover:text-accent group-hover:rotate-180 transition-all duration-700" size={20} />
                            </button>
                            <div className="h-12 w-[1px] bg-white/10 mx-2" />
                            <div className="flex items-center gap-4 pl-2">
                                <div className="text-right hidden sm:block">
                                    <div className="text-xs font-black text-primary uppercase">@{user?.username}</div>
                                    <div className="text-[10px] font-bold text-success uppercase tracking-widest flex items-center justify-end gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                        Root Access
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-dark border border-white/10 flex items-center justify-center text-white font-black shadow-lg shadow-accent/20">
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
                                <p className="text-[9px] font-bold text-muted uppercase tracking-[0.4em] opacity-20">© 2026 PeerNet Governance • Restricted Infrastructure Access</p>
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
                                <button className="py-4 rounded-xl border border-white/5 font-black text-[10px] tracking-[0.2em] uppercase hover:bg-white/5 transition-all" onClick={() => setShowDeleteModal(false)}>Abort</button>
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
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-5 text-sm font-black text-primary focus:border-error/50 focus:bg-error/5 outline-none transition-all placeholder:opacity-10"
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
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-5 text-sm font-black text-primary focus:border-error/50 focus:bg-error/5 outline-none transition-all placeholder:opacity-10"
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
                                            : 'bg-white/5 text-muted/30 cursor-not-allowed'
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
