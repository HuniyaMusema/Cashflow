import { LayoutDashboard, ArrowUpRight, ArrowDownLeft, FileText, Settings, Zap, Shield, FileSpreadsheet } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppStore } from '../../store/useAppStore';

export const Sidebar = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { userRole } = useAppStore();

  const navItems = [
    { key: 'dashboard'    as const, icon: LayoutDashboard, href: '/' },
    { key: 'sales'        as const, icon: ArrowUpRight,    href: '/sales' },
    { key: 'purchases'    as const, icon: ArrowDownLeft,   href: '/purchases' },
    { key: 'declarations' as const, icon: FileText,        href: '/declarations' },
    { key: 'settings'     as const, icon: Settings,        href: '/settings' },
  ];
  return (
    <aside className="w-64 flex flex-col h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
      {/* Logo */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50">
          <Zap size={18} fill="white" />
        </div>
        <div>
          <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white">ABZ</span>
          <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 -mt-0.5">Tax Platform</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.key}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative",
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-600 rounded-r-full" />
              )}
              <item.icon size={17} className={cn(
                "shrink-0 transition-colors",
                isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
              )} />
              {t(item.key)}
            </Link>
          );
        })}

        {/* Accountant Portal link */}
        <Link
          to="/accountant"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative",
            location.pathname === '/accountant'
              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
          )}
        >
          {location.pathname === '/accountant' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-600 rounded-r-full" />
          )}
          <FileSpreadsheet size={17} className={cn(
            "shrink-0",
            location.pathname === '/accountant' ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 group-hover:text-slate-600"
          )} />
          Accountant Portal
        </Link>

        {/* Admin link — only for admin role */}
        {userRole === 'admin' && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative mt-2",
              location.pathname.startsWith('/admin')
                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            {location.pathname.startsWith('/admin') && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-600 rounded-r-full" />
            )}
            <Shield size={17} className={cn(
              "shrink-0",
              location.pathname.startsWith('/admin') ? "text-violet-600 dark:text-violet-400" : "text-slate-400 group-hover:text-slate-600"
            )} />
            Admin Panel
          </Link>
        )}
      </nav>

      {/* Upgrade CTA */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-4 text-white">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -left-2 w-16 h-16 bg-white/5 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} fill="white" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-90">{t('taxSeasonPro')}</span>
            </div>
            <p className="text-xs font-medium leading-snug opacity-80 mb-3">{t('upgradeDesc')}</p>
            <button className="w-full py-2 bg-white text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all">
              {t('upgrade')}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
