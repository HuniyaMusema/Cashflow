import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Company {
  id: string;
  name: string;
  tin: string;
}

interface AppState {
  activeCompany: Company | null;
  userRole: 'admin' | 'accountant' | 'viewer' | null;
  taxPeriod: string;
  calendarType: 'gregorian' | 'ethiopian';
  theme: 'light' | 'dark';
  language: 'en' | 'am';
  setActiveCompany: (company: Company) => void;
  setUserRole: (role: 'admin' | 'accountant' | 'viewer') => void;
  setTaxPeriod: (period: string) => void;
  toggleCalendar: () => void;
  toggleTheme: () => void;
  setLanguage: (lang: 'en' | 'am') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeCompany: { id: '1', name: 'ABZ', tin: '1234567890' },
      userRole:      null,
      taxPeriod:     new Date().toISOString().slice(0, 7),
      calendarType:  'gregorian',
      theme:         'light',
      language:      'en',
      setActiveCompany: (company) => set({ activeCompany: company }),
      setUserRole:      (role)    => set({ userRole: role }),
      setTaxPeriod:     (period)  => set({ taxPeriod: period }),
      toggleCalendar: () => set((s) => ({
        calendarType: s.calendarType === 'gregorian' ? 'ethiopian' : 'gregorian',
      })),
      toggleTheme: () => set((s) => {
        const next = s.theme === 'light' ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', next === 'dark');
        return { theme: next };
      }),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'cashflow-store' }
  )
);
