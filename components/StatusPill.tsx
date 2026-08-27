interface Props {
  label: string;
  hex: string;
  filled?: boolean;
}

export default function StatusPill({ label, hex, filled = false }: Props) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 650,
        letterSpacing: '0.01em',
        padding: '3px 9px',
        borderRadius: 999,
        color: filled ? '#05070F' : hex,
        background: filled ? hex : `${hex}16`,
        border: filled ? '1px solid transparent' : `1px solid ${hex}38`,
        whiteSpace: 'nowrap',
        boxShadow: filled ? `0 2px 10px ${hex}40` : 'none',
      }}
    >
      {!filled && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: hex, boxShadow: `0 0 6px ${hex}90`, flexShrink: 0 }} />
      )}
      {label}
    </span>
  );
}
