import { useEffect, useState } from 'react';
import Icon from './Icon';
import { color } from '@/lib/tokens';
import { resetDemo } from '@/lib/demo/api';

const DISMISS_KEY = 'bluehill-demo-banner-dismissed';

/**
 * Explains the one thing a visitor can't infer from the UI: every edit here is
 * real but lives in memory only, so a reload puts the portfolio back exactly as
 * it started. Without this, changes vanishing on refresh reads as a bug rather
 * than the point.
 *
 * Dismissal is remembered for the tab (sessionStorage), not forever — a fresh
 * visitor always gets the explanation.
 */
export default function DemoBanner() {
  // Render nothing on the first client paint so the server and client agree;
  // sessionStorage isn't readable during SSR.
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      // Private mode / blocked storage — just show the banner.
    }
    setReady(true);
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch { /* non-critical */ }
  }

  function reset() {
    setResetting(true);
    resetDemo();
    // A reload re-runs the seed anyway; doing both keeps the button honest
    // whichever way the app is navigated to.
    window.location.reload();
  }

  if (!ready || hidden) return null;

  return (
    <div
      role="status"
      style={{
        position: 'relative',
        zIndex: 25,
        background: 'linear-gradient(180deg, rgba(62,182,240,0.14) 0%, rgba(62,182,240,0.06) 100%)',
        borderBottom: '1px solid rgba(62,182,240,0.22)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="page-inner demo-banner-inner"
        style={{
          maxWidth: 1020,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '9px 0',
        }}
      >
        <span
          style={{
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.14em',
            color: color.skyLight,
            border: `1px solid ${color.sky}55`,
            background: 'rgba(62,182,240,0.12)',
            borderRadius: 999,
            padding: '3px 9px',
          }}
        >
          DEMO
        </span>

        <p style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.45, color: 'rgba(255,255,255,0.72)' }}>
          This is a demo with sample data as the real version has sensitive data. All features works, yet it all resets when you reload.
        </p>

        <button
          className="btn-ghost"
          onClick={reset}
          disabled={resetting}
          title="Restore the sample portfolio"
          style={{
            flexShrink: 0,
            fontFamily: 'inherit',
            fontSize: 11.5,
            fontWeight: 700,
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.85)',
            padding: '5px 12px',
            cursor: resetting ? 'default' : 'pointer',
            opacity: resetting ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="refresh" size={12} />
          {resetting ? 'Resetting…' : 'Reset data'}
        </button>

        <button
          onClick={dismiss}
          aria-label="Dismiss demo notice"
          title="Dismiss"
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)',
            display: 'inline-flex',
          }}
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}
