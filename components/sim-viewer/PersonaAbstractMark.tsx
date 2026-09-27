/**
 * Abstract identity mark for a synthetic persona.
 * Keyed to NSE band (colour) + alcaldía (geometry). Never a face/avatar/photo —
 * portraits would imply a real individual.
 */

import {
  alcaldiaGlyph,
  nseBandColor,
} from '@/lib/sim-viewer/persona-mark'

export type PersonaAbstractMarkProps = {
  nseBand: string
  alcaldia: string
  size?: number
  className?: string
}

export { alcaldiaGlyph, nseBandColor }

export function PersonaAbstractMark({
  nseBand,
  alcaldia,
  size = 56,
  className = '',
}: PersonaAbstractMarkProps) {
  const fill = nseBandColor(nseBand)
  const glyph = alcaldiaGlyph(alcaldia)
  const label = `Marca abstracta · NSE ${nseBand} · ${alcaldia}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      role="img"
      aria-label={label}
      className={className}
      data-persona-mark={glyph}
      data-nse={nseBand}
      data-alcaldia={alcaldia}
    >
      <title>{label}</title>
      {/* Outer ring — dashed to match simulated visual language */}
      <circle
        cx="28"
        cy="28"
        r="26"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        strokeDasharray="3 3"
        opacity="0.55"
      />
      {glyph === 'diamond' ? (
        <polygon
          points="28,10 46,28 28,46 10,28"
          fill={fill}
          fillOpacity="0.22"
          stroke={fill}
          strokeWidth="2"
        />
      ) : glyph === 'hexagon' ? (
        <polygon
          points="28,9 44,18 44,38 28,47 12,38 12,18"
          fill={fill}
          fillOpacity="0.22"
          stroke={fill}
          strokeWidth="2"
        />
      ) : (
        <rect
          x="14"
          y="14"
          width="28"
          height="28"
          rx="6"
          fill={fill}
          fillOpacity="0.22"
          stroke={fill}
          strokeWidth="2"
        />
      )}
      {/* Inner NSE initial — typographic, not a face */}
      <text
        x="28"
        y="31"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={fill}
        fontSize="11"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="700"
      >
        {nseBand.length > 3 ? nseBand.slice(0, 3) : nseBand}
      </text>
    </svg>
  )
}
