import { useState, useEffect } from 'react';

export type BandwidthMode = 'offline' | 'low' | 'normal';

export function detectBandwidth(): BandwidthMode {
  if (!navigator.onLine) return 'offline';
  const nav = navigator as Navigator & {
    connection?: { effectiveType: string; downlink: number };
  };
  if (nav.connection) {
    const { effectiveType, downlink } = nav.connection;
    if (effectiveType === '2g' || effectiveType === 'slow-2g' || downlink < 0.5) {
      return 'low';
    }
  }
  return 'normal';
}

export function useBandwidth(): BandwidthMode {
  const [mode, setMode] = useState<BandwidthMode>(detectBandwidth());
  useEffect(() => {
    const update = () => setMode(detectBandwidth());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    const conn = (navigator as Navigator & { connection?: EventTarget }).connection;
    conn?.addEventListener('change', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      conn?.removeEventListener('change', update);
    };
  }, []);
  return mode;
}
