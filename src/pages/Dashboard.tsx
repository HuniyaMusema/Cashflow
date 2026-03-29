import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  FileText, 
  Plus, 
  Download,
  Filter,
  MoreVertical,
  TrendingUp,
  CreditCard,
  History
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { MetricCard } from '../components/ui/MetricCard';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const chartData = [
  { name: 'Jan', output: 4000, input: 2400 },
  { name: 'Feb', output: 3000, input: 1398 },
  { name: 'Mar', output: 2000, input: 9800 },
  { name: 'Apr', output: 2780, input: 3908 },
  { name: 'May', output: 1890, input: 4800 },
  { name: 'Jun', output: 2390, input: 3800 },
  { name: 'Jul', output: 3490, input: 4300 },
];

const recentInvoices = [
  { id: 'INV-001', vendor: 'Ethio Telecom', date: 'Mar 25', amount: '1,200.00', vat: '180.00', status: 'Verified' },
  { id: 'INV-002', vendor: 'Shell Ethiopia', date: 'Mar 24', amount: '4,500.00', vat: '675.00', status: 'Pending' },
  { id: 'INV-003', vendor: 'Hilton Addis', date: 'Mar 22', amount: '8,900.00', vat: '1,335.00', status: 'Verified' },
  { id: 'INV-004', vendor: 'Office Depot', date: 'Mar 21', amount: '450.00', vat: '67.50', status: 'Rejected' },
];

export const Dashboard = () => {
  const { activeCompany, taxPeriod } = useAppStore();

  const handleExport = () => {
    toast.promise(() => new Promise(resolve => setTimeout(resolve, 2000)), {
      loading: 'Compiling tax data...',
      success: 'Export successful! Check your downloads.',
      error: 'Failed to export data.'
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-3 duration-700 max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">
            <TrendingUp size={14} />
            Analytics Overview
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Welcome back to <span className="text-slate-900 border-b border-indigo-200">{activeCompany?.name}</span> for {taxPeriod}.
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 transition-all font-bold text-sm text-slate-700 shadow-sm active:scale-95"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-sm shadow-xl shadow-indigo-100 active:scale-95">
            <Plus size={18} />
            Add Invoice
          </button>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Output VAT" 
          value="ETB 145,200.00" 
          change="+12.5%" 
          trend="up"
          icon={ArrowUpRight}
          variant="primary"
        />
        <MetricCard 
          title="Total Input VAT" 
          value="ETB 98,450.00" 
          change="+8.2%" 
          trend="up"
          icon={ArrowDownLeft}
          variant="success"
        />
        <MetricCard 
          title="Net Tax Balance" 
          value="ETB 46,750.00" 
          change="-4.3%" 
          trend="down"
          icon={CreditCard}
          variant="warning"
        />
        <MetricCard 
          title="Open Reviews" 
          value="12 Files" 
          icon={Receipt}
          variant="destructive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 border border-slate-200 rounded-2xl bg-white p-8 shadow-soft">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900">VAT Trends</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Comparing Input vs Output VAT over time</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-tighter">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                Output VAT
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Input VAT
              </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                  tickFormatter={(val) => `ETB ${val/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    fontSize: '14px',
                    fontWeight: 600
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="output" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorOutput)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="input" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorInput)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity / Status */}
        <div className="space-y-8">
          <div className="border border-slate-200 rounded-2xl bg-white p-8 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <History size={18} className="text-indigo-600" />
                Recent History
              </h3>
              <button className="text-xs font-bold text-indigo-600 hover:underline">View All</button>
            </div>
            
            <div className="space-y-6">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110",
                      inv.status === 'Verified' ? "bg-emerald-50 bg-emerald-500/10 text-emerald-600" :
                      inv.status === 'Pending' ? "bg-amber-50 bg-amber-500/10 text-amber-600" :
                      "bg-rose-50 bg-rose-500/10 text-rose-600"
                    )}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{inv.vendor}</p>
                      <p className="text-[11px] font-bold text-slate-400">{inv.id} • {inv.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 tracking-tight">ETB {inv.amount}</p>
                    <p className="text-[11px] font-bold text-indigo-600">VAT: {inv.vat}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden group shadow-2xl shadow-slate-200">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-1000">
              <History size={150} />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/30">
                <FileText size={20} />
              </div>
              <h3 className="text-xl font-bold mb-2">Ready for Q1?</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                You have 89 pending purchase invoices for this quarter. Bulk verify them using our OCR engine.
              </p>
              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
                Bulk Process
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
