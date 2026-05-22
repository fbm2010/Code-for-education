import { Outlet, NavLink } from 'react-router-dom';
import { Compass, Map, BookOpen, Settings, Sparkles, Globe, BookMarked, X } from 'lucide-react';
import { OfflineBanner } from '../ui/OfflineBanner';
import { AIStatus } from '../ui/AIStatus';
import { useAuthStore } from '../../stores/authStore';
import { useBandwidth } from '../../lib/connectivity';
import { useOfflineStore } from '../../stores/offlineStore';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

const NAV_ITEMS = [
  { to: '/dashboard',       icon: Compass,   label: 'Dashboard' },
  { to: '/map',             icon: Map,        label: 'Map' },
  { to: '/coach',           icon: BookOpen,   label: 'Coach' },
  { to: '/content-studio',  icon: Sparkles,   label: '✨ Studio' },
  { to: '/resources',       icon: Globe,      label: 'Resources' },
  { to: '/profile/settings',icon: Settings,   label: 'Pack' },
];

type CommunityNote = {
  id: string;
  title: string;
  body: string;
  subject: string;
  createdAt: string;
};

function CommunityPanel({ onClose }: { onClose: () => void }) {
  const { data: notes, isLoading } = useQuery<CommunityNote[]>({
    queryKey: ['communityPublished'],
    queryFn: async () => {
      const res = await api.get('/api/community/published');
      return res.data.data;
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Community Notes">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-parchment h-full flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-earth-200">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-earth-500" aria-hidden="true" />
            <h2 className="font-black text-earth-800">Community Notes</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-earth-100" aria-label="Close">
            <X className="w-5 h-5 text-earth-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-earth-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && (!notes || notes.length === 0) && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📚</div>
              <p className="font-semibold text-earth-600">No community notes yet</p>
              <p className="text-earth-400 text-sm mt-1">Publish from Content Studio to share here.</p>
            </div>
          )}
          {notes?.map(note => (
            <div key={note.id} className="card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-earth-800 leading-tight">{note.title}</h3>
                <span className="text-xs bg-olive-100 text-olive-700 px-2 py-0.5 rounded-full shrink-0 font-medium">
                  {note.subject}
                </span>
              </div>
              <p className="text-earth-600 text-sm line-clamp-4 whitespace-pre-line">{note.body}</p>
              <p className="text-earth-400 text-xs">{new Date(note.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const bandwidth = useBandwidth();
  const { setOffline, setBandwidthMode } = useOfflineStore();
  const [communityOpen, setCommunityOpen] = useState(false);

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
        <div className="px-3 py-2">
          <button
            onClick={() => setCommunityOpen(true)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl font-semibold text-sm text-earth-600 hover:bg-earth-100 transition-colors"
            aria-label="Browse community notes"
          >
            <BookMarked className="w-5 h-5 shrink-0" aria-hidden="true" />
            Community Notes
          </button>
        </div>
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
          <AIStatus />
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
      {communityOpen && <CommunityPanel onClose={() => setCommunityOpen(false)} />}
    </div>
  );
}
