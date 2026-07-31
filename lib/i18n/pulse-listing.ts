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
      ? 'Vista administrador: todos los Pulses'
      : 'Admin view: all Pulses',
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
      ? 'Vuelve pronto o explora más consultas en la plataforma.'
      : 'Check back soon or explore more consultations on the platform.',
    browseMarkets: isEs ? 'Explorar la plataforma' : 'Explore the platform',
    ctaQuestion: isEs
      ? '¿Quieres medir el sentimiento de tu comunidad?'
      : 'Want to measure your community’s sentiment?',
    ctaFirstFree: isEs
      ? 'Primera consulta gratuita para nuevos clientes.'
      : 'First consultation free for new clients.',
    ctaViewPlans: isEs ? 'Ver planes →' : 'View plans →',
    ctaLearnMore: isEs ? 'Conocer Conscious Pulse →' : 'Learn about Conscious Pulse →',
    home: isEs ? 'Inicio' : 'Home',
    consciousFund: isEs ? 'Fondo Consciente' : 'Conscious Fund',
    resultsMetaTitle: isEs
      ? 'Resultados de consultas Pulse | Crowd Conscious'
      : 'Pulse consultation results | Crowd Conscious',
    resultsMetaDescription: isEs
      ? 'Resultados finales de consultas ciudadanas Pulse, ponderados por el nivel de certeza de la comunidad. Powered by Crowd Conscious.'
      : 'Final results of Pulse citizen consultations, weighted by community confidence. Powered by Crowd Conscious.',
    resultsBadge: isEs ? '📊 Resultados' : '📊 Results',
    resultsTitle: isEs ? 'Resultados de consultas Pulse' : 'Pulse consultation results',
    resultsSubtitle: isEs
      ? 'Consultas cerradas con su resultado final, ponderado por el nivel de certeza de la comunidad.'
      : 'Closed consultations with their final outcome, weighted by community confidence.',
    resultsEmptyTitle: isEs ? 'Aún no hay consultas cerradas.' : 'No closed consultations yet.',
    resultsEmptySubtitle: isEs
      ? 'Cuando una consulta Pulse cierra, su resultado aparece aquí.'
      : 'When a Pulse consultation closes, its result shows up here.',
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
