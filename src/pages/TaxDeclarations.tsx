import { useState } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  Timer,
  RefreshCw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { toast } from 'sonner';

const pastDeclarations = [
  { id: 'DEC-2024-02', period: 'February 2024', date: 'Mar 15, 2024', status: 'Filed', amount: '45,200.00' },
  { id: 'DEC-2024-01', period: 'January 2024', date: 'Feb 14, 2024', status: 'Filed', amount: '38,900.00' },
  { id: 'DEC-2023-12', period: 'December 2023', date: 'Jan 12, 2024', status: 'Filed', amount: '52,100.00' },
];

export const TaxDeclarations = () => {
  const { taxPeriod } = useAppStore();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerate = () => {
    setGenerating(true);
    setProgress(0);
    
    toast.promise(() => new Promise((resolve, _reject) => {
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setGenerating(false);
              resolve(true);
            }, 500);
            return 100;
          }
          return p + 2;
        });
      }, 50);
    }), {
      loading: 'Compiling e-Tax CSV from 1,240 records...',
      success: 'Generation complete! Your e-Tax CSV is ready for submission.',
      error: 'Failed to generate report.'
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-3 duration-700 max-w-5xl mx-auto px-4 lg:px-8 py-10">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-black text-indigo-600 uppercase tracking-widest mx-auto">
          <Sparkles size={14} />
          Digital Filing 2026
        </div>
        <h1 className="text-5xl font-black tracking-tight text-slate-900 leading-none">Tax Declarations</h1>
        <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
          Automate your VAT filings with a one-click e-Tax CSV generator. Optimized for the **Ethiopian Revenue Authority**.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Main Action Card */}
        <div className="bg-white border border-slate-200 rounded-[32px] p-12 shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-1000 grayscale">
            <FileText size={200} />
          </div>
          
          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                <FileText size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none mb-1">Current Period</h2>
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">{taxPeriod}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Records Found</p>
                  <p className="text-2xl font-black text-slate-900">1,240 <span className="text-sm font-bold text-slate-400 uppercase ml-1">Invoices</span></p>
                </div>
                <div className="h-10 w-[1px] bg-slate-200" />
                <div className="flex-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Net VAT Payable</p>
                  <p className="text-2xl font-black text-indigo-600">ETB 46,750 <span className="text-sm font-bold text-slate-400 uppercase ml-1">Total</span></p>
                </div>
              </div>

              {generating ? (
                <div className="space-y-4 pt-4 animate-in fade-in duration-500">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-500 mb-1">
                    <span className="flex items-center gap-2"><RefreshCw size={12} className="animate-spin" /> Compiling Data...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border p-0.5 border-slate-200">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300 shadow-sm"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 italic">This usually takes about 15 seconds for large datasets.</p>
                </div>
              ) : (
                <button 
                  onClick={handleGenerate}
                  className="w-full py-5 bg-slate-900 border border-slate-800 text-white rounded-2xl font-black text-base shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                >
                  Generate e-Tax CSV
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Previous Submissions */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 px-2">
            <Timer size={18} className="text-indigo-600" />
            Previous Submissions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pastDeclarations.map((dec) => (
              <div key={dec.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft hover:shadow-md transition-all group border-b-4 border-b-indigo-500/10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <CheckCircle2 size={20} />
                  </div>
                  <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                    <Download size={18} />
                  </button>
                </div>
                <h4 className="text-sm font-black text-slate-900 mb-1">{dec.period}</h4>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{dec.id}</p>
                <div className="flex items-end justify-between pt-4 border-t border-slate-50">
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Amount Filed</p>
                     <p className="text-sm font-black text-slate-900">ETB {dec.amount}</p>
                   </div>
                   <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                     {dec.status}
                   </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
