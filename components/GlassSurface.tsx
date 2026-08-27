import type React from 'react';

interface Props {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  backgroundOpacity?: number;
  blur?: number;
  borderColor?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onClick?: () => void;
}

export default function GlassSurface({
  width = 'auto',
  height = 'auto',
  borderRadius = 18,
  backgroundOpacity = 0.05,
  blur = 14,
  borderColor = 'rgba(255,255,255,0.09)',
  className = '',
  style = {},
  children,
  onClick,
}: Props) {
  const w = typeof width === 'number' ? `${width}px` : width;
  const h = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: w,
        height: h,
        borderRadius: `${borderRadius}px`,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        backgroundColor: `rgba(255,255,255,${backgroundOpacity})`,
        border: `1px solid ${borderColor}`,
        boxShadow: '0 12px 40px rgba(2,6,18,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {/* Top-edge sheen — reads as light hitting the surface */}
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.025) 22%, transparent 45%)',
          zIndex: -1,
          borderRadius: `${borderRadius}px`,
        }}
      />
      {children}
    </div>
  );
}
