import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AccountantPortal } from './pages/AccountantPortal';
import { Invoices } from './pages/Invoices';
import { OCRReview } from './pages/OCRReview';
import { TaxDeclarations } from './pages/TaxDeclarations';
import { Login } from './pages/Login';
import { useAppStore } from './store/useAppStore';
import { laravelApi } from './lib/api';

function App() {
  const { theme, userRole, setUserRole, setActiveCompany } = useAppStore();
  const [authed, setAuthed] = useState(!!localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(authed); // fetch user on load if token exists

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // On app load, re-fetch user to get fresh role (handles page refresh)
  useEffect(() => {
    if (!authed) return;
    laravelApi.get('/user')
      .then(r => {
        setUserRole(r.data.role ?? 'accountant');
        setActiveCompany({ id: String(r.data.company.id), name: r.data.company.name, tin: r.data.company.tin });
      })
      .catch(() => {
        // Token expired — log out
        localStorage.removeItem('auth_token');
        setAuthed(false);
      })
      .finally(() => setLoading(false));
  }, [authed]); // eslint-disable-line

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  if (loading)  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sales" element={<Invoices />} />
          <Route path="/purchases" element={<Invoices />} />
          <Route path="/review" element={<OCRReview />} />
          <Route path="/declarations" element={<TaxDeclarations />} />
          <Route path="/accountant"   element={<AccountantPortal />} />
          {/* Admin route — redirect non-admins */}
          <Route path="/admin/*" element={
            userRole === 'admin' ? <AdminDashboard /> : <Navigate to="/" replace />
          } />
          <Route path="/settings" element={
            <div className="p-10 max-w-2xl mx-auto">
              <h1 className="text-3xl font-black tracking-tight dark:text-white">Settings</h1>
              <p className="mt-2 text-slate-500 text-sm uppercase tracking-widest font-semibold">Company profile</p>
              <div className="mt-6 p-8 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl space-y-6 shadow-sm">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Company Name</label>
                  <p className="font-bold text-slate-900 dark:text-white text-lg">ABZ</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">TIN</label>
                  <p className="font-bold tracking-widest text-slate-900 dark:text-white text-lg font-mono">1234567890</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">VAT Registered Since</label>
                  <p className="font-bold text-slate-900 dark:text-white">2018-09-11</p>
                </div>
                <button
                  onClick={() => { localStorage.removeItem('auth_token'); window.location.reload(); }}
                  className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-sm font-semibold border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
