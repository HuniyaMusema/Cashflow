import { useQuery } from '@tanstack/react-query';
import { laravelApi } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

export function useDashboard() {
  const { taxPeriod } = useAppStore();

  return useQuery({
    queryKey: ['dashboard', taxPeriod],
    queryFn: async () => {
      const { data } = await laravelApi.get('/dashboard', {
        params: { tax_period: taxPeriod },
      });
      return data;
    },
  });
}
