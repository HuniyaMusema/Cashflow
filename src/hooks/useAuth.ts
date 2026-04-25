import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { laravelApi } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { toast } from 'sonner';

export function useAuth() {
  const qc = useQueryClient();
  const { setActiveCompany } = useAppStore();

  const userQuery = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const { data } = await laravelApi.get('/user');
      setActiveCompany({ id: data.company.id, name: data.company.name, tin: data.company.tin });
      return data;
    },
    enabled: !!localStorage.getItem('auth_token'),
    retry: false,
  });

  const login = useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      laravelApi.post('/login', creds).then(r => r.data),
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token);
      setActiveCompany({
        id: data.user.company.id,
        name: data.user.company.name,
        tin: data.user.company.tin,
      });
      qc.invalidateQueries({ queryKey: ['auth-user'] });
    },
    onError: () => toast.error('Invalid credentials'),
  });

  const register = useMutation({
    mutationFn: (payload: {
      company_name: string; tin: string;
      name: string; email: string;
      password: string; password_confirmation: string;
    }) => laravelApi.post('/register', payload).then(r => r.data),
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token);
      qc.invalidateQueries({ queryKey: ['auth-user'] });
    },
    onError: () => toast.error('Registration failed'),
  });

  const logout = useMutation({
    mutationFn: () => laravelApi.post('/logout').then(r => r.data),
    onSuccess: () => {
      localStorage.removeItem('auth_token');
      qc.clear();
      window.location.href = '/login';
    },
  });

  return { userQuery, login, register, logout };
}
