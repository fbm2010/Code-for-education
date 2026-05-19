import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Compass } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  ACCOUNT_LOCKED: 'Account is temporarily locked. Please try again later.',
  EMAIL_NOT_VERIFIED: 'Please verify your email before logging in.',
};

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      setUser(res.data.data);
      navigate('/dashboard');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      setApiError(ERROR_MESSAGES[code ?? ''] ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = async () => {
    setLoading(true);
    try {
      const res = await api.post('/auth/guest');
      setUser(res.data.data);
      navigate('/map');
    } catch {
      setApiError('Could not create guest session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-earth-700 text-white p-12 justify-center items-center">
        <Compass className="w-20 h-20 text-earth-300 mb-6" aria-hidden="true" />
        <h2 className="text-4xl font-black mb-4">Welcome back,<br />Explorer.</h2>
        <p className="text-earth-300 text-lg text-center">Your learning expedition continues — pick up where you left off.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-parchment">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Compass className="w-10 h-10 text-earth-400 mx-auto mb-3" aria-hidden="true" />
            <h1 className="text-3xl font-black text-earth-800">Sign In</h1>
            <p className="text-earth-500 mt-1">Continue your expedition</p>
          </div>

          {apiError && (
            <div role="alert" className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm font-semibold">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`input ${errors.email ? 'border-red-400' : ''}`}
                {...register('email')}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0" htmlFor="password">Password</label>
                <Link to="/forgot-password" className="text-earth-400 hover:text-earth-600 text-xs font-semibold">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={`input ${errors.password ? 'border-red-400' : ''}`}
                {...register('password')}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && <p id="password-error" className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-earth-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-parchment px-3 text-earth-400 text-sm">or</span>
            </div>
          </div>

          <button
            onClick={loginAsGuest}
            disabled={loading}
            className="btn-secondary w-full"
          >
            Continue as Guest Explorer 🧭
          </button>

          <p className="text-center text-earth-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-earth-600 font-bold hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
