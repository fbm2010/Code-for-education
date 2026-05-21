import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Compass } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiUrl } from '../../lib/apiUrl';
import { useAuthStore } from '../../stores/authStore';
import type { User } from '@zerolink/shared';

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

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: 'Google Sign-In needs a Google client ID and secret in the API environment.',
  invalid_google_response: 'Google Sign-In returned an invalid response. Please try again.',
  invalid_google_state: 'Google Sign-In expired. Please try again.',
  google_token_failed: 'Google Sign-In could not verify the account. Please try again.',
  google_profile_failed: 'Google Sign-In could not read the Google profile. Please try again.',
  google_signin_failed: 'Google Sign-In failed. Please try again.',
  access_denied: 'Google Sign-In was cancelled.',
};

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuthStore();
  const oauthError = searchParams.get('oauth_error');
  const [apiError, setApiError] = useState<string | null>(
    oauthError ? OAUTH_ERROR_MESSAGES[oauthError] ?? 'Google Sign-In failed. Please try again.' : null,
  );
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      setUser(res.data.data.user as User);
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
      setUser({ ...(res.data.data.user as User), role: 'guest' });
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

          {/* Google Sign-In */}
          <a
            href={getApiUrl('/v1/auth/oauth/google')}
            className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-earth-200 bg-white text-earth-700 font-semibold text-sm hover:border-earth-400 hover:shadow-md transition-all mb-4"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </a>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-earth-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-parchment px-3 text-earth-400 text-sm">or sign in with email</span>
            </div>
          </div>

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
