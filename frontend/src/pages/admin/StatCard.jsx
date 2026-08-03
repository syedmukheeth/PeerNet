import React from 'react'
import Sparkline from './Sparkline'

export default function StatCard({ label, value, sub, icon, chartData, accent, loading }) {
    return (
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
}
