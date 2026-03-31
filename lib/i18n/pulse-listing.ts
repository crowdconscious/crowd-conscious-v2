export type PulseListingLocale = 'es' | 'en'

export function getPulseListingCopy(locale: PulseListingLocale) {
  const isEs = locale === 'es'
  return {
    metaTitle: isEs
      ? 'Conscious Pulse — Medición de sentimiento público'
      : 'Conscious Pulse — Real-time public sentiment',
    metaDescription: isEs
      ? 'Consultas ciudadanas y medición de opinión pública en tiempo real. Powered by Crowd Conscious.'
      : 'Citizen consultations and real-time public opinion measurement. Powered by Crowd Conscious.',
    ogDescription: isEs
      ? 'Medición de sentimiento público en tiempo real.'
      : 'Real-time public sentiment measurement.',
    badge: '📊 Conscious Pulse',
    title: isEs
      ? 'Medición de sentimiento público en tiempo real'
      : 'Real-time public sentiment measurement',
    subtitle: isEs
      ? 'Consultas activas impulsadas por Crowd Conscious. Resultados en vivo con analíticas de confianza.'
      : 'Active consultations powered by Crowd Conscious. Live results with confidence analytics.',
    adminView: isEs
      ? 'Vista administrador: todos los mercados Pulse'
      : 'Admin view: all Pulse markets',
    sponsorView: (company: string) =>
      isEs
        ? `Pulse para ${company}: tus consultas activas`
        : `Pulse for ${company}: your active consultations`,
    viewResults: isEs ? 'Ver resultados →' : 'View results →',
    votes: isEs ? 'votos' : 'votes',
    poweredBy: isEs ? 'Impulsado por Crowd Conscious' : 'Powered by Crowd Conscious',
    active: isEs ? 'Activo' : 'Active',
    resolved: isEs ? 'Resuelto' : 'Resolved',
    trading: isEs ? 'En trading' : 'Trading',
    proposed: isEs ? 'Propuesto' : 'Proposed',
    approved: isEs ? 'Aprobado' : 'Approved',
    disputed: isEs ? 'Disputado' : 'Disputed',
    cancelled: isEs ? 'Cancelado' : 'Cancelled',
    closes: isEs ? 'Cierra' : 'Closes',
    emptyTitle: isEs ? 'Aún no hay consultas Pulse activas.' : 'No active Pulse consultations yet.',
    emptySubtitle: isEs
      ? 'Vuelve pronto o explora los mercados de predicción.'
      : 'Check back soon or explore prediction markets.',
    browseMarkets: isEs ? 'Ver mercados' : 'Browse markets',
    ctaQuestion: isEs
      ? '¿Quieres medir el sentimiento de tu comunidad?'
      : 'Want to measure your community’s sentiment?',
    ctaLearnMore: isEs ? 'Conocer Conscious Pulse →' : 'Learn about Conscious Pulse →',
    home: isEs ? 'Inicio' : 'Home',
    consciousFund: isEs ? 'Fondo Consciente' : 'Conscious Fund',
  }
}

export function statusLabelPulse(status: string, locale: PulseListingLocale): string {
  const t = getPulseListingCopy(locale)
  if (locale === 'en') {
    const map: Record<string, string> = {
      active: t.active,
      trading: t.trading,
      resolved: t.resolved,
      proposed: t.proposed,
      approved: t.approved,
      disputed: t.disputed,
      cancelled: t.cancelled,
    }
    return map[status] ?? status
  }
  const map: Record<string, string> = {
    active: t.active,
    trading: t.trading,
    resolved: t.resolved,
    proposed: t.proposed,
    approved: t.approved,
    disputed: t.disputed,
    cancelled: t.cancelled,
  }
  return map[status] ?? status
}
