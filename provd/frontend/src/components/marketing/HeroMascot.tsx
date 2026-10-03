/**
 * Hero illustration: a scoresheet with legs, smiling, carrying a Tether coin. The sheet shows a passed
 * check (low score, release), i.e. money that was scored before it moved. Tether mark: cryptocurrency-icons (CC0).
 */
const TETHER_PATH =
  "M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117";

const INK = "#111111";
const MUTED = "#6B6B6B";
const LINE = "#E7E5E4";
const OK = "#16A34A";
const TETHER = "#26A17B";

function Tick({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="8" fill={OK} />
      <path d={`M${x - 3.6} ${y + 0.3} l2.6 2.6 l5 -5.4`} fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

export default function HeroMascot() {
  const coin = { cx: 338, cy: 268, r: 50 };
  const glyph = (coin.r * 2 * 0.82) / 32;
  return (
    <svg viewBox="0 0 420 480" role="img" aria-labelledby="mascot-title" className="block h-auto w-full font-sans">
      <title id="mascot-title">A smiling scoresheet walking with a Tether coin: the payment was scored and passed before release</title>

      {/* ground shadow */}
      <ellipse cx="205" cy="456" rx="132" ry="10" fill={INK} opacity="0.07" />

      {/* legs and shoes */}
      <path d="M172 338 L160 428" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M228 338 L250 426" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <rect x="130" y="424" width="44" height="17" rx="8.5" fill={INK} />
      <rect x="242" y="422" width="44" height="17" rx="8.5" fill={INK} />

      {/* waving arm (behind the sheet) */}
      <path d="M116 214 Q 74 196 70 148" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
      <circle cx="69" cy="140" r="11" fill="#FFFFFF" stroke={INK} strokeWidth="4" />

      <g transform="rotate(-3 200 200)">
        {/* the sheet */}
        <rect x="110" y="62" width="182" height="282" rx="14" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
        <rect x="166" y="46" width="70" height="30" rx="8" fill={INK} />
        <rect x="189" y="53" width="24" height="8" rx="4" fill="#FFFFFF" />

        {/* face */}
        <circle cx="173" cy="118" r="6" fill={INK} />
        <circle cx="229" cy="118" r="6" fill={INK} />
        <circle cx="157" cy="138" r="8" fill="#F5A3A3" opacity="0.55" />
        <circle cx="245" cy="138" r="8" fill="#F5A3A3" opacity="0.55" />
        <path d="M170 138 Q 201 166 232 138" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />

        <line x1="132" y1="180" x2="270" y2="180" stroke={LINE} strokeWidth="2" />

        {/* score */}
        <text x="132" y="204" fontSize="14" fill={MUTED}>
          Score
        </text>
        <text x="132" y="236" fontSize="32" fontWeight="700" fill={INK}>
          120
        </text>
        <rect x="196" y="212" width="76" height="28" rx="6" fill="#DCFCE7" stroke={OK} strokeWidth="1.5" />
        <text x="234" y="231" textAnchor="middle" fontSize="14" fontWeight="700" fill="#15803D">
          Release
        </text>

        {/* checks */}
        {[
          ["Wallet", 266],
          ["Amount", 292],
          ["History", 318],
        ].map(([label, y]) => (
          <g key={label as string}>
            <Tick x={142} y={y as number} />
            <text x="158" y={(y as number) + 5} fontSize="14" fill={INK}>
              {label}
            </text>
            <rect x="222" y={(y as number) - 3} width="46" height="6" rx="3" fill={LINE} />
          </g>
        ))}
      </g>

      {/* the coin, carried */}
      <circle cx={coin.cx} cy={coin.cy} r={coin.r} fill={TETHER} stroke="#1B7F61" strokeWidth="4" />
      <g transform={`translate(${coin.cx - 16 * glyph} ${coin.cy - 16 * glyph}) scale(${glyph})`}>
        <path fill="#FFFFFF" d={TETHER_PATH} />
      </g>
      <path d="M374 200 l8 -12 M390 220 l13 -6 M356 194 l1 -14" stroke={INK} strokeWidth="3" strokeLinecap="round" />

      {/* carrying arm (in front of the coin) */}
      <path d="M290 236 Q 312 270 300 300" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
      <circle cx="300" cy="306" r="11" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
    </svg>
  );
}
