/**
 * The P2P loop: buyer pays KSh, seller releases USDT, and the KSh can be reversed after the USDT is gone.
 * Tether mark from cryptocurrency-icons (CC0).
 */
const TETHER_PATH =
  "M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117";

const INK = "#111111";
const MUTED = "#6B6B6B";
const LOSS = "#B42318";

export default function TransferLoop() {
  return (
    <figure className="w-full">
      <div className="rounded-md border border-bg-border bg-white px-3 py-5 sm:px-6">
        <svg
          viewBox="0 0 520 440"
          role="img"
          aria-labelledby="loop-title loop-desc"
          className="block h-auto w-full font-sans"
        >
          <title id="loop-title">The P2P trade loop</title>
          <desc id="loop-desc">
            The buyer pays Kenyan shillings, the seller releases USDT, and the shilling payment can be reversed after
            the USDT has gone. Provd checks the trade before the USDT is released.
          </desc>
          <defs>
            <marker id="loop-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill={INK} />
            </marker>
            <marker id="loop-arrow-loss" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill={LOSS} />
            </marker>
          </defs>

          {/* 1. KSh: buyer -> seller */}
          <path d="M145 172 C 215 66, 305 66, 375 172" fill="none" stroke={INK} strokeWidth="2" markerEnd="url(#loop-arrow)" />
          <text x="260" y="40" textAnchor="middle" fontSize="17" fontWeight="600" fill={INK}>
            1. Buyer pays KSh
          </text>
          <text x="260" y="62" textAnchor="middle" fontSize="15" fill={MUTED}>
            M-Pesa or bank transfer
          </text>

          {/* 2. USDT: seller -> buyer, with the check before release */}
          <path d="M375 268 C 305 374, 215 374, 145 268" fill="none" stroke={INK} strokeWidth="2" markerEnd="url(#loop-arrow)" />
          <rect x="196" y="328" width="128" height="32" rx="6" fill={INK} />
          <text x="260" y="349" textAnchor="middle" fontSize="15" fontWeight="600" fill="#FFFFFF">
            Provd check
          </text>
          <text x="260" y="400" textAnchor="middle" fontSize="17" fontWeight="600" fill={INK}>
            2. Seller releases USDT
          </text>
          <text x="260" y="422" textAnchor="middle" fontSize="15" fill={MUTED}>
            only after the check says release
          </text>

          {/* 3. Reversal: KSh pulled back after release */}
          <path d="M352 220 L 168 220" fill="none" stroke={LOSS} strokeWidth="2" strokeDasharray="7 6" markerEnd="url(#loop-arrow-loss)" />
          <text x="260" y="205" textAnchor="middle" fontSize="15" fontWeight="600" fill={LOSS}>
            3. KSh reversed
          </text>
          <text x="260" y="244" textAnchor="middle" fontSize="14" fill={LOSS}>
            after the USDT is gone
          </text>

          {/* Buyer: KSh */}
          <circle cx="105" cy="220" r="56" fill={INK} />
          <text x="105" y="231" textAnchor="middle" fontSize="30" fontWeight="700" fill="#FFFFFF">
            KSh
          </text>
          <text x="80" y="304" textAnchor="middle" fontSize="16" fill={MUTED}>
            Buyer
          </text>

          {/* Seller: USDT */}
          <g transform="translate(359 164) scale(3.5)">
            <circle cx="16" cy="16" r="16" fill="#26A17B" />
            <path fill="#FFFFFF" d={TETHER_PATH} />
          </g>
          <text x="442" y="304" textAnchor="middle" fontSize="16" fill={MUTED}>
            Seller (P2P desk)
          </text>
        </svg>
      </div>
      <figcaption className="mt-2 text-xs text-text-muted">
        A P2P trade in Kenya. Tether mark: cryptocurrency-icons (CC0).
      </figcaption>
    </figure>
  );
}
