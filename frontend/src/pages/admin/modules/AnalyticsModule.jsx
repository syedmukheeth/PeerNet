import { motion } from 'framer-motion'

export default function AnalyticsModule({ stats }) {
    const chartData = stats?.charts?.userGrowth || []
    const pathData = chartData.length > 0
        ? chartData.map((d, i) => `${(i / (chartData.length - 1)) * 1000},${300 - (d.count * 10)}`).join(' L ')
        : "0,250 Q100,220 200,240 T400,180 T600,120 T800,150 T1000,80"

    const svgPath = `M ${pathData}`
    const areaPath = `${svgPath} V 300 H 0 Z`

    return (
        <motion.div className="space-y-10">
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
