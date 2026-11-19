/**
 * WCAG 2.1 relative-luminance / contrast helpers for Cicerón readability tokens.
 * Pure — no DOM. Used to lock AA floors in tests.
 */

export type Rgb = { r: number; g: number; b: number }

/** Parse #RGB or #RRGGBB (case-insensitive). */
export function parseHexColor(hex: string): Rgb {
  const raw = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) {
    throw new Error(`Invalid hex color: ${hex}`)
  }
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function channelLuminance(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** Relative luminance per WCAG 2.1 (0–1). */
export function relativeLuminance(rgb: Rgb): number {
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  )
}

/** Contrast ratio of two hex colors (lighter/darker), ≥1. */
export function contrastRatio(fgHex: string, bgHex: string): number {
  const L1 = relativeLuminance(parseHexColor(fgHex))
  const L2 = relativeLuminance(parseHexColor(bgHex))
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

/** WCAG AA normal text (≥4.5:1). */
export function meetsWcagAaNormal(fgHex: string, bgHex: string): boolean {
  return contrastRatio(fgHex, bgHex) >= 4.5
}

/** WCAG AA large text / UI (≥3:1). */
export function meetsWcagAaLarge(fgHex: string, bgHex: string): boolean {
  return contrastRatio(fgHex, bgHex) >= 3
}

/** Locked Cicerón readability tokens after the AA pass. */
export const CICERON_READABILITY_TOKENS = {
  bg: '#020612',
  surface: '#101826',
  surface2: '#152033',
  ink: '#eef3f9',
  muted: '#a8b6c9',
  accentMint: '#6ee7b7',
} as const
