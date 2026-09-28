import { sanitizeSrc } from './config'

/** sessionStorage key for intake src across photo-picker remounts / redirects. */
export const RECONOCE_SRC_STORAGE_KEY = 'cc_reconoce_src'

/** Persist a landing src for the rest of the intake session. */
export function persistIntakeSrc(src: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(RECONOCE_SRC_STORAGE_KEY, sanitizeSrc(src))
  } catch {
    // Private mode / quota — ignore
  }
}

export function readPersistedIntakeSrc(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(RECONOCE_SRC_STORAGE_KEY)
    return raw && raw.trim() ? sanitizeSrc(raw) : null
  } catch {
    return null
  }
}

export function clearPersistedIntakeSrc(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(RECONOCE_SRC_STORAGE_KEY)
  } catch {
    // ignore
  }
}
