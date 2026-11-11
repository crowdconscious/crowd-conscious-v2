/** Cicerón.ai mark + wordmark — geometric maze «C» redrawn as SVG (brand board). */

type LogoProps = {
  className?: string
  title?: string
}

/** Maze-like C: four outer corner brackets, inner C open on the right, center square. */
export function CiceronMark({
  className,
  title = 'Cicerón.ai',
  variant = 'accent',
}: LogoProps & { variant?: 'accent' | 'mono' | 'ink' }) {
  const fill =
    variant === 'mono' ? 'currentColor' : variant === 'ink' ? 'var(--cic-ink)' : 'url(#cic-mark-grad)'

  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      width="1em"
      height="1em"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {variant === 'accent' ? (
        <defs>
          <linearGradient id="cic-mark-grad" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--cic-accent-mint)" />
            <stop offset="100%" stopColor="var(--cic-accent-deep)" />
          </linearGradient>
        </defs>
      ) : null}
      <g fill={fill} fillRule="evenodd">
        {/* Outer corner brackets — gaps at N/E/S/W */}
        <path d="M6 18V8h10v4H10v6H6z" />
        <path d="M32 8h10v10h-4v-6h-6V8z" />
        <path d="M42 30v10H32v-4h6v-6h4z" />
        <path d="M16 40H6V30h4v6h6v4z" />
        {/* Middle C — open on the right */}
        <path d="M14 14h20v4H18v12h16v4H14V14z" />
        {/* Center square */}
        <rect x="21" y="21" width="6" height="6" rx="0.5" />
      </g>
    </svg>
  )
}

/** Horizontal lockup: mark + «Cicerón.ai» («.ai» in accent). */
export function CiceronLockup({
  className,
  title = 'Cicerón.ai',
  mono = false,
}: LogoProps & { mono?: boolean }) {
  return (
    <span className={`cic-logo-lockup${mono ? ' cic-logo-lockup-mono' : ''} ${className ?? ''}`.trim()}>
      <CiceronMark variant={mono ? 'mono' : 'accent'} title="" className="cic-logo-mark" />
      <span className="cic-logo-word" aria-label={title}>
        <span className="cic-logo-name">Cicerón</span>
        <span className="cic-logo-ai">.ai</span>
      </span>
    </span>
  )
}

/** App-icon style: rounded navy square with green mark (favicon / apple-touch). */
export function CiceronAppIcon({ className, title = 'Cicerón.ai' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      width="1em"
      height="1em"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cic-icon-grad" x1="16" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#020612" />
      <g fill="url(#cic-icon-grad)" fillRule="evenodd" transform="translate(8 8)">
        <path d="M6 18V8h10v4H10v6H6z" />
        <path d="M32 8h10v10h-4v-6h-6V8z" />
        <path d="M42 30v10H32v-4h6v-6h4z" />
        <path d="M16 40H6V30h4v6h6v4z" />
        <path d="M14 14h20v4H18v12h16v4H14V14z" />
        <rect x="21" y="21" width="6" height="6" rx="0.5" />
      </g>
    </svg>
  )
}
