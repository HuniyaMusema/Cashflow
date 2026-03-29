import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Invoices } from './pages/Invoices';
import { OCRReview } from './pages/OCRReview';
import { TaxDeclarations } from './pages/TaxDeclarations';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sales" element={<Invoices />} />
          <Route path="/purchases" element={<Invoices />} />
          <Route path="/review" element={<OCRReview />} />
          <Route path="/declarations" element={<TaxDeclarations />} />
          <Route path="/settings" element={<div className="p-10 max-w-2xl mx-auto"><h1 className="text-4xl font-black tracking-tight">Settings</h1><p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Company profile and TIN management</p><div className="mt-8 p-8 border border-slate-200 bg-white rounded-3xl space-y-6 shadow-soft"><div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Company Name</label><p className="font-bold text-slate-900">Example Ethiopia PLC</p></div><div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tax Identification Number (TIN)</label><p className="font-bold tracking-widest text-slate-900 text-lg">1234567890</p></div><div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">VAT Registered Since</label><p className="font-bold text-slate-900">2018-09-11</p></div></div></div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
