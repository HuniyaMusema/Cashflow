import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const MainLayout = () => {
  return (
    <div className="flex h-screen bg-slate-50/50 dark:bg-slate-950 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 shadow-2xl relative z-10">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50/20 dark:bg-slate-900">
          <div className="w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
