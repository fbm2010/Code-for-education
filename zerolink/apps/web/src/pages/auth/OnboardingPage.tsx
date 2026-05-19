import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { usePrefsStore } from '../../stores/prefsStore';
import { api } from '../../lib/api';

const LANGS = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'sw', label: 'Kiswahili', flag: '🇹🇿' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ha', label: 'Hausa', flag: '🇳🇬' },
  { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
];

const GOALS = [15, 30, 45, 60, 90];

export function OnboardingPage() {
  const { user } = useAuthStore();
  const { prefs, updatePref, setPrefs } = usePrefsStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const steps = [
    {
      title: `Welcome, ${user?.displayName?.split(' ')[0] ?? 'Explorer'}! 🌅`,
      subtitle: "Let's set up your expedition preferences.",
      content: (
        <div>
          <p className="label mb-3">Choose your language</p>
          <div className="grid grid-cols-2 gap-3">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => updatePref('primaryLanguage', l.code)}
                className={`py-3 px-4 rounded-xl border-2 text-left font-semibold transition-colors ${
                  prefs.primaryLanguage === l.code
                    ? 'border-earth-400 bg-earth-50 text-earth-800'
                    : 'border-earth-200 text-earth-600 hover:border-earth-300'
                }`}
                aria-pressed={prefs.primaryLanguage === l.code}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'How will you be learning? 📡',
      subtitle: 'This helps us deliver lessons that fit your connection.',
      content: (
        <div className="space-y-6">
          <div>
            <p className="label mb-3">Reliable internet access?</p>
            <div className="flex gap-3">
              {[true, false].map(v => (
                <button
                  key={String(v)}
                  onClick={() => updatePref('hasReliableInternet', v)}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors ${
                    prefs.hasReliableInternet === v ? 'border-earth-400 bg-earth-50 text-earth-700' : 'border-earth-200 text-earth-500'
                  }`}
                  aria-pressed={prefs.hasReliableInternet === v}
                >
                  {v ? '✓ Yes, mostly' : '✗ Rarely / Never'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label mb-3">Your device</p>
            <div className="flex gap-2">
              {(['smartphone', 'tablet', 'laptop'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => updatePref('deviceType', d)}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    prefs.deviceType === d ? 'border-earth-400 bg-earth-50 text-earth-700' : 'border-earth-200 text-earth-500'
                  }`}
                  aria-pressed={prefs.deviceType === d}
                >
                  {d === 'smartphone' ? '📱' : d === 'tablet' ? '📟' : '💻'}
                  <br /><span className="capitalize">{d}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Set your daily trail goal 🎯',
      subtitle: 'How many minutes do you want to study each day?',
      content: (
        <div className="space-y-6">
          <div className="flex gap-3 flex-wrap">
            {GOALS.map(g => (
              <button
                key={g}
                onClick={() => updatePref('dailyStudyMinutes', g)}
                className={`flex-1 min-w-[70px] py-4 rounded-xl border-2 font-bold text-lg transition-colors ${
                  prefs.dailyStudyMinutes === g ? 'border-earth-400 bg-earth-400 text-white' : 'border-earth-200 text-earth-600 hover:border-earth-300'
                }`}
                aria-pressed={prefs.dailyStudyMinutes === g}
              >
                {g}<span className="text-xs font-normal block">min</span>
              </button>
            ))}
          </div>
          <p className="text-earth-500 text-sm text-center">
            {prefs.dailyStudyMinutes} minutes per day — that's{' '}
            {Math.round(prefs.dailyStudyMinutes * 365 / 60)} hours per year of learning!
          </p>
        </div>
      ),
    },
  ];

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      setSaving(true);
      try {
        await api.patch('/users/me/preferences', prefs);
      } catch { /* save locally anyway */ }
      setSaving(false);
      navigate('/dashboard');
    }
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="h-1.5 bg-earth-100 rounded-full mb-8 overflow-hidden" aria-hidden="true">
          <motion.div
            className="h-full bg-earth-400 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="card"
          >
            <h1 className="text-2xl font-black text-earth-800 mb-2">{steps[step].title}</h1>
            <p className="text-earth-500 mb-6">{steps[step].subtitle}</p>
            {steps[step].content}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-6">
          {step > 0 ? (
            <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>
          ) : <div />}
          <button className="btn-primary" onClick={handleNext} disabled={saving}>
            {step === steps.length - 1 ? (saving ? 'Saving…' : 'Start Exploring! 🌅') : 'Continue →'}
          </button>
        </div>

        <p className="text-center text-earth-400 text-sm mt-4">
          Step {step + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
}
