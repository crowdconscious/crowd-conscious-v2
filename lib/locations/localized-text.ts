/**
 * Pick ES vs EN field with fallback to the other language.
 * ES UI reads ES first; EN UI reads _en first, then ES.
 */
export function pickLocalizedText(
  locale: 'es' | 'en',
  es: string | null | undefined,
  en: string | null | undefined
): string | null {
  const a = (locale === 'es' ? es : en)?.trim() || null
  const b = (locale === 'es' ? en : es)?.trim() || null
  return a || b
}

/** Case-insensitive trimmed equality for duplicate-section detection. */
export function textsEqualIgnoreCase(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const left = (a ?? '').trim().toLowerCase()
  const right = (b ?? '').trim().toLowerCase()
  if (!left || !right) return false
  return left === right
}
