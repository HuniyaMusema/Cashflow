import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { X, Building2, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const schema = z.object({
  company_name: z.string().min(2, 'Company name required'),
  tin:          z.string().length(10, 'TIN must be exactly 10 digits').regex(/^\d+$/, 'TIN must be digits only'),
  email:        z.string().email('Invalid email').optional().or(z.literal('')),
  password:     z.string().min(6, 'Min 6 characters').optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

interface Credentials { email: string; password: string; company: { id: number; name: string; tin: string } }

export const AddCompanyModal = ({ onClose }: { onClose: () => void }) => {
  const qc = useQueryClient();
  const [created, setCreated] = useState<Credentials | null>(null);
  const [copied, setCopied]   = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { company_name: '', tin: '', email: '', password: 'password123' },
  });

  const create = useMutation({
    mutationFn: (data: FormValues) => api.post('/admin/companies', {
      company_name: data.company_name,
      tin:          data.tin,
      email:        data.email || undefined,
      password:     data.password || 'password123',
    }).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      setCreated({ email: data.credentials.email, password: data.credentials.password, company: data.company });
      toast.success(`Company "${data.company.name}" created`);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to create company');
    },
  });

  const copyCredentials = () => {
    if (!created) return;
    navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
              <Building2 size={18} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Add New Company</h2>
              <p className="text-xs text-slate-500">Creates company + login credentials</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {created ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{created.company.name} created</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">TIN: {created.company.tin}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Login Credentials</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-mono font-semibold text-slate-900 dark:text-white">{created.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Password</p>
                  <p className="text-sm font-mono font-semibold text-slate-900 dark:text-white">{created.password}</p>
                </div>
              </div>
            </div>

            <button onClick={copyCredentials}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
              {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Copy Credentials'}
            </button>
            <button onClick={onClose}
              className="w-full py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(d => create.mutate(d))} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Company Name *</label>
              <input {...register('company_name')} placeholder="e.g. Ahmed Rahmeto Retail Trade"
                className={cn('w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all',
                  errors.company_name ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700')} />
              {errors.company_name && <p className="text-xs text-rose-500">{errors.company_name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">TIN Number * (10 digits)</label>
              <input {...register('tin')} placeholder="e.g. 0001163960" maxLength={10}
                className={cn('w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all',
                  errors.tin ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700')} />
              {errors.tin && <p className="text-xs text-rose-500">{errors.tin.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email (optional)</label>
              <input {...register('email')} type="email" placeholder="Auto-generated from TIN if empty"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Initial Password</label>
              <input {...register('password')} type="text" placeholder="password123"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
              <p className="text-xs text-slate-400">User should change this after first login.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={create.isPending}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {create.isPending ? <Loader2 size={15} className="animate-spin" /> : <Building2 size={15} />}
                {create.isPending ? 'Creating...' : 'Create Company'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
