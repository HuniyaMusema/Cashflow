import { useState, useRef } from 'react';
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
  ArrowRight,
  Camera,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CameraCapture } from '../components/forms/CameraCapture';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';
import { useInvoices } from '../hooks/useInvoices';
import { useOcrExtract } from '../hooks/useOcr';
import { useAppStore } from '../store/useAppStore';

export const Invoices = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const { taxPeriod }         = useAppStore();

  // Derive type filter from route
  const routeType = location.pathname === '/sales' ? 'Sales'
    : location.pathname === '/purchases' ? 'Purchase'
    : undefined;

  const { data, isLoading } = useInvoices({
    type:       routeType,
    status:     filter === 'all' ? undefined : filter,
    tax_period: taxPeriod,
    search:     search || undefined,
    page,
  });

  const ocrExtract = useOcrExtract();

  const handleFileSelect = async (file: File) => {
    const toastId = toast.loading('Running OCR analysis... this may take 30s');
    try {
      const result = await ocrExtract.mutateAsync(file);
      toast.dismiss(toastId);
      if (result.extracted) {
        toast.success('OCR complete — review the extracted data');
        navigate('/review', { state: { extracted: result.extracted, filename: result.filename } });
      } else {
        toast.warning('OCR returned no data — fill fields manually');
        navigate('/review', { state: { extracted: null } });
      }
    } catch {
      toast.dismiss(toastId);
      toast.error('OCR failed — navigating to manual entry');
      navigate('/review', { state: { extracted: null } });
    }
  };

  const invoices = data?.data ?? [];
  const meta     = data?.meta;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700 max-w-7xl mx-auto px-4 lg:px-8 py-10">

      {/* Camera modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleFileSelect}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">
            <FileSearch size={14} />
            Document Management
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">Invoices</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-3 font-medium text-lg leading-none">Review and manage your tax-compliant digital records.</p>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            accept="image/*"
          />
          {/* Camera capture button */}
          <button
            onClick={() => setShowCamera(true)}
            className="flex items-center gap-2 px-5 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
          >
            <Camera size={18} className="text-indigo-500" />
            Scan Receipt
          </button>
          {/* File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={18} />
            Upload File
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-soft overflow-hidden flex flex-col min-h-[500px]">
          {/* Table Header / Toolbar */}
          <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex bg-slate-200/50 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
              {['all', 'verified', 'pending', 'rejected'].map((f) => (
                <button 
                  key={f}
                  onClick={() => { setFilter(f); setPage(1); }}
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
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/40 transition-all outline-none shadow-sm"
                />
              </div>
              <button className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm bg-white">
                <Filter size={18} className="text-slate-500" />
              </button>
              <a
                href={`/api/v1/reports/csv?tax_period=${taxPeriod}&type=${routeType ?? 'Sales'}&token=${localStorage.getItem('auth_token') ?? ''}`}
                title={`Download ${routeType ?? 'Sales'} e-Tax CSV`}
                className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm bg-white flex items-center"
              >
                <Download size={18} className="text-slate-500" />
              </a>
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-x-auto">
            {isLoading ? (
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
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-20 text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-8 border border-dashed border-slate-200">
                  <FileMinus size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">No records found</h3>
                <p className="text-slate-500 mt-3 font-medium max-w-sm">
                  Upload your first receipt to get started.
                </p>
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setShowCamera(true)}
                    className="flex items-center gap-2 px-6 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                  >
                    <Camera size={18} className="text-indigo-500" />
                    Scan Receipt
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                  >
                    <Plus size={18} />
                    Upload File
                  </button>
                </div>
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
                  {invoices.map((inv: { id: number; invoice_number: string; vendor_name: string; invoice_date: string; taxable_amount: string; vat_amount: string; status: string }) => (
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
                          <span className="text-sm font-bold text-slate-900 tracking-tight">{inv.vendor_name}</span>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">{inv.invoice_number}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase">{inv.invoice_date}</td>
                      <td className="px-8 py-5 text-sm font-black text-right tracking-tight text-slate-900">ETB {Number(inv.taxable_amount).toLocaleString()}</td>
                      <td className="px-8 py-5 text-sm font-black text-right text-indigo-600 tracking-tight">ETB {Number(inv.vat_amount).toLocaleString()}</td>
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
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Page {meta?.current_page ?? 1} of {meta?.last_page ?? 1} • {meta?.total ?? 0} tax records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase transition-all hover:bg-slate-50 disabled:opacity-30 flex items-center gap-2 shadow-sm text-slate-600"
              >Previous</button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!meta || page >= meta.last_page}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold uppercase transition-all hover:bg-slate-50 bg-white flex items-center gap-2 shadow-sm text-slate-600 disabled:opacity-30"
              >
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
