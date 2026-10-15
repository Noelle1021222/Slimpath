/** Small illustrative pieces shared by the landing sections. */

const ROUTE = 'M26 156 C 70 156, 84 120, 120 112 S 176 108, 196 80 S 250 44, 292 40'

export function MiniMap({ animate, className }: { animate: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 320 180" className={className ?? 'block h-auto w-full bg-[#f4ebdf]'} role="img" aria-label="地圖示意：陪伴者正沿著路線前往長輩家">
      {/* river and park */}
      <path d="M-10 52 C 60 70, 120 20, 190 34 S 290 8, 340 22 L340 0 L-10 0Z" fill="#d7e7ef" />
      <path d="M210 120 c 30 -14 70 -8 86 12 c 14 18 -6 40 -40 40 c -34 0 -66 -30 -46 -52Z" fill="#dcebd5" />
      {/* streets */}
      <g stroke="#fff" strokeLinecap="round" fill="none">
        <path d="M0 132 H320" strokeWidth="9" />
        <path d="M0 92 H320" strokeWidth="5" />
        <path d="M60 0 V180" strokeWidth="5" />
        <path d="M150 0 V180" strokeWidth="9" />
        <path d="M250 0 V180" strokeWidth="5" />
        <path d="M0 172 L 120 60 L 210 0" strokeWidth="4" opacity=".7" />
      </g>
      {/* route: full path faint, travelled part solid */}
      <path d={ROUTE} fill="none" stroke="#e9803f" strokeOpacity=".35" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 10" />
      <path
        d={ROUTE}
        pathLength={1}
        fill="none"
        stroke="#b5481b"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="1 1"
        className={animate ? 'animate-[route-draw_12s_linear_infinite]' : undefined}
        style={animate ? undefined : { strokeDashoffset: 0.35 }}
      />
      {/* home */}
      <g transform="translate(292 40)">
        <circle r="17" fill="#b5481b" opacity=".15" />
        <circle r="11" fill="#b5481b" />
        <path d="M-5 1 L0 -4 L5 1 V5 H-5Z" fill="#fff" />
      </g>
      {/* companion */}
      <g>
        {animate && <animateMotion dur="12s" repeatCount="indefinite" path={ROUTE} calcMode="paced" />}
        <g transform={animate ? undefined : 'translate(196 80)'}>
          <circle r="16" fill="#e9803f" opacity=".25">
            {animate && <animate attributeName="r" values="12;20;12" dur="2.2s" repeatCount="indefinite" />}
          </circle>
          <circle r="11" fill="#fff" />
          <circle r="8.5" fill="#e9803f" />
          <text y="3.6" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff" fontFamily="Noto Serif TC, serif">
            君
          </text>
        </g>
      </g>
    </svg>
  )
}
