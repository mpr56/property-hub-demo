import dynamic from 'next/dynamic';
import { Component, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// three.js can't render on the server — load the canvas client-side only.
const Silk = dynamic(() => import('./Silk'), { ssr: false });

/** Worst alert level on screen, used to tint the background in status mode. */
export type BackgroundStatus = 'missing' | 'due-soon' | 'ok' | 'neutral';

// Deliberately darker than the status pill hues: the silk fills the whole
// viewport, so full-brightness red/orange would drown the content.
export const SILK_BRAND_COLOR = '#31518F';
export const SILK_STATUS_COLOR: Record<BackgroundStatus, string> = {
  missing: '#7A2626',
  'due-soon': '#7A4A1D',
  ok: '#1F5C3D',
  neutral: SILK_BRAND_COLOR,
};

interface Props {
  color: string;
}

/** WebGL isn't guaranteed (old devices, software rendering disabled) — swap
 *  in a plain tinted gradient instead of letting the render crash the page. */
class SilkErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Full-viewport silk shader with a dark overlay that keeps content readable. */
export default function SilkBackground({ color }: Props) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', background: '#05070F' }}>
      <div style={{ position: 'absolute', inset: 0, transition: 'opacity 0.6s ease' }}>
        <SilkErrorBoundary
          fallback={
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${color} 0%, #05070F 78%)`, opacity: 0.55 }} />
          }
        >
          {/* scale is applied twice in the shader (uv * uScale * uScale), so
              values above ~2 alias into flat noise — keep it near 1. */}
          <Silk color={color} speed={reducedMotion ? 0 : 4} scale={1} noiseIntensity={1.2} rotation={0} />
        </SilkErrorBoundary>
      </div>
      {/* Dark wash + vignette so cards and text keep their contrast */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 25%, rgba(5,7,15,0.3) 0%, rgba(5,7,15,0.55) 60%, rgba(2,4,10,0.75) 100%)',
        }}
      />
    </div>
  );
}
