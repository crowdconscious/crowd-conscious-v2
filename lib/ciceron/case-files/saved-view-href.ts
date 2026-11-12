/** Rooms that share ciceron.saved_views (306 monitor-dof + 308/310 Expedientes). */
export type SavedViewRoom = 'monitor-dof' | 'expedientes' | 'calendario'

export type SavedView = {
  id: string
  name: string
  room: SavedViewRoom
  filters: Record<string, unknown>
  isSample: boolean
}

export const KNOWN_SAVED_VIEW_ROOMS: ReadonlySet<string> = new Set([
  'monitor-dof',
  'expedientes',
  'calendario',
])

export function asSavedViewRoom(value: string): SavedViewRoom | null {
  return KNOWN_SAVED_VIEW_ROOMS.has(value) ? (value as SavedViewRoom) : null
}

/** Build a list URL from a saved view's filters jsonb. */
export function savedViewHref(view: SavedView): string {
  const params = new URLSearchParams()
  const urgency = view.filters.urgency
  const q = view.filters.q
  const client = view.filters.clientId ?? view.filters.client
  if (typeof urgency === 'string' && urgency) params.set('urgency', urgency)
  if (typeof q === 'string' && q) params.set('q', q)
  if (typeof client === 'string' && client) params.set('client', client)

  if (view.room === 'calendario') {
    const qs = params.toString()
    return qs ? `/ciceron/expedientes/calendario?${qs}` : '/ciceron/expedientes/calendario'
  }
  if (view.room === 'monitor-dof') {
    const qs = params.toString()
    return qs ? `/ciceron/monitor-dof?${qs}` : '/ciceron/monitor-dof'
  }
  const qs = params.toString()
  return qs ? `/ciceron/expedientes?${qs}` : '/ciceron/expedientes'
}
