/**
 * Normalize probability to 0-100 for display.
 * Database may store as decimal (0-1) or percentage (0-100).
 * Rule: if value is in (0, 1], treat as decimal and multiply by 100.
 */
export function toDisplayPercent(value: number): number {
  const n = Number(value)
  if (Number.isNaN(n)) return 0
  if (n > 0 && n <= 1) return n * 100
  return Math.min(100, Math.max(0, n))
}
