import { Outlet, NavLink } from 'react-router-dom';
import { Compass, Map, BookOpen, Users, Settings, Sparkles, Globe } from 'lucide-react';
import { OfflineBanner } from '../ui/OfflineBanner';
import { OllamaStatus } from '../ui/OllamaStatus';
import { useAuthStore } from '../../stores/authStore';
import { useBandwidth } from '../../lib/connectivity';
import { useOfflineStore } from '../../stores/offlineStore';
import { useEffect } from 'react';

const NAV_ITEMS = [
  { to: '/dashboard',       icon: Compass,   label: 'Dashboard' },
  { to: '/map',             icon: Map,        label: 'Map' },
  { to: '/coach',           icon: BookOpen,   label: 'Coach' },
  { to: '/content-studio',  icon: Sparkles,   label: '✨ Studio' },
  { to: '/resources',       icon: Globe,      label: 'Resources' },
  { to: '/village',         icon: Users,      label: 'Village' },
  { to: '/profile/settings',icon: Settings,   label: 'Pack' },
];

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const bandwidth = useBandwidth();
  const { setOffline, setBandwidthMode } = useOfflineStore();

  useEffect(() => {
    setOffline(bandwidth === 'offline');
    setBandwidthMode(bandwidth);
  }, [bandwidth, setOffline, setBandwidthMode]);

  return (
    <div className="flex h-screen bg-earth-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <nav
        className="hidden lg:flex flex-col w-64 bg-parchment border-r border-earth-200 shrink-0"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-earth-200">
          <Compass className="w-8 h-8 text-earth-400" aria-hidden="true" />
          <span className="text-xl font-black">
            <span className="text-earth-400">Zero</span>
            <span className="text-earth-700">Link</span>
          </span>
        </div>
        <ul className="flex-1 py-4 px-3 space-y-1" role="list">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    isActive
                      ? 'bg-earth-400 text-white'
                      : 'text-earth-600 hover:bg-earth-100'
                  }`
                }
                aria-current={undefined}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="px-6 py-4 border-t border-earth-200 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${bandwidth === 'offline' ? 'bg-red-400' : bandwidth === 'low' ? 'bg-amber-400' : 'bg-olive-400'}`}
              aria-hidden="true"
            />
            <span className="text-xs text-earth-500 font-medium">
              {bandwidth === 'offline' ? 'Offline camp' : bandwidth === 'low' ? 'Low bandwidth' : 'Online'}
            </span>
          </div>
          <OllamaStatus />
          {user && (
            <button onClick={logout} className="text-xs text-earth-400 hover:text-earth-600">
              Sign out
            </button>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main
        className="flex-1 overflow-auto"
        id="main-content"
        tabIndex={-1}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 bg-parchment border-t border-earth-200 z-40"
        aria-label="Mobile navigation"
      >
        <ul className="flex" role="list">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-colors ${
                    isActive ? 'text-earth-400' : 'text-earth-500'
                  }`
                }
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <OfflineBanner />
    </div>
  );
}
