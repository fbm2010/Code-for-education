import { useNavigate } from 'react-router-dom';
import { Compass, Backpack, Globe, BookOpen } from 'lucide-react';
import { usePrefsStore } from '../stores/prefsStore';
import { useAuthStore } from '../stores/authStore';

const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'sw', label: 'Kiswahili' },
  { code: 'fr', label: 'Français' }, { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' }, { code: 'pt', label: 'Português' },
  { code: 'ha', label: 'Hausa' }, { code: 'am', label: 'አማርኛ' },
];

const FEATURES = [
  { icon: Backpack, title: 'Offline Camp', desc: 'Download lessons and study anywhere — no signal needed.', color: 'text-earth-400' },
  { icon: Compass, title: 'Low-Bandwidth Trail', desc: 'Compressed text, audio & slides for slow connections.', color: 'text-olive-500' },
  { icon: Globe, title: 'Multilingual Compass', desc: 'Lessons in 8 languages including Swahili, Hausa & Hindi.', color: 'text-sky-500' },
  { icon: BookOpen, title: 'Study Guidebook', desc: 'Science-backed spaced repetition and retrieval practice.', color: 'text-forest-500' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { prefs, updatePref } = usePrefsStore();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center bg-sunrise-gradient px-4 overflow-hidden"
        aria-label="Hero"
      >
        {/* Savanna SVG background */}
        <div className="absolute bottom-0 inset-x-0 pointer-events-none" aria-hidden="true">
          <svg viewBox="0 0 1440 200" className="w-full" preserveAspectRatio="none">
            <path d="M0,200 L0,150 Q100,120 200,140 Q350,160 500,130 Q650,100 800,130 Q950,160 1100,140 Q1280,120 1440,150 L1440,200Z" fill="#d4a96a" opacity="0.3" />
            <path d="M0,200 L0,170 Q200,150 400,165 Q600,180 800,160 Q1000,140 1200,165 Q1350,175 1440,170 L1440,200Z" fill="#c08040" opacity="0.2" />
            {/* Acacia silhouettes */}
            <g fill="#6b3a14" opacity="0.25">
              <rect x="120" y="120" width="4" height="50" />
              <ellipse cx="122" cy="118" rx="22" ry="10" />
              <rect x="380" y="100" width="4" height="70" />
              <ellipse cx="382" cy="98" rx="28" ry="12" />
              <rect x="900" y="110" width="4" height="60" />
              <ellipse cx="902" cy="108" rx="24" ry="11" />
            </g>
          </svg>
        </div>

        <div className="relative z-10 text-center max-w-2xl">
          <div className="inline-flex items-center gap-3 mb-6">
            <Compass className="w-12 h-12 text-earth-400" aria-hidden="true" />
            <h1 className="text-5xl md:text-6xl font-black text-earth-800">
              <span className="text-earth-400">Zero</span>Link
            </h1>
          </div>

          <p className="text-earth-600 text-xl md:text-2xl mb-3 font-semibold">
            Your learning expedition — no internet required.
          </p>

          <span className="inline-flex items-center gap-1.5 bg-olive-100 text-olive-700 text-sm font-bold px-4 py-1.5 rounded-full mb-8">
            ✓ Works offline
          </span>

          {user && (
            <p className="text-earth-600 font-semibold mb-4">
              Welcome back, {user.displayName || 'Explorer'}! 🌅
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="btn-primary text-lg px-8 py-4"
            >
              🌅 Start Your Journey
            </button>
            <button
              onClick={() => navigate('/map')}
              className="btn-secondary text-lg px-8 py-4"
            >
              🗺️ Explore the Map
            </button>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-parchment py-20 px-4" aria-labelledby="mission-title">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-earth-400 font-bold text-sm uppercase tracking-wider">Our Mission</span>
          <h2 className="text-4xl font-black text-earth-800 mt-2 mb-6" id="mission-title">
            Learning Without Limits
          </h2>
          <p className="text-earth-600 text-lg max-w-2xl mx-auto mb-12">
            ZeroLink brings quality lessons, multilingual support, and smart study techniques to every corner
            of the world — even where the internet doesn't reach.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[['8', 'Languages'], ['48+', 'Lessons'], ['100%', 'Offline Ready'], ['4', 'Study Methods']].map(([n, l]) => (
              <div key={l} className="card text-center card-hover">
                <div className="text-3xl font-black text-earth-400">{n}</div>
                <div className="text-earth-600 text-sm font-semibold mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-earth-gradient" aria-labelledby="features-title">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-earth-400 font-bold text-sm uppercase tracking-wider">Your Expedition Kit</span>
            <h2 className="text-4xl font-black text-earth-800 mt-2" id="features-title">
              Four Ways We Reach You
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <article key={title} className="card card-hover">
                <Icon className={`w-10 h-10 ${color} mb-4`} aria-hidden="true" />
                <h3 className="text-earth-800 font-bold text-lg mb-2">{title}</h3>
                <p className="text-earth-600 text-sm">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Setup */}
      <section className="py-20 px-4 bg-earth-700" aria-labelledby="setup-title">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <span className="text-sand-400 font-bold text-sm uppercase tracking-wider">🎒 Pack Your Bag</span>
            <h2 className="text-3xl font-black text-white mt-2" id="setup-title">
              Tell Us About Your Trail
            </h2>
            <p className="text-earth-200 mt-2 text-sm">Set your preferences to personalize every step.</p>
          </div>
          <div className="card">
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="qs-lang">Preferred language</label>
                <select
                  id="qs-lang"
                  className="input"
                  value={prefs.primaryLanguage}
                  onChange={e => updatePref('primaryLanguage', e.target.value)}
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="label">Reliable internet?</span>
                <div className="flex gap-3">
                  {[true, false].map(v => (
                    <button
                      key={String(v)}
                      onClick={() => updatePref('hasReliableInternet', v)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                        prefs.hasReliableInternet === v
                          ? 'border-earth-400 bg-earth-50 text-earth-700'
                          : 'border-earth-200 text-earth-400 hover:border-earth-300'
                      }`}
                    >
                      {v ? 'Yes, mostly' : 'Rarely / Never'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="label">Device type</span>
                <div className="flex gap-2">
                  {(['smartphone', 'tablet', 'laptop'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => updatePref('deviceType', d)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                        prefs.deviceType === d
                          ? 'border-earth-400 bg-earth-50 text-earth-700'
                          : 'border-earth-200 text-earth-400 hover:border-earth-300'
                      }`}
                    >
                      {d === 'smartphone' ? '📱' : d === 'tablet' ? '📟' : '💻'} {d}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="btn-primary w-full mt-2"
                onClick={() => navigate(user ? '/dashboard' : '/register')}
              >
                Begin the Journey 🌅
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-earth-800 text-earth-300 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xl font-black mb-2">
            <span className="text-earth-400">Zero</span><span className="text-white">Link</span>
          </div>
          <p className="text-sm mb-6">Learning for every corner of the world.</p>
          <div className="flex gap-6 justify-center text-sm">
            {['About', 'Privacy Policy', 'Terms', 'Contact'].map(l => (
              <button key={l} className="hover:text-white transition-colors">{l}</button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
