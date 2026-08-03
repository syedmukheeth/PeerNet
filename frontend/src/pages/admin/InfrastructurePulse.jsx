import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HiDatabase as HiHardDrive } from 'react-icons/hi'

export default function InfrastructurePulse({ pulse }) {
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
