import { useState } from 'react';
import { CheckCircle, RotateCw, ZoomIn, ZoomOut, Sparkles, Save, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useCreateInvoice } from '../hooks/useInvoices';
import { useTranslation } from '../hooks/useTranslation';

const invoiceSchema = z.object({
  vendorName:    z.string().min(2, 'Vendor name is required'),
  tin:           z.string().min(1, 'TIN is required').transform(v => v.replace(/\D/g, '').padEnd(10, '0').slice(0, 10)),
  invoiceDate:   z.string().min(1, 'Date is required'),
  taxableAmount: z.string().min(1, 'Amount is required'),
  vatAmount:     z.string().min(1, 'VAT amount is required'),
  invoiceType:   z.enum(['Sales', 'Purchase']),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export const OCRReview = () => {
  const navigate      = useNavigate();
  const location      = useLocation();
  const [zoom, setZoom] = useState(100);
  const createInvoice = useCreateInvoice();
  const { t }         = useTranslation();

  const ocr = (location.state as { extracted?: Record<string, string | null> } | null)?.extracted;

  const { register, handleSubmit, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      vendorName:    ocr?.vendorName ?? '',
      tin:           ocr?.tin        ?? '',
      invoiceDate:   ocr?.date       ?? new Date().toISOString().slice(0, 10),
      taxableAmount: ocr?.total      ? String(ocr.total) : '',
      vatAmount:     ocr?.total      ? String(Math.round(Number(ocr.total) * 0.15 * 100) / 100) : '',
      invoiceType:   'Purchase',
    },
  });

  const onSubmit = (data: InvoiceFormValues) => {
    // Pad TIN to 10 digits if shorter (OCR sometimes misses digits)
    const tin = data.tin.replace(/\D/g, '').padEnd(10, '0').slice(0, 10);
    toast.promise(
      createInvoice.mutateAsync({
        vendor_name:    data.vendorName,
        vendor_tin:     tin,
        invoice_date:   data.invoiceDate,
        taxable_amount: data.taxableAmount,
        type:           data.invoiceType,
        status:         'verified',
      }).then(() => navigate('/purchases')),
      {
        loading: 'Saving invoice...',
        success: 'Invoice saved successfully!',
        error:   (err) => `Failed: ${err?.response?.data?.message ?? err.message}`,
      }
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden animate-in fade-in duration-700 bg-slate-50/30 dark:bg-slate-950">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-8 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none">{t('reviewVerify')}</h1>
            <p className="text-xs font-bold text-indigo-600 mt-1 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} /> {t('aiExtracted')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
            {t('discard')}
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={createInvoice.isPending}
            className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {createInvoice.isPending ? <RotateCw className="animate-spin" size={18} /> : <Save size={18} />}
            {t('verifySave')}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Document Viewer */}
        <div className="flex-1 bg-slate-200/50 dark:bg-slate-800/50 p-10 overflow-auto flex flex-col items-center gap-6 scrollbar-none border-r border-slate-200 dark:border-slate-700">
          <div className="flex gap-2 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl sticky top-0 z-10">
            <button onClick={() => setZoom(z => Math.max(z - 20, 50))} className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all dark:text-slate-300"><ZoomOut size={18} /></button>
            <div className="px-4 flex items-center text-xs font-black text-slate-400 border-x dark:border-slate-600">{zoom}%</div>
            <button onClick={() => setZoom(z => Math.min(z + 20, 200))} className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all dark:text-slate-300"><ZoomIn size={18} /></button>
            <button className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all dark:text-slate-300"><RotateCw size={18} /></button>
          </div>

          <div
            className="bg-white dark:bg-slate-800 shadow-2xl rounded-2xl border border-slate-200/50 dark:border-slate-700 transition-all duration-300 origin-top"
            style={{ width: `${600 * (zoom / 100)}px`, height: `${800 * (zoom / 100)}px` }}
          >
            <div className="p-16 h-full flex flex-col">
              <div className="h-10 w-40 bg-slate-900 dark:bg-slate-600 rounded mb-12" />
              <div className="space-y-4 mb-auto">
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded" />
                <div className="h-4 w-5/6 bg-slate-100 dark:bg-slate-700 rounded" />
                <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-700 rounded" />
              </div>
              <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-700 pt-8 mt-auto">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-slate-100 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-12 w-32 bg-indigo-50 dark:bg-indigo-900/30 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="w-[450px] bg-white dark:bg-slate-900 overflow-y-auto border-l border-slate-200 dark:border-slate-700 shadow-xl z-10 p-10 space-y-10 custom-scrollbar">
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="h-8 w-1 bg-indigo-600 rounded-full" />
              {t('invoiceDetails')}
            </h2>

            <form className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1">{t('vendorName')}</label>
                <input
                  {...register('vendorName')}
                  className={cn(
                    "w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/40 transition-all",
                    errors.vendorName && "border-rose-500"
                  )}
                />
                {errors.vendorName && <p className="text-xs text-rose-500 pl-1">{errors.vendorName.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1">{t('tinNumber')}</label>
                  <input
                    {...register('tin')}
                    placeholder="10 digits"
                    className={cn(
                      "w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/40 transition-all",
                      errors.tin && "border-rose-500"
                    )}
                  />
                  {errors.tin && <p className="text-xs text-rose-500 pl-1">{errors.tin.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1">{t('invoiceDate')}</label>
                  <input
                    {...register('invoiceDate')}
                    type="date"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/40 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1">{t('financialData')}</label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">ETB</span>
                  <input
                    {...register('taxableAmount')}
                    className="w-full pl-16 pr-20 py-4 bg-slate-100 dark:bg-slate-800 border-transparent rounded-2xl text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:bg-white dark:focus:bg-slate-700 transition-all shadow-sm"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-400">{t('taxable')}</span>
                </div>
              </div>

              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">ETB</span>
                <input
                  {...register('vatAmount')}
                  className="w-full pl-16 pr-20 py-4 bg-slate-100 dark:bg-slate-800 border-transparent rounded-2xl text-lg font-black text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:bg-white dark:focus:bg-slate-700 transition-all shadow-sm"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-indigo-600/60">VAT (15%)</span>
              </div>

              {/* Invoice Type */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1">Type</label>
                <select
                  {...register('invoiceType')}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all"
                >
                  <option value="Purchase">Purchase</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>
            </form>
          </section>

          <section className="p-8 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-3xl relative overflow-hidden group">
            <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <CheckCircle size={16} /> {t('eTaxReadiness')}
            </h3>
            <p className="text-sm text-indigo-700 dark:text-indigo-400 font-medium leading-relaxed">{t('eTaxDesc')}</p>
          </section>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={createInvoice.isPending}
              className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-2xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {t('approveNext')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
