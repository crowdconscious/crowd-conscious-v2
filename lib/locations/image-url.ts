/**
 * Ensure location cover/logo URLs work in <img> / Next Image.
 * Handles full Supabase public URLs or bare storage paths.
 */
export function resolveLocationImageUrl(
  raw: string | null | undefined,
  bucket = 'sponsor-logos'
): string | null {
  const s = raw?.trim()
  if (!s) return null
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) return s
  const path = s.replace(/^\/+/, '')
  return `${base}/storage/v1/object/public/${bucket}/${path}`
}
