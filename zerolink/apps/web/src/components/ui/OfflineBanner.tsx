import { useOfflineStore } from '../../stores/offlineStore';

export function OfflineBanner() {
  const { isOffline, pendingSyncCount } = useOfflineStore();
  if (!isOffline) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 inset-x-0 z-50 bg-earth-700 text-white text-sm font-semibold
                 flex items-center justify-between px-4 py-2 shadow-lg"
    >
      <span>🏕️ Offline campfire — learning without a link</span>
      {pendingSyncCount > 0 && (
        <span className="bg-earth-500 rounded-full px-2 py-0.5 text-xs">
          {pendingSyncCount} pending sync
        </span>
      )}
    </div>
  );
}
