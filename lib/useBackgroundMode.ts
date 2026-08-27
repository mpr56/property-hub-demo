import { useCallback, useEffect, useState } from 'react';

export type BackgroundMode = 'static' | 'status';

const STORAGE_KEY = 'bg-mode';

/**
 * Background mode, shared across pages via localStorage: 'static' shows the
 * brand-blue silk, 'status' tints it by the worst alert level on screen.
 * Read after mount so SSR markup stays deterministic.
 */
export function useBackgroundMode(): [BackgroundMode, () => void] {
  const [mode, setMode] = useState<BackgroundMode>('static');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'static' || stored === 'status') setMode(stored);
    } catch {
      // storage unavailable (private mode) — keep the default
    }
  }, []);

  const toggle = useCallback(() => {
    setMode(m => {
      const next = m === 'static' ? 'status' : 'static';
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      return next;
    });
  }, []);

  return [mode, toggle];
}
