/**
 * Columnas | Mapa view-mode helpers (Task 4b).
 *
 * Playback (beat / votedCount) is owned by useSimulationPlayback above the
 * mode branch in SimulationViewer — switching modes must never restart the
 * replay. These helpers stay display-only by design.
 */

export type SimViewMode = 'columns' | 'map'

/**
 * Parse `?mode=` from the URL.
 * Accepts `mapa` / `map` → map, `columnas` / `columns` → columns.
 * Unknown / absent → null (caller keeps default columns).
 */
export function parseSimViewModeParam(raw: string | null | undefined): SimViewMode | null {
  if (raw == null) return null
  const v = raw.trim().toLowerCase()
  if (v === 'mapa' || v === 'map') return 'map'
  if (v === 'columnas' || v === 'columns') return 'columns'
  return null
}

/** Serialize mode for the URL share/capture link. */
export function simViewModeToParam(mode: SimViewMode): string {
  return mode === 'map' ? 'mapa' : 'columnas'
}

export type PlaybackClockSlice = {
  beat: string
  votedCount: number
  playing: boolean
}

/**
 * Pure contract: a view-mode change updates only `viewMode`.
 * Unit tests lock this so Columnas ↔ Mapa shares the same clock.
 */
export function applyViewModeChange<T extends PlaybackClockSlice>(
  state: T & { viewMode: SimViewMode },
  nextMode: SimViewMode,
): T & { viewMode: SimViewMode } {
  return {
    ...state,
    viewMode: nextMode,
  }
}
