import { create } from 'zustand';

interface Company {
  id: string;
  name: string;
  tin: string;
}

interface AppState {
  activeCompany: Company | null;
  taxPeriod: string; // e.g. "2024-03"
  calendarType: 'gregorian' | 'ethiopian';
  setActiveCompany: (company: Company) => void;
  setTaxPeriod: (period: string) => void;
  toggleCalendar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeCompany: { id: '1', name: 'Example Ethiopia PLC', tin: '1234567890' },
  taxPeriod: new Date().toISOString().slice(0, 7),
  calendarType: 'gregorian',
  setActiveCompany: (company) => set({ activeCompany: company }),
  setTaxPeriod: (period) => set({ taxPeriod: period }),
  toggleCalendar: () => set((state) => ({ 
    calendarType: state.calendarType === 'gregorian' ? 'ethiopian' : 'gregorian' 
  })),
}));
