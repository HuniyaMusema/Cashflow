import { ArrowUpRight, ArrowDownLeft, Receipt, FileText, Plus, Download, TrendingUp, TrendingDown, CreditCard, History, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { useDashboard } from '../hooks/useDashboard';
import { useTranslation } from '../hooks/useTranslation';
import { Skeleton } from '../components/ui/skeleton';
import { formatEthiopianPeriod } from '../lib/ethiopian-calendar';

const StatCard = ({
  title, value, sub, icon: Icon, trend, color,
}: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; trend?: 'up' | 'down'; color: string;
}) => (
  <div className={cn(
    "relative overflow-hidden rounded-2xl p-5 border transition-all hover:shadow-lg hover:-translate-y-0.5 duration-200",
    "bg-white dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/60"
  )}>
    <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 opacity-[0.07]", color)} />
    <div className="flex items-start justify-between mb-4">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color, "bg-opacity-10 dark:bg-opacity-20")}>
        <Icon size={18} className={cn(color.replace('bg-', 'text-'))} />
      </div>
      {trend && (
        <span className={cn(
          "flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
          trend === 'up' ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600" : "bg-rose-50 dark:bg-rose-900/30 text-rose-600"
        )}>
          {trend === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        </span>
      )}
    </div>
    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{title}</p>
    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
  </div>
);

export const Dashboard = () => {
  const { activeCompany, taxPeriod, calendarType } = useAppStore();
  const { data, isLoading } = useDashboard();
  const { t, language } = useTranslation();

  const displayPeriod = calendarType === 'ethiopian'
    ? formatEthiopianPeriod(taxPeriod, language)
    : taxPeriod;

  const chartData = (data?.monthly_trend ?? []).map((item: { tax_period: string; output_vat: number; input_vat: number }) => {
    const label = calendarType === 'ethiopian'
      ? formatEthiopianPeriod(item.tax_period, language).split(' ')[0].slice(0, 3) // short month
      : item.tax_period.slice(5); // MM
    return {
      name: label,
      output: Number(item.output_vat),
      input:  Number(item.input_vat),
    };
  });

  const recentInvoices: { id: number; invoice_number: string; vendor_name: string; invoice_date: string; total_amount: string; vat_amount: string; status: string }[] = data?.recent_invoices ?? [];

  const handleExport = () => {
    const token = localStorage.getItem('auth_token') ?? '';
    // ERA requires separate Sales and Purchase CSV files
    window.open(`/api/v1/reports/csv?tax_period=${taxPeriod}&type=Sales&token=${token}`, '_blank');
    setTimeout(() => {
      window.open(`/api/v1/reports/csv?tax_period=${taxPeriod}&type=Purchase&token=${token}`, '_blank');
    }, 500);
  };

  return (
    <div className="min-h-full mesh-bg">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={13} className="text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">{t('analyticsOverview')}</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('dashboard')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('welcomeBack')} <span className="font-semibold text-slate-700 dark:text-slate-200">{activeCompany?.name ?? 'ABZ'}</span> — {displayPeriod}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
              <Download size={15} /> {t('exportCsv')}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-sm shadow-indigo-200 dark:shadow-indigo-900/50">
              <Plus size={15} /> {t('addInvoice')}
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />) : <>
            <StatCard title={t('outputVat')}          value={`ETB ${Number(data?.output_vat ?? 0).toLocaleString()}`}        icon={ArrowUpRight}  trend="up"   color="bg-indigo-500" />
            <StatCard title={t('inputVat')}           value={`ETB ${Number(data?.input_vat ?? 0).toLocaleString()}`}         icon={ArrowDownLeft} trend="up"   color="bg-emerald-500" />
            <StatCard title={t('netTaxPayable')}      value={`ETB ${Number(data?.net_vat_payable ?? 0).toLocaleString()}`}   icon={CreditCard}    trend="down" color="bg-amber-500" />
            <StatCard title={t('invoicesThisPeriod')} value={`${data?.invoice_count ?? 0}`} sub={t('files')}                 icon={Receipt}                    color="bg-violet-500" />
          </>}
        </div>

        {/* Chart + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/60 p-6 shadow-sm flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('vatTrends')}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('vatTrendsDesc')}</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />Output</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Input</span>
              </div>
            </div>
            <div className="h-64 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gOutput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gInput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={(v: number) => `${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 600 }}
                    formatter={(v) => [`ETB ${Number(v ?? 0).toLocaleString()}`, '']}
                  />
                  <Area type="monotone" dataKey="output" stroke="#6366f1" strokeWidth={2.5} fill="url(#gOutput)" dot={false} />
                  <Area type="monotone" dataKey="input"  stroke="#10b981" strokeWidth={2.5} fill="url(#gInput)"  dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/60 p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History size={16} className="text-indigo-500" /> {t('recentHistory')}
              </h3>
              <button className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">{t('viewAll')}</button>
            </div>

            <div className="space-y-3 flex-1">
              {isLoading
                ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
                : recentInvoices.length === 0
                  ? <p className="text-sm text-slate-400 text-center py-8">No recent activity</p>
                  : recentInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      inv.status === 'verified' ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600" :
                      inv.status === 'pending'  ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600" :
                      "bg-rose-50 dark:bg-rose-900/30 text-rose-600"
                    )}>
                      <FileText size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{inv.vendor_name}</p>
                      <p className="text-xs text-slate-400">{inv.invoice_date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">ETB {Number(inv.total_amount).toLocaleString()}</p>
                      <p className="text-xs text-indigo-500 font-medium">+{Number(inv.vat_amount).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* CTA */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white">
                <p className="text-xs font-bold mb-1">{t('readyForQ1')}</p>
                <p className="text-xs opacity-75 mb-3">Bulk verify pending invoices with OCR.</p>
                <button className="w-full py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-all">
                  {t('bulkProcess')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
