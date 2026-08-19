import { motion } from 'framer-motion'
import { HiServer, HiLightningBolt, HiGlobe } from '../../../components/ui/icons'
import StatCard from '../StatCard'

export default function InfrastructureModule({ pulse }) {
    return (
        <motion.div className="space-y-8">
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
}
