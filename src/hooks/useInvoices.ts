import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { laravelApi } from '../lib/api';
import { toast } from 'sonner';

export interface Invoice {
  id: number;
  invoice_number: string;
  vendor_name: string;
  vendor_tin: string;
  invoice_date: string;
  type: 'Sales' | 'Purchase';
  taxable_amount: string;
  vat_amount: string;
  withholding_amount: string;
  total_amount: string;
  status: 'pending' | 'verified' | 'rejected';
  source: 'manual' | 'ocr';
  tax_period: string;
}

interface InvoiceFilters {
  type?: string;
  status?: string;
  tax_period?: string;
  search?: string;
  page?: number;
}

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const { data } = await laravelApi.get('/invoices', { params: filters });
      return data;
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Invoice>) =>
      laravelApi.post('/invoices', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Invoice created');
    },
    onError: () => toast.error('Failed to create invoice'),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      laravelApi.patch(`/invoices/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Status updated');
    },
  });
}

export function useBulkWithholding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, rate }: { ids: number[]; rate: 2 | 3 }) =>
      Promise.all(ids.map(id =>
        laravelApi.patch(`/invoices/${id}/status`, { status: 'verified', withholding_rate: rate })
      )),
    onSuccess: (_, { ids }) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Withholding applied to ${ids.length} invoice(s)`);
    },
    onError: () => toast.error('Bulk action failed'),
  });
}
