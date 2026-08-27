import type React from 'react';

// ─── Palette (Blue Hill brand) ──────────────────────────────────────────
// bg        #05070F   deep navy-black base
// surface   rgba(255,255,255,0.05)  glass card fill
// sky       #3EB6F0 / #7CCDF6   primary accent (actions, links, active states)
// skyDeep   #2563EB   gradient partner for primary actions
// navy      #0F1E5C   large filled surfaces, headers, chart fills only
// Status colors are semantic, not brand — keep as-is:
// green     #4ade80   self-handled / paid / good
// orange    #fb923c   owner-handled / attention
// purple    #c084fc   no-tracking-needed
// red       #f87171   overdue / unpaid

export const color = {
  bg: '#05070F',
  text: 'rgba(255,255,255,0.95)',
  textDim: 'rgba(255,255,255,0.6)',
  textFaint: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.09)',
  sky: '#3EB6F0',
  skyLight: '#7CCDF6',
  skyDeep: '#2563EB',
  navy: '#0F1E5C',
  green: '#4ade80',
  orange: '#fb923c',
  purple: '#c084fc',
  red: '#f87171',
};

export const font = {
  body: 'var(--font-body), sans-serif',
  display: 'var(--font-display), var(--font-body), sans-serif',
};

export const shared = {
  page: {
    position: 'relative' as const,
    zIndex: 1,
    minHeight: '100vh',
    color: color.text,
  } satisfies React.CSSProperties,

  // Horizontal padding comes from the `.page-inner` class (globals.css) so it
  // can shrink on mobile and honour safe-area insets — pair this style with
  // className="page-inner".
  inner: {
    position: 'relative' as const,
    zIndex: 1,
    maxWidth: 1020,
    margin: '0 auto',
  } satisfies React.CSSProperties,

  bgLayer: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 0,
  } satisfies React.CSSProperties,

  eyebrow: {
    fontSize: 11,
    fontWeight: 700,
    color: color.skyLight,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.2em',
    fontFamily: font.display,
  } satisfies React.CSSProperties,

  cardLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: 6,
  } satisfies React.CSSProperties,

  statValue: {
    fontSize: 32,
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1,
    letterSpacing: '-0.02em',
    fontFamily: font.display,
    fontVariantNumeric: 'tabular-nums' as const,
  } satisfies React.CSSProperties,

  statSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
  } satisfies React.CSSProperties,

  spinner: {
    width: 32, height: 32,
    border: '2px solid rgba(62,182,240,0.2)',
    borderTopColor: '#3EB6F0',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  } satisfies React.CSSProperties,

  button: {
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.01em',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    padding: '10px 18px',
    background: `linear-gradient(135deg, ${color.sky} 0%, ${color.skyDeep} 100%)`,
    color: '#fff',
    boxShadow: '0 4px 16px rgba(62,182,240,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  } satisfies React.CSSProperties,

  buttonGhost: {
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.13)',
    cursor: 'pointer',
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.82)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  } satisfies React.CSSProperties,

  input: {
    fontFamily: 'inherit',
    fontSize: 13.5,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    padding: '10px 12px',
    width: '100%',
    transition: 'border-color 0.2s ease, background-color 0.2s ease',
  } satisfies React.CSSProperties,

  select: {
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    padding: '10px 32px 10px 12px',
    cursor: 'pointer',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    colorScheme: 'dark' as const,
    transition: 'border-color 0.2s ease, background-color 0.2s ease',
    backgroundImage:
      'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%276%27 viewBox=%270 0 10 6%27%3E%3Cpath d=%27M1 1l4 4 4-4%27 stroke=%27%23ffffff88%27 stroke-width=%271.5%27 fill=%27none%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 11px center',
  } satisfies React.CSSProperties,

  label: {
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    marginBottom: 6,
    display: 'block',
  } satisfies React.CSSProperties,
};
