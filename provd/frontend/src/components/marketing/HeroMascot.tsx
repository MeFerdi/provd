/**
 * Hero illustration: a clipboard scoresheet with a face, arms and legs, walking and waving while it carries
 * a 3D Tether coin. The sheet shows a passed check (low score, release): money scored before it moved.
 * Coin: cut out from a CC0 render ("Usdt" by mediaviet, Flickr) in /assets/home/usdt-coin-3d.webp.
 */
const INK = "#1A1A1A";
const MUTED = "#6B6B6B";
const LINE = "#E7E5E4";
const OK = "#16A34A";

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
    <svg viewBox="0 0 440 500" role="img" aria-labelledby="mascot-title" className="block h-auto w-full font-sans">
      <title id="mascot-title">A smiling scoresheet walking with a Tether coin: the payment was scored and passed before release</title>
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
        <rect x="206" y="214" width="78" height="29" rx="6" fill="#DCFCE7" stroke={OK} strokeWidth="1.5" />
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

      {/* carrying arm and hand behind the coin, then the coin, then the thumb gripping over its rim */}
      <path d="M306 232 Q 326 258 316 292" stroke="url(#skin)" strokeWidth="15" strokeLinecap="round" fill="none" />
      <g transform="rotate(-25 318 300)">
        <ellipse cx="318" cy="302" rx="15" ry="13" fill="url(#skin)" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={306 + i * 6.8} y={280} width="6.8" height="20" rx="3.4" fill="url(#skin)" />
        ))}
      </g>
      <image href="/assets/home/usdt-coin-3d.webp" x="292" y="200" width="150" height="126" />
      <rect x="303" y="276" width="8" height="24" rx="4" fill="url(#skin)" stroke="#7A4A2A" strokeOpacity="0.3" strokeWidth="0.8" transform="rotate(32 307 288)" />
    </svg>
  );
}
