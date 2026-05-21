import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Compass } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiUrl } from '../../lib/apiUrl';
import { useAuthStore } from '../../stores/authStore';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  displayName: z.string().min(1, 'Name is required').max(50),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number')
    .regex(/[^A-Za-z0-9]/, 'Must include a special character'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: 'Google Sign-In needs a Google client ID and secret in the API environment.',
  invalid_google_response: 'Google Sign-In returned an invalid response. Please try again.',
  invalid_google_state: 'Google Sign-In expired. Please try again.',
  google_token_failed: 'Google Sign-In could not verify the account. Please try again.',
  google_profile_failed: 'Google Sign-In could not read the Google profile. Please try again.',
  google_signin_failed: 'Google Sign-In failed. Please try again.',
  access_denied: 'Google Sign-In was cancelled.',
};

function passwordStrength(pw: string): { level: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { level: 0, label: 'Too short', color: 'bg-red-300' },
    { level: 1, label: 'Weak', color: 'bg-red-400' },
    { level: 2, label: 'Fair', color: 'bg-amber-400' },
    { level: 3, label: 'Good', color: 'bg-olive-400' },
    { level: 4, label: 'Strong', color: 'bg-forest-400' },
  ];
  return levels[score] ?? levels[0];
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuthStore();
  const oauthError = searchParams.get('oauth_error');
  const [apiError, setApiError] = useState<string | null>(
    oauthError ? OAUTH_ERROR_MESSAGES[oauthError] ?? 'Google Sign-In failed. Please try again.' : null,
  );
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [pwValue, setPwValue] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const pw = passwordStrength(pwValue);

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      });
      if (res.data.data.emailVerificationSent) {
        setEmailSent(true);
      } else {
        setUser(res.data.data.user);
        navigate('/onboarding');
      }
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      setApiError(code === 'EMAIL_TAKEN' ? 'That email is already registered.' : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-6">
        <div className="card max-w-md w-full text-center py-12">
          <div className="text-6xl mb-4">📬</div>
          <h1 className="text-2xl font-black text-earth-800 mb-3">Check your email</h1>
          <p className="text-earth-500 mb-6">
            We've sent a verification link. Click it to activate your account and start your expedition.
          </p>
          <Link to="/login" className="btn-primary inline-block">Back to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col w-1/2 bg-earth-700 text-white p-12 justify-center items-center">
        <Compass className="w-20 h-20 text-earth-300 mb-6" aria-hidden="true" />
        <h2 className="text-4xl font-black mb-4">Begin your<br />expedition.</h2>
        <p className="text-earth-300 text-lg text-center">Join thousands of learners exploring the world — no internet required.</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-parchment overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-earth-800">Create Account</h1>
            <p className="text-earth-500 mt-1">Pack your bag and start learning</p>
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
            Sign up with Google
          </a>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-earth-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-parchment px-3 text-earth-400 text-sm">or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="displayName">Your explorer name</label>
              <input
                id="displayName"
                type="text"
                autoComplete="name"
                className={`input ${errors.displayName ? 'border-red-400' : ''}`}
                {...register('displayName')}
              />
              {errors.displayName && <p className="text-red-500 text-xs mt-1">{errors.displayName.message}</p>}
            </div>

            <div>
              <label className="label" htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                className={`input ${errors.email ? 'border-red-400' : ''}`}
                {...register('email')}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                className={`input ${errors.password ? 'border-red-400' : ''}`}
                {...register('password')}
                onChange={e => setPwValue(e.target.value)}
              />
              {pwValue && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${pw.level >= i ? pw.color : 'bg-earth-100'}`} aria-hidden="true" />
                    ))}
                  </div>
                  <p className="text-xs text-earth-500">{pw.label}</p>
                </div>
              )}
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={`input ${errors.confirmPassword ? 'border-red-400' : ''}`}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account…' : 'Begin the Expedition 🌅'}
            </button>
          </form>

          <p className="text-center text-earth-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-earth-600 font-bold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
