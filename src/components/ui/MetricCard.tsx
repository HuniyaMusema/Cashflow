import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

export const MetricCard = ({ 
  title, value, change, trend, icon: Icon, variant = 'default' 
}: MetricCardProps) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all group shadow-soft relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
        <Icon size={80} />
      </div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-sm",
          variant === 'primary' ? "bg-indigo-500 text-white shadow-indigo-100" : 
          variant === 'success' ? "bg-emerald-500 text-white shadow-emerald-100" :
          variant === 'warning' ? "bg-amber-500 text-white shadow-amber-100" :
          variant === 'destructive' ? "bg-rose-500 text-white shadow-rose-100" :
          "bg-slate-100 text-slate-500 shadow-slate-100"
        )}>
          <Icon size={20} />
        </div>
        {change && (
          <span className={cn(
            "text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest",
            trend === 'up' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
            trend === 'down' ? "bg-rose-50 text-rose-600 border border-rose-100" :
            "bg-slate-50 text-slate-500 border border-slate-100"
          )}>
            {change}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{title}</h3>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
};
