/**
 * Pure helpers for the clickable Mexico map state detail panel.
 */

export type MapStatePanelMatter = {
  id: string
  label: string
  matchKind: 'exact' | 'possible'
}

export type MapStatePanelDetail = {
  stateCode: string
  stateName: string
  statusLabel: string
  status: string
  sourceName: string
  /** HH:MM in CDMX, or null when never consulted. */
  lastConsultHm: string | null
  reviewerName: string | null
  matters: MapStatePanelMatter[]
  hitsExact: number
  hitsPossible: number
}

/** Format an ISO datetime as HH:MM for the panel (24 h). */
export function formatConsultHm(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return fmt.format(d)
}

export function findStatePanelDetail(
  details: MapStatePanelDetail[],
  stateCode: string
): MapStatePanelDetail | null {
  return details.find((d) => d.stateCode === stateCode) ?? null
}
