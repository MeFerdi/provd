/**
 * Hero illustration: a clipboard scoresheet with a face, arms and legs, walking and waving while it carries
 * a 3D Tether coin. The sheet shows a passed check (low score, release): money scored before it moved.
 * Tether mark: cryptocurrency-icons (CC0), drawn as an exact circle coin.
 */
const TETHER_PATH =
  "M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117";
const INK = "#1A1A1A";
const MUTED = "#6B6B6B";
const LINE = "#E7E5E4";
const OK = "#16A34A";

/** Fine reeding lines across the rim, between radius r1 and r2. */
function reeding(cx: number, cy: number, r1: number, r2: number, count: number): string {
  let d = "";
  for (let i = 0; i < count; i++) {
    const a = (2 * Math.PI * i) / count;
    const c = Math.cos(a), sn = Math.sin(a);
    d += `M${(cx + r1 * c).toFixed(2)} ${(cy + r1 * sn).toFixed(2)} L${(cx + r2 * c).toFixed(2)} ${(cy + r2 * sn).toFixed(2)} `;
  }
  return d;
}

function Tick({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="8.5" fill={OK} />
      <path d={`M${x - 3.8} ${y + 0.3} l2.7 2.7 l5.2 -5.6`} fill="none" stroke="#FFFFFF" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** An open hand: palm, four fingers and a thumb, drawn around (0,0) pointing up. */
function OpenHand() {
  return (
    <g>
      {[-10.5, -3.5, 3.5, 10.5].map((x, i) => (
        <rect key={x} x={x - 3.6} y={-31 + (i === 0 || i === 3 ? 5 : 0)} width="7.2" height="22" rx="3.6" fill="url(#skin)" />
      ))}
      <ellipse cx="0" cy="-2" rx="15" ry="14" fill="url(#skin)" />
      <rect x="11" y="-12" width="7" height="18" rx="3.5" fill="url(#skin)" transform="rotate(38 14 -3)" />
      <path d="M-7 -6 q7 4 14 0" fill="none" stroke="#7A4A2A" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

export default function HeroMascot() {
  return (
    <svg viewBox="20 20 430 470" role="img" aria-label="A smiling scoresheet holding a Tether coin: the payment was scored and passed before release" className="block h-auto w-full font-sans">
      <defs>
        <linearGradient id="board" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C49563" />
          <stop offset="1" stopColor="#9A6B3E" />
        </linearGradient>
        <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F3F2EE" />
        </linearGradient>
        <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F1F3F5" />
          <stop offset="0.5" stopColor="#B9C0C7" />
          <stop offset="1" stopColor="#8A939C" />
        </linearGradient>
        <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C98E5F" />
          <stop offset="1" stopColor="#8F5B35" />
        </linearGradient>
        <linearGradient id="pants" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2B3A55" />
          <stop offset="1" stopColor="#1B2537" />
        </linearGradient>
        <linearGradient id="coinRim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4FD3A6" />
          <stop offset="1" stopColor="#1D8A68" />
        </linearGradient>
        <linearGradient id="coinBevel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B8F2DC" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#0B4D3A" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="coinMark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#DDF5EC" />
        </linearGradient>
        <radialGradient id="coinFace" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#4CC99B" />
          <stop offset="1" stopColor="#1F946F" />
        </radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#000000" floodOpacity="0.16" />
        </filter>
        <filter id="blur6">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="blur3">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* floor shadow */}
      <ellipse cx="215" cy="470" rx="150" ry="13" fill="#000000" opacity="0.12" filter="url(#blur6)" />

      {/* legs */}
      <path d="M176 352 Q 172 400 162 440" stroke="url(#pants)" strokeWidth="22" strokeLinecap="round" fill="none" />
      <path d="M236 352 Q 246 398 262 438" stroke="url(#pants)" strokeWidth="22" strokeLinecap="round" fill="none" />

      {/* sneakers */}
      {[
        { x: 160, y: 446, flip: -1 },
        { x: 264, y: 444, flip: 1 },
      ].map(({ x, y, flip }) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${flip} 1)`}>
          <path d="M-18 6 Q -20 -12 -4 -13 Q 10 -13 22 -3 Q 34 4 32 9 L -18 9 Z" fill="#FFFFFF" stroke="#2A2A2A" strokeWidth="2.2" strokeLinejoin="round" />
          <rect x="-19" y="8" width="52" height="7" rx="3.5" fill="#2A2A2A" />
          <path d="M-2 -9 l10 6 M3 -11 l9 6" stroke="#2A2A2A" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M-14 1 Q 6 -2 26 4" stroke="#26A17B" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>
      ))}

      {/* waving arm, behind the board */}
      <path d="M124 222 Q 84 210 72 160" stroke="url(#skin)" strokeWidth="15" strokeLinecap="round" fill="none" />
      <g transform="translate(70 150) rotate(-14)">
        <OpenHand />
      </g>

      {/* coin arm: mirrors the waving arm (starts behind the board, rises to the same height); the hand sits behind the coin */}
      <path d="M298 214 Q 338 202 350 152" stroke="url(#skin)" strokeWidth="15" strokeLinecap="round" fill="none" />
      <ellipse cx="351" cy="144" rx="15" ry="14" fill="url(#skin)" />

      {/* clipboard */}
      <g transform="rotate(-3 210 210)" filter="url(#soft)">
        <rect x="108" y="56" width="204" height="306" rx="16" fill="url(#board)" />
        <rect x="120" y="76" width="180" height="272" rx="5" fill="url(#paper)" />
        <rect x="120" y="76" width="180" height="272" rx="5" fill="none" stroke="#000000" strokeOpacity="0.06" />
        {/* metal clip */}
        <rect x="166" y="40" width="88" height="42" rx="11" fill="url(#metal)" stroke="#7D868F" strokeWidth="1.2" />
        <rect x="192" y="48" width="36" height="11" rx="5.5" fill="#6E7780" />
        <rect x="172" y="70" width="76" height="4" rx="2" fill="#FFFFFF" opacity="0.6" />

        {/* face */}
        <g>
          <ellipse cx="181" cy="122" rx="7.5" ry="9" fill={INK} />
          <ellipse cx="239" cy="122" rx="7.5" ry="9" fill={INK} />
          <circle cx="183.5" cy="118.5" r="2.6" fill="#FFFFFF" />
          <circle cx="241.5" cy="118.5" r="2.6" fill="#FFFFFF" />
          <ellipse cx="164" cy="143" rx="10" ry="6.5" fill="#F29C9C" opacity="0.5" filter="url(#blur3)" />
          <ellipse cx="256" cy="143" rx="10" ry="6.5" fill="#F29C9C" opacity="0.5" filter="url(#blur3)" />
          <path d="M184 140 Q 210 168 236 140 Q 210 152 184 140 Z" fill="#3A1F1F" />
          <path d="M199 151 Q 210 158 221 151 Q 210 147 199 151 Z" fill="#E37C7C" />
          <path d="M184 140 Q 210 168 236 140" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </g>

        <line x1="138" y1="182" x2="282" y2="182" stroke={LINE} strokeWidth="2" />

        {/* score */}
        <text x="138" y="206" fontSize="14" fill={MUTED}>
          Score
        </text>
        <text x="138" y="239" fontSize="33" fontWeight="700" fill={INK}>
          120
        </text>
        <rect x="206" y="214" width="78" height="29" rx="6" fill="#FFFFFF" stroke={OK} strokeWidth="1.5" />
        <text x="245" y="233.5" textAnchor="middle" fontSize="14" fontWeight="700" fill="#15803D">
          Release
        </text>

        {/* checks */}
        {(
          [
            ["Wallet", 270],
            ["Amount", 297],
            ["History", 324],
          ] as const
        ).map(([label, y]) => (
          <g key={label}>
            <Tick x={148} y={y} />
            <text x="164" y={y + 5} fontSize="14" fill={INK}>
              {label}
            </text>
            <rect x="232" y={y - 3} width="50" height="6" rx="3" fill={LINE} />
          </g>
        ))}
      </g>

      {/* the coin, held up at the waving hand's height; drawn last so the hand is fully hidden behind it.
          Coin geometry is authored around (380, 292) and moved into place. */}
      <g transform="translate(-28 -154)">
        {/* thickness: the coin's side, with reeding visible only where it shows below/right of the face */}
        <circle cx="384.5" cy="297.5" r="44" fill="#145F49" />
        <path d={reeding(384.5, 297.5, 40, 44, 120)} stroke="#0B3F30" strokeOpacity="0.55" strokeWidth="0.9" />
        {/* face: raised bevelled rim, lettering, beaded ring, embossed mark */}
        <circle cx="380" cy="292" r="44" fill="url(#coinRim)" />
        <circle cx="380" cy="292" r="43" fill="none" stroke="url(#coinBevel)" strokeWidth="2" />
        <circle cx="380" cy="292" r="34.5" fill="url(#coinFace)" />
        <circle cx="380" cy="292" r="34.5" fill="none" stroke="#0E5A43" strokeOpacity="0.55" strokeWidth="1.4" />
        <circle cx="380" cy="292" r="35.6" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="0.8" />
        <path id="coin-text-path" d="M 380 292 m -39 0 a 39 39 0 1 1 78 0 a 39 39 0 1 1 -78 0" fill="none" />
        <text fontSize="6.4" fontWeight="700" letterSpacing="1.2" fill="#FFFFFF" fillOpacity="0.9">
          <textPath href="#coin-text-path" startOffset="0">
            TETHER • USDT • TETHER • USDT • TETHER • USDT •
          </textPath>
        </text>
        <circle cx="380" cy="292" r="31.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="1.3" strokeDasharray="0.01 3.1" strokeLinecap="round" />
        <g transform="translate(347.6 259.6) scale(2.025)">
          <path fill="#0B4D3A" fillOpacity="0.45" d={TETHER_PATH} transform="translate(0.45 0.5)" />
          <path fill="#FFFFFF" fillOpacity="0.55" d={TETHER_PATH} transform="translate(-0.3 -0.3)" />
          <path fill="url(#coinMark)" d={TETHER_PATH} />
        </g>
        <path d="M349 270 A 38 38 0 0 1 384 254" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
