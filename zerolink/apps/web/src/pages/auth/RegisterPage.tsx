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
  const { setUser } = useAuthStore();
  const [apiError, setApiError] = useState<string | null>(null);
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
