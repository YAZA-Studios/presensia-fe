import type { CSSProperties } from 'react';

/** Logo check-P Presensia — inline SVG agar tajam di semua ukuran. */
export function LogoMark({ size = 28, mono = false, style }: { size?: number; mono?: boolean; style?: CSSProperties }) {
  const c1 = mono ? '#111827' : '#1BA895'; // teal muda
  const c2 = mono ? '#111827' : '#12816F'; // teal tua (check)
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={style} aria-hidden>
      <rect x="2" y="2" width="60" height="60" rx="16" fill={c1} />
      <path d="M22 51V21a7 7 0 0 1 7-7h8.5C46.6 14 53 19.6 53 27.4c0 7.9-6.4 13.6-15.5 13.6H31v10h-9Zm9-17h5.6c4.2 0 6.9-2.4 6.9-6s-2.7-6-6.9-6H31v12Z" fill="#fff" />
      <path d="m22.5 33.5 7 7L46 24" stroke={c2} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Lockup lengkap: mark + wordmark "presensia". */
export function Logo({ size = 28, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span className="logo-lockup" style={{ gap: size * 0.36 }}>
      <LogoMark size={size} />
      <span className={`logo-word ${dark ? 'logo-word-dark' : ''}`} style={{ fontSize: size * 0.86 }}>
        presensia
      </span>
    </span>
  );
}
