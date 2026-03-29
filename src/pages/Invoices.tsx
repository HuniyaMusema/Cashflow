import { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileMinus,
  FileSearch,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dropzone } from '../components/forms/Dropzone';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';

const mockInvoices = [
  { id: 'FT-2024-001', vendor: 'Ethio Telecom', date: 'Mar 25', amount: '1,200.00', vat: '180.00', status: 'verified', type: 'Sales' },
  { id: 'FT-2024-002', vendor: 'Shell Ethiopia', date: 'Mar 24', amount: '4,500.00', vat: '675.00', status: 'pending', type: 'Purchase' },
  { id: 'FT-2024-003', vendor: 'Hilton Addis', date: 'Mar 22', amount: '8,900.00', vat: '1,335.00', status: 'verified', type: 'Purchase' },
  { id: 'FT-2024-004', vendor: 'Office Depot', date: 'Mar 21', amount: '450.00', vat: '67.50', status: 'rejected', type: 'Purchase' },
  { id: 'FT-2024-005', vendor: 'Abyssinia Bank', date: 'Mar 20', amount: '2,100.00', vat: '315.00', status: 'verified', type: 'Sales' },
];

export const Invoices = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleFileSelect = (_file: File) => {
    toast.success('File uploaded! Starting OCR analysis...');
    setTimeout(() => navigate('/review'), 1000);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700 max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">
            <FileSearch size={14} />
            Document Management
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-none">Invoices</h1>
          <p className="text-slate-500 mt-3 font-medium text-lg leading-none">Review and manage your tax-compliant digital records.</p>
        </div>
        <div className="flex gap-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            accept="image/*,.pdf"
          />
          <button 
            onClick={triggerUpload}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={18} />
            New Upload
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-soft overflow-hidden flex flex-col min-h-[500px]">
          {/* Table Header / Toolbar */}
          <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex bg-slate-200/50 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
              {['all', 'sales', 'purchases'].map((f) => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all outline-none",
                    filter === f ? "bg-white shadow-sm text-indigo-600 ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-72 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-600 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search by vendor or ID..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/40 transition-all outline-none shadow-sm"
                />
              </div>
              <button className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm bg-white">
                <Filter size={18} className="text-slate-500" />
              </button>
              <button className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm bg-white">
                <Download size={18} className="text-slate-500" />
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="h-10 w-10 shrink-0" />
                    <Skeleton className="h-6 flex-1" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            ) : mockInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-20 text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-8 border border-dashed border-slate-200">
                  <FileMinus size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">No records found</h3>
                <p className="text-slate-500 mt-3 font-medium max-w-sm">
                  We couldn't find any invoices matching your filters. Upload your first receipt to get started.
                </p>
                <button 
                  onClick={triggerUpload}
                  className="mt-8 flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  <Plus size={18} />
                  New Upload
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b bg-slate-50/30">
                    <th className="px-8 py-5 text-[11px] font-black uppercase text-slate-400 tracking-widest leading-none">Status</th>
                    <th className="px-8 py-5 text-[11px] font-black uppercase text-slate-400 tracking-widest leading-none">Entity / Vendor</th>
                    <th className="px-8 py-5 text-[11px] font-black uppercase text-slate-400 tracking-widest leading-none">Date</th>
                    <th className="px-8 py-5 text-[11px] font-black uppercase text-slate-400 tracking-widest leading-none text-right">Taxable Amount</th>
                    <th className="px-8 py-5 text-[11px] font-black uppercase text-slate-400 tracking-widest leading-none text-right">VAT (15%)</th>
                    <th className="px-8 py-5 text-[11px] font-black uppercase text-slate-400 tracking-widest leading-none"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mockInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                      <td className="px-8 py-5">
                        <div className={cn(
                          "inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                          inv.status === 'verified' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          inv.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-rose-50 text-rose-600 border-rose-100"
                        )}>
                          {inv.status === 'verified' ? <CheckCircle2 size={12} /> : 
                           inv.status === 'pending' ? <Clock size={12} /> : 
                           <AlertCircle size={12} />}
                          {inv.status}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 tracking-tight">{inv.vendor}</span>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">{inv.id}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase">{inv.date}</td>
                      <td className="px-8 py-5 text-sm font-black text-right tracking-tight text-slate-900">ETB {inv.amount}</td>
                      <td className="px-8 py-5 text-sm font-black text-right text-indigo-600 tracking-tight">ETB {inv.vat}</td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-all opacity-0 group-hover:opacity-100 text-slate-400">
                          <MoreHorizontal size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-6 border-t bg-slate-50/20 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Page 1 of 82 • 1,240 tax records</p>
            <div className="flex gap-2">
              <button className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase transition-all hover:bg-slate-50 disabled:opacity-30 flex items-center gap-2 shadow-sm text-slate-600" disabled>Previous</button>
              <button className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase transition-all hover:bg-slate-50 bg-white flex items-center gap-2 shadow-sm text-slate-600">
                Next
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
