import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { laravelApi } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Building2, Users, FileText, TrendingUp, Search, ChevronRight, CheckCircle2, Clock, AlertCircle, Shield, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { AddCompanyModal } from '../components/admin/AddCompanyModal';

type TabType = 'overview' | 'companies' | 'users' | 'invoices';

const StatCard = ({ title, value, icon: Icon, color }: {
  title: string; value: string | number; icon: React.ElementType; color: string;
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all hover:-translate-y-0.5 duration-200">
    <div className="flex items-start justify-between mb-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <Shield size={14} className="text-slate-300 dark:text-slate-600" />
    </div>
    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{title}</p>
    <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
  </div>
);

export const AdminDashboard = () => {
  const [tab, setTab] = useState<TabType>('overview');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddCompany, setShowAddCompany] = useState(false);

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => laravelApi.get('/admin/overview').then(r => r.data),
  });

  const { data: trends } = useQuery({
    queryKey: ['admin-trends'],
    queryFn: () => laravelApi.get('/admin/trends').then(r => r.data),
  });

  const { data: companies, isLoading: compLoading } = useQuery({
    queryKey: ['admin-companies', search, page],
    queryFn: () => laravelApi.get('/admin/companies', { params: { search: tab === 'companies' ? search : '', page, per_page: 10 } }).then(r => r.data),
    enabled: tab === 'companies',
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => laravelApi.get('/admin/users', { params: { search: tab === 'users' ? search : '', page, per_page: 10 } }).then(r => r.data),
    enabled: tab === 'users',
  });

  const { data: invoices, isLoading: invLoading } = useQuery({
    queryKey: ['admin-invoices', search, statusFilter, page],
    queryFn: () => laravelApi.get('/admin/invoices', { params: { search: tab === 'invoices' ? search : '', status: statusFilter || undefined, page, per_page: 15 } }).then(r => r.data),
    enabled: tab === 'invoices',
  });

  const chartData = ((trends ?? []) as { tax_period: string; output_vat: number; input_vat: number; invoice_count: number }[]).map(t => ({
    name: t.tax_period.slice(5),
    output: Number(t.output_vat),
    input: Number(t.input_vat),
    invoices: Number(t.invoice_count),
  }));

  const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: 'overview',  label: 'Overview',  icon: TrendingUp },
    { key: 'companies', label: 'Companies', icon: Building2 },
    { key: 'users',     label: 'Users',     icon: Users },
    { key: 'invoices',  label: 'Invoices',  icon: FileText },
  ];

  const handleTabChange = (key: TabType) => { setTab(key); setPage(1); setSearch(''); };

  return (
    <div className="min-h-full bg-slate-50/50 dark:bg-slate-950">
      {showAddCompany && <AddCompanyModal onClose={() => setShowAddCompany(false)} />}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-in fade-in duration-500">

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-violet-500" />
            <span className="text-xs font-semibold text-violet-500 uppercase tracking-widest">Admin Control Panel</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Full platform overview and management</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => handleTabChange(key)}
              className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                tab === key ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {ovLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />) : <>
                <StatCard title="Total Companies" value={overview?.total_companies ?? 0} icon={Building2} color="bg-violet-500" />
                <StatCard title="Total Users"     value={overview?.total_users ?? 0}     icon={Users}     color="bg-indigo-500" />
                <StatCard title="Total Invoices"  value={overview?.total_invoices ?? 0}  icon={FileText}  color="bg-emerald-500" />
                <StatCard title="Net VAT (All)"   value={`ETB ${Number(overview?.net_vat ?? 0).toLocaleString()}`} icon={TrendingUp} color="bg-amber-500" />
              </>}
            </div>

            {!ovLoading && (
              <div className="grid grid-cols-3 gap-4">
                {([
                  { label: 'Verified', count: overview?.verified_count, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle2 },
                  { label: 'Pending',  count: overview?.pending_count,  color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20',   icon: Clock },
                  { label: 'Rejected', count: overview?.rejected_count, color: 'text-rose-600',    bg: 'bg-rose-50 dark:bg-rose-900/20',    icon: AlertCircle },
                ] as { label: string; count: number; color: string; bg: string; icon: React.ElementType }[]).map(({ label, count, color, bg, icon: Icon }) => (
                  <div key={label} className={cn('rounded-2xl p-5 flex items-center gap-4', bg)}>
                    <Icon size={24} className={color} />
                    <div>
                      <p className={cn('text-2xl font-black', color)}>{count ?? 0}</p>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Platform VAT Trends</h3>
                <p className="text-xs text-slate-500 mb-5">All companies — last 6 months</p>
                <div className="h-56 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: number) => `${v / 1000}k`} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: number) => [`ETB ${v.toLocaleString()}`, '']} />
                      <Bar dataKey="output" fill="#6366f1" radius={[4, 4, 0, 0]} name="Output VAT" />
                      <Bar dataKey="input"  fill="#10b981" radius={[4, 4, 0, 0]} name="Input VAT" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Invoice Volume</h3>
                <p className="text-xs text-slate-500 mb-5">Total invoices per month</p>
                <div className="h-56 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Line type="monotone" dataKey="invoices" stroke="#8b5cf6" strokeWidth={2.5} dot={false} name="Invoices" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COMPANIES */}
        {tab === 'companies' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search companies..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:text-white transition-all" />
              </div>
              <button
                onClick={() => setShowAddCompany(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-violet-200 dark:shadow-violet-900/50 active:scale-95"
              >
                <Plus size={15} /> Add Company
              </button>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    {['Company', 'TIN', 'Users', 'Invoices', 'Output VAT', 'Input VAT', ''].map(h => (
                      <th key={h} className="px-6 py-4 text-[11px] font-black uppercase text-slate-400 tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {compLoading ? [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-6 py-4"><Skeleton className="h-8 w-full" /></td></tr>
                  )) : ((companies?.data ?? []) as { id: number; name: string; tin: string; user_count: number; invoice_count: number; output_vat: number; input_vat: number }[]).map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black">{c.name.charAt(0)}</div>
                          <span className="font-semibold text-slate-900 dark:text-white text-sm">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{c.tin}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{c.user_count}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{c.invoice_count}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-indigo-600">ETB {Number(c.output_vat).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-600">ETB {Number(c.input_vat).toLocaleString()}</td>
                      <td className="px-6 py-4"><ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <p className="text-xs text-slate-400">{companies?.meta?.total ?? 0} companies</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all">Prev</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={!companies?.meta || page >= companies.meta.last_page} className="px-4 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all">Next</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search users..."
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:text-white transition-all" />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    {['User', 'Email', 'Company', 'Role', 'Joined'].map(h => (
                      <th key={h} className="px-6 py-4 text-[11px] font-black uppercase text-slate-400 tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {usersLoading ? [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-6 py-4"><Skeleton className="h-8 w-full" /></td></tr>
                  )) : ((users?.data ?? []) as { id: number; name: string; email: string; company_name: string; role: string; created_at: string }[]).map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-black">{u.name.charAt(0).toUpperCase()}</div>
                          <span className="font-semibold text-slate-900 dark:text-white text-sm">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{u.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{u.company_name}</td>
                      <td className="px-6 py-4">
                        <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider',
                          u.role === 'admin' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600' :
                          u.role === 'accountant' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' :
                          'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        )}>{u.role}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <p className="text-xs text-slate-400">{users?.meta?.total ?? 0} users</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all">Prev</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={!users?.meta || page >= users.meta.last_page} className="px-4 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all">Next</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INVOICES */}
        {tab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search invoices..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:text-white transition-all" />
              </div>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none transition-all">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    {['Status', 'Invoice', 'Company', 'Vendor', 'Date', 'Taxable', 'VAT'].map(h => (
                      <th key={h} className="px-5 py-4 text-[11px] font-black uppercase text-slate-400 tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {invLoading ? [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-5 py-4"><Skeleton className="h-8 w-full" /></td></tr>
                  )) : ((invoices?.data ?? []) as { id: number; status: string; invoice_number: string; company_name: string; vendor_name: string; invoice_date: string; taxable_amount: string; vat_amount: string }[]).map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider',
                          inv.status === 'verified' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' :
                          inv.status === 'pending'  ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600' :
                          'bg-rose-50 dark:bg-rose-900/30 text-rose-600'
                        )}>
                          {inv.status === 'verified' ? <CheckCircle2 size={10} /> : inv.status === 'pending' ? <Clock size={10} /> : <AlertCircle size={10} />}
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-slate-500">{inv.invoice_number}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{inv.company_name}</td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{inv.vendor_name}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">{String(inv.invoice_date).slice(0, 10)}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-white">ETB {Number(inv.taxable_amount).toLocaleString()}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-indigo-600">ETB {Number(inv.vat_amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <p className="text-xs text-slate-400">{invoices?.meta?.total ?? 0} invoices</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all">Prev</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={!invoices?.meta || page >= invoices.meta.last_page} className="px-4 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300 transition-all">Next</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
