import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usePrefsStore } from '../stores/prefsStore';
import { api } from '../lib/api';

const LANGS = [
  { code: 'en', label: 'English' }, { code: 'sw', label: 'Kiswahili' },
  { code: 'fr', label: 'Français' }, { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' }, { code: 'pt', label: 'Português' },
  { code: 'ha', label: 'Hausa' }, { code: 'am', label: 'አማርኛ' },
];

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label htmlFor={id} className="relative inline-flex cursor-pointer">
      <input
        id={id}
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <div className="w-11 h-6 bg-earth-200 rounded-full peer peer-checked:bg-earth-400 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
    </label>
  );
}

export function ProfileSettingsPage() {
  const { user, logout } = useAuthStore();
  const { prefs, updatePref } = usePrefsStore();
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const savePrefs = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me/preferences', prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* saved locally */ }
    setSaving(false);
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE MY ACCOUNT') return;
    try {
      await api.delete('/auth/account', { data: { confirmText: 'DELETE MY ACCOUNT' } });
      logout();
    } catch { /* handle */ }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-black text-earth-800">🎒 Pack & Gear</h1>

      {/* Account */}
      <section className="card space-y-4" aria-labelledby="account-heading">
        <h2 className="font-black text-earth-800 text-lg" id="account-heading">🧭 Account</h2>
        <div>
          <p className="label">Email</p>
          <div className="flex items-center gap-2">
            <span className="text-earth-700 font-semibold">{user?.email ?? '—'}</span>
            {user?.emailVerified
              ? <span className="text-xs bg-olive-100 text-olive-700 font-bold px-2 py-0.5 rounded-full">✓ Verified</span>
              : <button className="text-xs text-amber-600 font-semibold hover:underline" onClick={() => api.post('/auth/resend-verification')}>
                  Unverified — Resend
                </button>
            }
          </div>
        </div>
        <div>
          <p className="label">Display name</p>
          <p className="text-earth-700 font-semibold">{user?.displayName ?? '—'}</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary text-sm" onClick={() => { /* open change-password modal */ }}>
            Change Password
          </button>
        </div>
      </section>

      {/* Language */}
      <section className="card" aria-labelledby="lang-heading">
        <h2 className="font-black text-earth-800 text-lg mb-4" id="lang-heading">🗣️ Language</h2>
        <div>
          <label className="label" htmlFor="primary-lang">Primary language</label>
          <select
            id="primary-lang"
            className="input"
            value={prefs.primaryLanguage}
            onChange={e => updatePref('primaryLanguage', e.target.value)}
          >
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
      </section>

      {/* Connectivity */}
      <section className="card space-y-4" aria-labelledby="conn-heading">
        <h2 className="font-black text-earth-800 text-lg" id="conn-heading">📡 Connectivity</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-earth-700">Low-bandwidth mode</p>
            <p className="text-earth-400 text-sm">Text, audio & compressed images only</p>
          </div>
          <Toggle
            id="low-bw"
            checked={prefs.lowBandwidthDefault}
            onChange={v => updatePref('lowBandwidthDefault', v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-earth-700">Auto-download on Wi-Fi</p>
            <p className="text-earth-400 text-sm">Save recommended lessons when connected</p>
          </div>
          <Toggle
            id="auto-wifi"
            checked={prefs.autoDownloadWifi}
            onChange={v => updatePref('autoDownloadWifi', v)}
          />
        </div>
      </section>

      {/* Study */}
      <section className="card space-y-4" aria-labelledby="study-heading">
        <h2 className="font-black text-earth-800 text-lg" id="study-heading">📖 Study Preferences</h2>
        <div>
          <label className="label" htmlFor="daily-goal">
            Daily goal: {prefs.dailyStudyMinutes} minutes
          </label>
          <input
            id="daily-goal"
            type="range"
            min={10} max={120} step={5}
            value={prefs.dailyStudyMinutes}
            onChange={e => updatePref('dailyStudyMinutes', Number(e.target.value))}
            className="w-full accent-earth-400 mt-2"
          />
          <div className="flex justify-between text-xs text-earth-400 mt-1">
            <span>10 min</span><span>120 min</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-earth-700">Notifications</p>
            <p className="text-earth-400 text-sm">Daily trail reminders</p>
          </div>
          <Toggle
            id="notif"
            checked={prefs.notificationsEnabled}
            onChange={v => updatePref('notificationsEnabled', v)}
          />
        </div>
      </section>

      <button onClick={savePrefs} disabled={saving} className="btn-primary w-full">
        {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Preferences'}
      </button>

      {/* Danger zone */}
      <section className="card border-2 border-red-200" aria-labelledby="danger-heading">
        <h2 className="font-black text-red-700 mb-3" id="danger-heading">⚠️ Danger Zone</h2>
        <p className="text-earth-500 text-sm mb-3">
          Type <strong>DELETE MY ACCOUNT</strong> to permanently delete your account.
        </p>
        <input
          type="text"
          className="input border-red-200 mb-3"
          placeholder="DELETE MY ACCOUNT"
          value={deleteConfirm}
          onChange={e => setDeleteConfirm(e.target.value)}
          aria-label="Type DELETE MY ACCOUNT to confirm"
        />
        <button
          onClick={deleteAccount}
          disabled={deleteConfirm !== 'DELETE MY ACCOUNT'}
          className="bg-red-500 text-white font-semibold px-4 py-2 rounded-xl hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Delete Account
        </button>
      </section>
    </div>
  );
}
