import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';

const schema = z.object({
  newPassword: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must include uppercase')
    .regex(/[0-9]/, 'Must include number')
    .regex(/[^A-Za-z0-9]/, 'Must include special character'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => navigate('/login'), 3000);
      return () => clearTimeout(t);
    }
  }, [success, navigate]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: data.newPassword });
      setSuccess(true);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      if (code === 'TOKEN_EXPIRED') setError('This reset link has expired. Please request a new one.');
      else if (code === 'TOKEN_INVALID' || code === 'TOKEN_USED') setError('This link is invalid or already used.');
      else setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-6">
      <div className="card text-center py-12 max-w-md w-full">
        <p className="text-red-600 font-semibold">Invalid reset link.</p>
        <Link to="/forgot-password" className="btn-primary mt-4 inline-block">Request new link</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-6">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-2xl font-black text-earth-800">Reset Password</h1>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-bold text-olive-700">Password changed!</p>
            <p className="text-earth-500 text-sm mt-2">Redirecting to sign in…</p>
          </div>
        ) : (
          <>
            {error && (
              <div role="alert" className="bg-red-50 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
                {error}{' '}
                {(error.includes('expired') || error.includes('invalid')) && (
                  <Link to="/forgot-password" className="underline font-semibold">Request new link</Link>
                )}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="label" htmlFor="new-password">New password</label>
                <input id="new-password" type="password" className={`input ${errors.newPassword ? 'border-red-400' : ''}`} {...register('newPassword')} />
                {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
              </div>
              <div>
                <label className="label" htmlFor="confirm-new">Confirm password</label>
                <input id="confirm-new" type="password" className={`input ${errors.confirmPassword ? 'border-red-400' : ''}`} {...register('confirmPassword')} />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
