import { Bell, Calendar, ChevronDown, Moon, Sun, Search } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatEthiopian } from '../../lib/ethiopian-calendar';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';

export const Topbar = () => {
  const { activeCompany, calendarType, toggleCalendar, theme, toggleTheme, language, setLanguage } = useAppStore();
  const { t } = useTranslation();

  const displayDate = calendarType === 'ethiopian'
    ? formatEthiopian(new Date(), language)
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <header className="h-14 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 gap-4">
      {/* Left */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-[8px] font-black text-white">A</span>
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{activeCompany?.name ?? 'ABZ'}</span>
          <ChevronDown size={13} className="text-slate-400" />
        </button>

        <div className="relative max-w-xs w-full group hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Calendar */}
        <button
          onClick={toggleCalendar}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
            calendarType === 'ethiopian'
              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/50"
              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
          )}
        >
          <Calendar size={13} />
          <span className="hidden lg:inline">{calendarType === 'ethiopian' ? t('ethioCalendar') : t('gregorian')}</span>
          <span className="hidden xl:inline opacity-60 border-l border-current pl-1.5 ml-0.5">{displayDate}</span>
        </button>

        {/* Language */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
          {(['en', 'am'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-bold transition-all",
                language === lang
                  ? "bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              {lang === 'en' ? 'EN' : 'አማ'}
            </button>
          ))}
        </div>

        {/* Theme */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-slate-500 dark:text-slate-400"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* Bell */}
        <button className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full ring-1 ring-white dark:ring-slate-900" />
        </button>

        {/* Avatar */}
        <button className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
          A
        </button>
      </div>
    </header>
  );
};
