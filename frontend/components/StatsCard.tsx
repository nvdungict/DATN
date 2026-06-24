'use client';

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  gradient: string;
  suffix?: string;
}

export default function StatsCard({ icon, label, value, gradient, suffix }: StatsCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 border border-white/10 bg-white/5 hover:bg-white/8 transition-all duration-300 group cursor-default`}
    >
      {/* Gradient accent */}
      <div className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300 ${gradient}`} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-white">{value}</span>
            {suffix && <span className="text-slate-400 text-sm mb-1">{suffix}</span>}
          </div>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${gradient} bg-opacity-20 border border-white/10`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
