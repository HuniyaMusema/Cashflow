import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { laravelApi } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});
type FormValues = z.infer<typeof schema>;

export const Login = ({ onSuccess }: { onSuccess: () => void }) => {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setActiveCompany } = useAppStore();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@cashflow.et', password: 'password' },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await laravelApi.post('/login', data);
      localStorage.setItem('auth_token', res.data.token);
      setActiveCompany({
        id:   String(res.data.user.company.id),
        name: res.data.user.company.name,
        tin:  res.data.user.company.tin,
      });
      toast.success('Welcome back!');
      onSuccess();
    } catch {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-200 dark:shadow-indigo-900/50 mb-4">
            <Zap size={24} fill="white" className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">ABZ Tax Platform</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all",
                  errors.email ? "border-rose-400" : "border-slate-200 dark:border-slate-700"
                )}
              />
              {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={cn(
                    "w-full px-4 py-3 pr-11 rounded-xl border bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all",
                    errors.password ? "border-rose-400" : "border-slate-200 dark:border-slate-700"
                  )}
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-rose-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-center text-slate-400">
              Demo: <span className="font-mono text-slate-600 dark:text-slate-300">admin@cashflow.et</span> / <span className="font-mono text-slate-600 dark:text-slate-300">password</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
