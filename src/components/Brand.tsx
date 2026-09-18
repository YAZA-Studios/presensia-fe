/** Logo check-P Presensia — memakai aset PNG resmi dari brand. */
const BASE = import.meta.env.BASE_URL || '/';

export function LogoMark({ size = 28, white = false, style }: {
  size?: number; white?: boolean; style?: React.CSSProperties;
}) {
  return (
    <img
      src={`${BASE}brand/${white ? 'logo-mark-white.png' : 'logo-mark.png'}`}
      alt="Presensia"
      width={size}
      height={size * (264 / 263)}
      style={{ display: 'block', ...style }}
      draggable={false}
    />
  );
}

/** Lockup lengkap: mark + wordmark "presensia". */
export function Logo({ size = 28, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span className="logo-lockup" style={{ gap: size * 0.32 }}>
      <LogoMark size={size} white={dark} />
      <span className={`logo-word ${dark ? 'logo-word-dark' : ''}`} style={{ fontSize: size * 0.92 }}>
        presensia
      </span>
    </span>
  );
}
