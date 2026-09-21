type SpacetimeFieldProps = {
  active: boolean;
  className?: string;
};

const LATITUDES = [74, 126, 182, 242, 306, 374, 446];
const LONGITUDES = [-30, 42, 114, 186, 258, 330, 402, 474];

/**
 * A lightweight spacetime navigation map for VEGA's communications panel.
 * The geometry is SVG rather than another canvas loop: only dash offset,
 * opacity, and two small transforms animate, and reduced-motion freezes all
 * of them into the same useful composition.
 */
export default function SpacetimeField({ active, className = "" }: SpacetimeFieldProps) {
  return (
    <svg
      viewBox="0 0 460 540"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full ${active ? "spacetime-field-active" : ""} ${className}`}
    >
      <defs>
        <linearGradient id="spacetime-line" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#38bdf8" stopOpacity="0" />
          <stop offset="0.24" stopColor="#67e8f9" stopOpacity="0.72" />
          <stop offset="0.62" stopColor="#818cf8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#c4b5fd" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="spacetime-node">
          <stop offset="0" stopColor="#ecfeff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#67e8f9" stopOpacity="0.7" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="spacetime-haze" cx="66%" cy="42%" r="58%">
          <stop offset="0" stopColor="#6366f1" stopOpacity="0.16" />
          <stop offset="0.46" stopColor="#0891b2" stopOpacity="0.08" />
          <stop offset="1" stopColor="#020617" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="460" height="540" fill="url(#spacetime-haze)" />

      {/* Coordinate fabric. Every line bends around the same navigation
          corridor, so the field reads as warped space rather than graph paper. */}
      <g className="spacetime-grid" fill="none" stroke="#7dd3fc" strokeOpacity="0.13" strokeWidth="0.8">
        {LATITUDES.map((y, index) => (
          <path
            key={`latitude-${y}`}
            d={`M -30 ${y} C 72 ${y - 28 + index * 2}, 154 ${y + 42 - index * 4}, 238 ${y + 4} S 382 ${y - 34 + index * 3}, 490 ${y + 6}`}
          />
        ))}
        {LONGITUDES.map((x, index) => (
          <path
            key={`longitude-${x}`}
            d={`M ${x} -30 C ${x + 54 - index * 4} 104, ${x - 42 + index * 3} 226, ${x + 12} 318 S ${x + 40 - index * 2} 468, ${x + 22} 570`}
          />
        ))}
      </g>

      {/* Temporal reference rings: open, luminous coordinates rather than a
          filled centre, deliberately avoiding black-hole imagery. */}
      <g className="spacetime-rings" fill="none" stroke="#a5b4fc" strokeOpacity="0.22">
        <ellipse cx="286" cy="230" rx="102" ry="44" strokeWidth="0.8" strokeDasharray="3 8" />
        <ellipse cx="286" cy="230" rx="70" ry="30" strokeWidth="0.9" strokeDasharray="2 6" />
        <ellipse cx="286" cy="230" rx="38" ry="16" stroke="#67e8f9" strokeOpacity="0.36" />
        <path d="M286 166v128M198 230h176" stroke="#67e8f9" strokeOpacity="0.12" strokeDasharray="2 7" />
      </g>

      {/* VEGA's active worldline through the coordinate fabric. */}
      <path
        className="spacetime-worldline"
        d="M-24 438 C54 412 96 344 137 334 C187 321 197 374 247 342 C302 307 277 235 326 194 C365 162 410 169 484 84"
        fill="none"
        stroke="url(#spacetime-line)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="4 10"
      />
      <path
        d="M-24 438 C54 412 96 344 137 334 C187 321 197 374 247 342 C302 307 277 235 326 194 C365 162 410 169 484 84"
        fill="none"
        stroke="#67e8f9"
        strokeOpacity="0.08"
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* Signal fixes along the route. */}
      <g transform="translate(137 334)">
        <g className="spacetime-pulse">
          <circle r="20" fill="url(#spacetime-node)" opacity="0.22" />
          <circle r="3.2" fill="#cffafe" opacity="0.9" />
          <circle r="8" fill="none" stroke="#67e8f9" strokeOpacity="0.45" />
        </g>
      </g>
      <g transform="translate(326 194)">
        <circle r="17" fill="url(#spacetime-node)" opacity="0.18" />
        <circle r="2.6" fill="#c7d2fe" opacity="0.9" />
        <circle r="7" fill="none" stroke="#a5b4fc" strokeOpacity="0.42" />
      </g>

      <g fill="#e0f2fe">
        <circle cx="58" cy="116" r="1.2" opacity="0.42" />
        <circle cx="112" cy="86" r="0.8" opacity="0.6" />
        <circle cx="190" cy="132" r="1.1" opacity="0.46" />
        <circle cx="394" cy="300" r="1.2" opacity="0.5" />
        <circle cx="346" cy="420" r="0.9" opacity="0.55" />
        <circle cx="84" cy="474" r="1.3" opacity="0.38" />
      </g>
    </svg>
  );
}
