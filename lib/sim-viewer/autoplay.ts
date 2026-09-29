/**
 * Autoplay URL param for the simulation viewer (Task 4c).
 *
 * Default UX: choose Columnas / Mapa first, then click "Iniciar simulación".
 * Capture / recording (Task 6) still auto-starts via `?captura=1`, or via
 * the explicit `?autoplay=1` param when capture chrome is not wanted.
 */

/**
 * Parse `?autoplay=` from the URL.
 * Accepts `1` / `true` / `yes` → true. Absent / unknown → false.
 */
export function parseSimAutoplayParam(
  raw: string | null | undefined,
): boolean {
  if (raw == null) return false
  const v = raw.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Whether the viewer should start the replay clock on mount.
 * Capture mode keeps historical autoplay; otherwise only `?autoplay=1`.
 * A deep-linked `?persona=` inspector still suppresses autoplay.
 */
export function shouldSimAutoplay(opts: {
  autoplayParam: boolean
  captureMode: boolean
  personaSelected: boolean
}): boolean {
  if (opts.personaSelected) return false
  return opts.autoplayParam || opts.captureMode
}
