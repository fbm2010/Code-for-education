import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await api.post('/auth/forgot-password', { email }); } catch { /* always show success */ }
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-6">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🧭</div>
          <h1 className="text-2xl font-black text-earth-800">Forgot Password</h1>
          <p className="text-earth-500 mt-1">We'll send a reset link to your email.</p>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📬</div>
            <p className="font-semibold text-earth-700">
              If that email exists, a reset link has been sent.
            </p>
            <Link to="/login" className="btn-primary mt-6 inline-block">Back to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="forgot-email">Email address</label>
              <input
                id="forgot-email"
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" disabled={loading || !email} className="btn-primary w-full">
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <p className="text-center text-earth-500 text-sm">
              <Link to="/login" className="text-earth-600 hover:underline font-semibold">← Back to Sign In</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
