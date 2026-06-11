/** Supabase nested selects sometimes infer as arrays; normalize to a single row. */
export function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}
