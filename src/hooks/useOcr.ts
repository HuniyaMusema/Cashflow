import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ocrApi } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { toast } from 'sonner';

export interface OcrExtracted {
  vendorName:   string | null;
  tin:          string | null;
  tinValid:     boolean;
  date:         string | null;
  total:        number | null;
  vat:          number | null;
  mrc:          string | null;
  fsNumber:     string | null;
  vatRegNo:     string | null;
  needsReview:  boolean;
  reviewReason: string[];
  rawText:      string;
}

export interface OcrResult {
  success:      boolean;
  extracted:    OcrExtracted;
  filename:     string;
  needsReview?: boolean;
  reviewReason?: string[];
  invoice?:     object;
}

/**
 * Extract only — sends image to OCR service, returns extracted fields for review.
 */
export function useOcrExtract() {
  const { activeCompany } = useAppStore();

  return useMutation({
    mutationFn: async (file: File): Promise<OcrResult> => {
      const form = new FormData();
      form.append('receipt', file);
      form.append('company_id', String(activeCompany?.id ?? 1));

      try {
        const { data } = await ocrApi.post('/extract-only', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000, // Tesseract can be slow
        });
        return data;
      } catch {
        // Fallback: return empty fields so user can fill manually
        toast.warning('OCR service unavailable — please fill fields manually.');
        return {
          success: false,
          filename: file.name,
          extracted: {
            vendorName: null,
            tin:        null,
            date:       new Date().toISOString().slice(0, 10),
            total:      null,
            rawText:    '',
          },
        };
      }
    },
    onError: () => toast.error('OCR extraction failed'),
  });
}

/**
 * Full pipeline — extract + auto-submit to Laravel.
 */
export function useOcrUpload() {
  const qc = useQueryClient();
  const { activeCompany } = useAppStore();

  return useMutation({
    mutationFn: async ({
      file,
      invoiceType = 'Purchase',
    }: {
      file: File;
      invoiceType?: 'Sales' | 'Purchase';
    }): Promise<OcrResult> => {
      const form = new FormData();
      form.append('receipt', file);
      form.append('company_id', String(activeCompany?.id ?? 1));
      form.append('invoice_type', invoiceType);
      const { data } = await ocrApi.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Receipt processed and saved');
    },
    onError: () => toast.error('OCR upload failed'),
  });
}
