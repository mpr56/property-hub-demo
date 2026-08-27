import type React from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Sheet({ open, onClose, title, children }: Props) {
  // Rendered via a portal into document.body so it never ends up nested inside
  // an ancestor with backdrop-filter/overflow (e.g. AttributeHistory's GlassSurface),
  // which would otherwise clip and trap this fixed-position overlay.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Lock the page behind the sheet. `overflow: hidden` alone isn't enough on
  // iOS Safari — touch drags still rubber-band the page underneath — so pin
  // the body with position:fixed at the current scroll offset and restore it
  // (offset included) on close.
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      overflow: body.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overflow = 'hidden';
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open || !mounted) return null;

  // Layout lives in .sheet-* classes (globals.css): centered dialog on desktop,
  // full-width bottom sheet on phones.
  return createPortal(
    <div onClick={onClose} className="sheet-overlay">
      <div onClick={e => e.stopPropagation()} className="sheet-panel">
        <div className="sheet-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="icon-btn"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 9,
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                width: 34, height: 34,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="x" size={15} />
            </button>
          </div>
          <div className="sheet-body">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
