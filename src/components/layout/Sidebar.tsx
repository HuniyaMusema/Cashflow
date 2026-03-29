import { 
  LayoutDashboard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  Settings, 
  Wallet
} from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { name: 'Sales', icon: ArrowUpRight, href: '/sales' },
  { name: 'Purchases', icon: ArrowDownLeft, href: '/purchases' },
  { name: 'Declarations', icon: FileText, href: '/declarations' },
  { name: 'Settings', icon: Settings, href: '/settings' },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 border-r bg-slate-50/50 flex flex-col h-screen sticky top-0">
      <div className="h-16 px-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <Wallet size={20} />
        </div>
        <span className="font-bold text-lg tracking-tight text-slate-900">Cashflow</span>
      </div>
      
      <nav className="flex-1 mt-6 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                isActive 
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
              )}
            >
              <item.icon 
                size={18} 
                className={cn(
                  "transition-colors",
                  isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                )} 
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="p-4 rounded-xl bg-indigo-600 text-white space-y-3 shadow-xl shadow-indigo-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-150 transition-transform duration-700">
            <LayoutDashboard size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Tax Season Pro</p>
            <p className="text-sm font-medium leading-snug">Upgrade for AI-automated tax filing.</p>
            <button className="mt-3 w-full py-2 bg-white text-indigo-600 rounded-lg text-xs font-bold shadow-sm transition-all hover:bg-slate-50">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
