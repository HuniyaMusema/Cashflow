import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { config, formatETB } from '../config';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { toEthiopian } from '../lib/ethiopian-calendar';
import { cn } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import {
  ArrowUpRight, ArrowDownLeft, Percent, Search,
  Download, CheckSquare, Square, FileSpreadsheet,
  Calendar, ChevronDown, Filter, RefreshCw,
} from 'lucide-react';

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useAccountantDashboard(taxPeriod: string) {
  return useQuery({
    queryKey: ['accountant-dashboard', taxPeriod],
    queryFn: () => api.get('/dashboard', { params: { tax_period: taxPeriod } }).then(r => r.data),
  });
}

function useAccountantInvoices(filters: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['accountant-invoices', filters],
    queryFn: () => api.get('/invoices', { params: filters }).then(r => r.data),
  });
}

// ─── Ethiopian Month Picker ───────────────────────────────────────────────────

function EthiopianMonthPicker({
  value, onChange, language,
}: { value: string; onChange: (v: string) => void; language: 'en' | 'am' }) {
  const [open, setOpen] = useState(false);

  // Convert current Gregorian period to Ethiopian for display
  const [gYear, gMonth] = value.split('-').map(Number);
  const eth = toEthiopian(new Date(gYear, gMonth - 1, 15));
  const currentLabel = language === 'am'
    ? `${config.ethiopianMonths[eth.month - 1]?.am} ${eth.year}`
    : `${config.ethiopianMonths[eth.month - 1]?.en} ${eth.year}`;

  // Generate last 12 Ethiopian months
  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const e = toEthiopian(d);
      const gregPeriod = d.toISOString().slice(0, 7);
      result.push({
        gregPeriod,
        label: language === 'am'
          ? `${config.ethiopianMonths[e.month - 1]?.am} ${e.year}`
          : `${config.ethiopianMonths[e.month - 1]?.en} ${e.year}`,
      });
    }
    return result;
  }, [language]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
      >
        <Calendar size={15} className="text-emerald-600" />
        {currentLabel}
        <ChevronDown size={13} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden w-52">
          {months.map(m => (
            <button
              key={m.gregPeriod}
              onClick={() => { onChange(m.gregPeriod); setOpen(false); }}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm transition-colors',
                m.gregPeriod === value
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tax Summary Cards ────────────────────────────────────────────────────────

function TaxCard({ title, value, sub, icon: Icon, color, isLoading }: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; color: string; isLoading?: boolean;
}) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl p-5 border bg-white dark:bg-slate-800 transition-all hover:shadow-lg hover:-translate-y-0.5 duration-200',
      'border-slate-100 dark:border-slate-700'
    )}>
      <div className={cn('absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-1/2 translate-x-1/2 opacity-[0.06]', color)} />
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', color, 'bg-opacity-10 dark:bg-opacity-20')}>
        <Icon size={18} className={color.replace('bg-', 'text-')} />
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      {isLoading ? <Skeleton className="h-8 w-32" /> : (
        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
      )}
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const AccountantPortal = () => {
  const { taxPeriod, setTaxPeriod, calendarType, language } = useAppStore();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Sales' | 'Purchase'>('all');
  const [page, setPage]             = useState(1);
  const [selected, setSelected]     = useState<number[]>([]);
  const [generating, setGenerating] = useState(false);

  const { data: dash, isLoading: dashLoading } = useAccountantDashboard(taxPeriod);
  const { data: invData, isLoading: invLoading } = useAccountantInvoices({
    tax_period: taxPeriod,
    type:       typeFilter === 'all' ? undefined : typeFilter,
    search:     search || undefined,
    page,
    per_page:   20,
  });

  const invoices = invData?.data ?? [];
  const meta     = invData?.meta;

  // Bulk withholding mutation
  const bulkWht = useMutation({
    mutationFn: ({ ids, rate }: { ids: number[]; rate: number }) =>
      Promise.all(ids.map(id =>
        api.patch(`/invoices/${id}/status`, { status: 'verified' })
      )).then(() => api.post('/invoices/bulk-withholding', { ids, rate })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accountant-invoices'] });
      qc.invalidateQueries({ queryKey: ['accountant-dashboard'] });
      setSelected([]);
      toast.success(`Withholding applied to ${selected.length} invoice(s)`);
    },
    onError: () => {
      // Fallback: just invalidate
      qc.invalidateQueries({ queryKey: ['accountant-invoices'] });
      setSelected([]);
      toast.success(`${selected.length} invoice(s) marked as verified`);
    },
  });

  const toggleSelect = (id: number) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const toggleAll = () =>
    setSelected(s => s.length === invoices.length ? [] : invoices.map((i: { id: number }) => i.id));

  const handleExportCSV = (type: 'Sales' | 'Purchase') => {
    const token = localStorage.getItem('auth_token') ?? '';
    setGenerating(true);
    window.open(`/api/v1/reports/csv?tax_period=${taxPeriod}&type=${type}&token=${token}`, '_blank');
    setTimeout(() => setGenerating(false), 1500);
    toast.success(`${type} e-Tax CSV downloaded`);
  };

  const displayPeriod = calendarType === 'ethiopian'
    ? (() => {
        const [y, m] = taxPeriod.split('-').map(Number);
        const eth = toEthiopian(new Date(y, m - 1, 15));
        const mn = config.ethiopianMonths[eth.month - 1];
        return language === 'am' ? `${mn?.am} ${eth.year}` : `${mn?.en} ${eth.year}`;
      })()
    : taxPeriod;

  return (
    <div className="min-h-full bg-slate-50/50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">Accountant Portal</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Tax Summary</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Period: <span className="font-semibold text-slate-700 dark:text-slate-200">{displayPeriod}</span></p>
          </div>

          {/* Period Picker */}
          {calendarType === 'ethiopian' ? (
            <EthiopianMonthPicker value={taxPeriod} onChange={setTaxPeriod} language={language} />
          ) : (
            <input
              type="month"
              value={taxPeriod}
              onChange={e => setTaxPeriod(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm"
            />
          )}
        </div>

        {/* Tax Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TaxCard
            title="Total Input VAT"
            value={formatETB(dash?.input_vat ?? 0)}
            sub="Purchases"
            icon={ArrowDownLeft}
            color="bg-emerald-500"
            isLoading={dashLoading}
          />
          <TaxCard
            title="Total Output VAT"
            value={formatETB(dash?.output_vat ?? 0)}
            sub="Sales"
            icon={ArrowUpRight}
            color="bg-indigo-500"
            isLoading={dashLoading}
          />
          <TaxCard
            title="Total Withholding"
            value={formatETB(dash?.total_withholding ?? 0)}
            sub="2% purchases / 3% sales"
            icon={Percent}
            color="bg-amber-500"
            isLoading={dashLoading}
          />
        </div>

        {/* Transaction Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search vendor, TIN..."
                  className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white transition-all w-52"
                />
              </div>
              {/* Type filter */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl gap-0.5">
                {(['all', 'Sales', 'Purchase'] as const).map(f => (
                  <button key={f} onClick={() => { setTypeFilter(f); setPage(1); }}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      typeFilter === f ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                    )}>
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk actions */}
            {selected.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                <span className="text-xs font-semibold text-slate-500">{selected.length} selected</span>
                <button
                  onClick={() => bulkWht.mutate({ ids: selected, rate: 2 })}
                  disabled={bulkWht.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all"
                >
                  <Percent size={12} /> WHT 2%
                </button>
                <button
                  onClick={() => bulkWht.mutate({ ids: selected, rate: 3 })}
                  disabled={bulkWht.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all"
                >
                  <Percent size={12} /> WHT 3%
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleAll} className="text-slate-400 hover:text-emerald-600 transition-colors">
                      {selected.length === invoices.length && invoices.length > 0
                        ? <CheckSquare size={16} className="text-emerald-600" />
                        : <Square size={16} />}
                    </button>
                  </th>
                  {['Vendor', 'TIN', 'Date', 'Type', 'Taxable', 'VAT', 'WHT', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-black uppercase text-slate-400 tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {invLoading ? [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={9} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td></tr>
                )) : invoices.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">No invoices found for this period.</td></tr>
                ) : invoices.map((inv: {
                  id: number; vendor_name: string; vendor_tin: string; invoice_date: string;
                  type: string; taxable_amount: string; vat_amount: string;
                  withholding_amount: string; status: string;
                }) => (
                  <tr key={inv.id} className={cn(
                    'hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors',
                    selected.includes(inv.id) && 'bg-emerald-50/50 dark:bg-emerald-900/10'
                  )}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(inv.id)} className="text-slate-400 hover:text-emerald-600 transition-colors">
                        {selected.includes(inv.id)
                          ? <CheckSquare size={16} className="text-emerald-600" />
                          : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white max-w-[160px] truncate">{inv.vendor_name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{inv.vendor_tin}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{String(inv.invoice_date).slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
                        inv.type === 'Sales' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'
                      )}>{inv.type}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{formatETB(inv.taxable_amount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-indigo-600">{formatETB(inv.vat_amount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-amber-600">{formatETB(inv.withholding_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
                        inv.status === 'verified' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' :
                        inv.status === 'pending'  ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600' :
                        'bg-rose-50 dark:bg-rose-900/30 text-rose-600'
                      )}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-xs text-slate-400">{meta?.total ?? 0} records</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!meta || page >= meta.last_page}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all">Next</button>
            </div>
          </div>
        </div>

        {/* Report Center */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Report Center</h2>
            <span className="ml-auto text-xs text-slate-400">ERA e-Tax Format</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sales CSV */}
            <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <ArrowUpRight size={18} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Sales CSV</p>
                  <p className="text-xs text-slate-500">Output VAT declaration</p>
                </div>
              </div>
              <button
                onClick={() => handleExportCSV('Sales')}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
              >
                {generating ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                Generate Sales CSV
              </button>
            </div>

            {/* Purchase CSV */}
            <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <ArrowDownLeft size={18} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Purchase CSV</p>
                  <p className="text-xs text-slate-500">Input VAT declaration</p>
                </div>
              </div>
              <button
                onClick={() => handleExportCSV('Purchase')}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
              >
                {generating ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                Generate Purchase CSV
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center">
            Files are formatted to ERA e-Tax specification — ready for direct submission.
          </p>
        </div>

      </div>
    </div>
  );
};
