/**
 * Simulated Monday partner digest — preview only, never sent.
 */

export type DigestBullet = {
  id: string
  clientName: string
  text: string
}

export type WeeklyDigestPreview = {
  subject: string
  greeting: string
  weekLabel: string
  bullets: DigestBullet[]
  closing: string
  simulated: true
}

export function buildWeeklyDigestPreview(input: {
  partnerName: string
  weekStartIso: string
  weekEndIso: string
  movedClients: string[]
  plazosCount: number
  reviewsPending: number
}): WeeklyDigestPreview {
  const bullets: DigestBullet[] = input.movedClients.slice(0, 6).map((name, i) => ({
    id: `mv-${i}`,
    clientName: name,
    text: `${name} tuvo movimiento esta semana.`,
  }))
  if (input.plazosCount > 0) {
    bullets.push({
      id: 'plazos',
      clientName: '',
      text:
        input.plazosCount === 1
          ? 'Hay 1 plazo pendiente en la semana.'
          : `Hay ${input.plazosCount} plazos pendientes en la semana.`,
    })
  }
  if (input.reviewsPending > 0) {
    bullets.push({
      id: 'rev',
      clientName: '',
      text:
        input.reviewsPending === 1
          ? 'Queda 1 revisión por cerrar.'
          : `Quedan ${input.reviewsPending} revisiones por cerrar.`,
    })
  }
  if (bullets.length === 0) {
    bullets.push({
      id: 'quiet',
      clientName: '',
      text: 'Semana tranquila: sin movimientos que requieran su atención inmediata.',
    })
  }

  return {
    subject: `Resumen semanal del despacho — ${input.weekStartIso} a ${input.weekEndIso}`,
    greeting: `Estimada ${input.partnerName}:`,
    weekLabel: `Semana del ${input.weekStartIso} al ${input.weekEndIso} (Ciudad de México)`,
    bullets,
    closing:
      'Este correo es una vista previa de demostración. No se envía a nadie. Datos de demostración.',
    simulated: true,
  }
}
