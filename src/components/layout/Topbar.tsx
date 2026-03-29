import { Bell, Calendar, ChevronDown, Globe, Search, User } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatEthiopian } from '../../lib/ethiopian-calendar';
import { cn } from '../../lib/utils';

export const Topbar = () => {
  const { activeCompany, calendarType, toggleCalendar } = useAppStore();
  
  const displayDate = calendarType === 'ethiopian' 
    ? formatEthiopian(new Date()) 
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <header className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-8">
      <div className="flex items-center gap-6 flex-1">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white/50 cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
          <Globe size={16} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">{activeCompany?.name}</span>
          <ChevronDown size={14} className="text-slate-400" />
        </button>
        
        <div className="relative max-w-sm w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-600 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search records, TIN, or files..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-100/50 border border-transparent rounded-xl text-sm focus:outline-none focus:bg-white focus:border-indigo-600/20 focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Calendar Toggle */}
        <button 
          onClick={toggleCalendar}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all shadow-sm active:scale-95",
            calendarType === 'ethiopian' 
              ? "bg-indigo-600 text-white border-indigo-700 shadow-indigo-100" 
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          )}
        >
          <Calendar size={16} />
          <span className="hidden md:inline">{calendarType === 'ethiopian' ? 'Ethio Calendar' : 'Gregorian'}</span>
          <span className="opacity-60 text-xs ml-1 border-l pl-2 border-current hidden lg:inline">
            {displayDate}
          </span>
        </button>

        <div className="h-4 w-[1px] bg-slate-200 mx-1" />

        <button className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors relative text-slate-500">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
        </button>

        <button className="flex items-center gap-2 p-1 rounded-full border border-slate-200 hover:bg-slate-50 transition-all shadow-soft bg-white">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden">
            <User size={18} />
          </div>
        </button>
      </div>
    </header>
  );
};
