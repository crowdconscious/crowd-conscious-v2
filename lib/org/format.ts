/** Dates written out for reports and the dashboard, in Mexico City time. */
export function longDate(iso: string, locale: 'es' | 'en'): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00-06:00`) : new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-MX' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  }).format(d)
}

export function longDateTime(iso: string, locale: 'es' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const s = new Intl.DateTimeFormat(locale === 'es' ? 'es-MX' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'America/Mexico_City',
  }).format(d)
  return `${s} h (CDMX)`
}
