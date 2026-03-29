import { useState } from 'react';
import { 
  CheckCircle, 
  RotateCw, 
  ZoomIn, 
  ZoomOut,
  Sparkles,
  Save,
  ArrowLeft
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const invoiceSchema = z.object({
  vendorName: z.string().min(2, 'Vendor name is required'),
  tin: z.string().length(10, 'TIN must be exactly 10 digits'),
  invoiceDate: z.string().min(1, 'Date is required'),
  taxableAmount: z.string().min(1, 'Amount is required'),
  vatAmount: z.string().min(1, 'VAT amount is required'),
  invoiceType: z.enum(['Sales', 'Purchase']),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export const OCRReview = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(100);

  const { register, handleSubmit, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      vendorName: 'Ethio Telecom',
      tin: '0012345678',
      invoiceDate: '2024-03-25',
      taxableAmount: '1200.00',
      vatAmount: '180.00',
      invoiceType: 'Sales',
    }
  });

  const onSubmit = (_data: InvoiceFormValues) => {
    setSaving(true);
    toast.promise(() => new Promise(resolve => setTimeout(resolve, 1500)), {
      loading: 'Syncing with tax records...',
      success: () => {
        setSaving(false);
        navigate('/sales');
        return 'Tax record verified and saved successfully!';
      },
      error: 'Failed to save record.'
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden animate-in fade-in duration-700 bg-slate-50/30">
      {/* Review Header */}
      <div className="h-16 border-b bg-white px-8 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">Review & Verify</h1>
            <p className="text-xs font-bold text-indigo-600 mt-1 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} />
              AI-Extracted Data
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 mr-4">
            Confidence: <span className="text-emerald-600 ml-1">98.2%</span>
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            Discard
          </button>
          <button 
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <RotateCw className="animate-spin" size={18} /> : <Save size={18} />}
            Verify & Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Document Viewer */}
        <div className="flex-1 bg-slate-200/50 p-10 overflow-auto flex flex-col items-center gap-6 scrollbar-none border-r border-slate-200">
          <div className="flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl sticky top-0 z-10 transition-all">
            <button onClick={() => setZoom(z => Math.max(z - 20, 50))} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all"><ZoomOut size={18} /></button>
            <div className="px-4 flex items-center text-xs font-black text-slate-400 border-x">{zoom}%</div>
            <button onClick={() => setZoom(z => Math.min(z + 20, 200))} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all"><ZoomIn size={18} /></button>
            <button className="p-2.5 hover:bg-slate-50 rounded-xl transition-all"><RotateCw size={18} /></button>
          </div>
          
          <div 
            className="bg-white shadow-2xl rounded-2xl border border-slate-200/50 transition-all duration-300 transform origin-top"
            style={{ width: `${600 * (zoom/100)}px`, height: `${800 * (zoom/100)}px` }}
          >
            {/* Mock Image Content */}
            <div className="p-16 h-full flex flex-col">
              <div className="h-10 w-40 bg-slate-900 rounded mb-12" />
              <div className="space-y-4 mb-auto">
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-4 w-5/6 bg-slate-100 rounded" />
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
              </div>
              <div className="flex justify-between items-end border-t border-slate-100 pt-8 mt-auto">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-slate-100 rounded" />
                  <div className="h-3 w-24 bg-slate-100 rounded" />
                </div>
                <div className="h-12 w-32 bg-indigo-50 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Data Entry Form */}
        <div className="w-[450px] bg-white overflow-y-auto border-l border-slate-200 shadow-xl z-10 p-10 space-y-10 custom-scrollbar">
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="h-8 w-1 bg-indigo-600 rounded-full" />
              Invoice Details
            </h2>
            
            <form className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1">Vendor / Entity Name</label>
                <input 
                  {...register('vendorName')}
                  className={cn(
                    "w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/40 transition-all",
                    errors.vendorName && "border-rose-500 ring-rose-500/10"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1">TIN Number</label>
                  <input 
                    {...register('tin')}
                    placeholder="10 digits"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/40 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1">Invoice Date</label>
                  <input 
                    {...register('invoiceDate')}
                    type="date"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/40 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1">Financial Data</label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm group-focus-within:text-indigo-600 transition-colors">ETB</span>
                  <input 
                    {...register('taxableAmount')}
                    className="w-full pl-16 pr-5 py-4 bg-slate-100 border-transparent rounded-2xl text-lg font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/40 focus:bg-white transition-all shadow-sm"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-400">Taxable</span>
                </div>
              </div>

              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm group-focus-within:text-indigo-600 transition-colors">ETB</span>
                <input 
                  {...register('vatAmount')}
                  className="w-full pl-16 pr-5 py-4 bg-slate-100 border-transparent rounded-2xl text-lg font-black text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/40 focus:bg-white transition-all shadow-sm"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-indigo-600/60">VAT (15%)</span>
              </div>
            </form>
          </section>

          <section className="p-8 bg-indigo-50 border border-indigo-100 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 group-hover:rotate-12 transition-transform duration-1000">
               <Sparkles size={100} />
            </div>
            <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle size={16} />
              e-Tax Readiness
            </h3>
            <p className="text-sm text-indigo-700 font-medium leading-relaxed">
              This invoice meets the **Ethiopian Revenue Authority (ERA)** digital filing requirements. The TIN and VAT calculations have been cross-checked.
            </p>
          </section>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
             <button className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95">
                Approve & Next
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
