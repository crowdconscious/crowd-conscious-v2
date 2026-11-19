/**
 * Pure morning-email payload builders (Spanish, Su mañana ranking).
 */

import {
  orderSuMananaActions,
  type SuMananaAction,
} from '@/lib/ciceron/demo/su-manana-pure'

export type MorningEmailItem = {
  id: string
  kind: 'novedad' | 'plazo' | 'asignacion'
  title: string
  detail?: string
  href: string
  ctaLabel: string
}

export type MorningEmailPayload = {
  subject: string
  greeting: string
  intro: string
  novedades: MorningEmailItem[]
  plazos: MorningEmailItem[]
  assignments: MorningEmailItem[]
  unsubscribeUrl: string
  previewText: string
}

export function rankNovedadesFromActions(
  actions: SuMananaAction[]
): SuMananaAction[] {
  return orderSuMananaActions(
    actions.filter((a) =>
      a.kind === 'dof_match' ||
      a.kind === 'bulletin_hit' ||
      a.kind === 'bulletin_manual' ||
      a.kind === 'review'
    )
  )
}

export function buildMorningEmailPayload(input: {
  displayName: string
  dateLabel: string
  baseUrl: string
  unsubscribePath: string
  novedades: MorningEmailItem[]
  plazos: MorningEmailItem[]
  assignments: MorningEmailItem[]
}): MorningEmailPayload {
  const first = input.displayName.trim() || 'colegas'
  const total =
    input.novedades.length + input.plazos.length + input.assignments.length
  return {
    subject: `Cicerón — Su mañana · ${input.dateLabel}`,
    greeting: `Buenos días, ${first}.`,
    intro:
      total === 0
        ? 'Sin novedades urgentes para hoy. Le dejamos el resumen por si desea revisar.'
        : 'Este es su resumen de la mañana: novedades, plazos de la semana y asignaciones a su cargo.',
    novedades: input.novedades,
    plazos: input.plazos,
    assignments: input.assignments,
    unsubscribeUrl: `${input.baseUrl.replace(/\/$/, '')}${input.unsubscribePath}`,
    previewText: `Su mañana · ${input.dateLabel}`,
  }
}

/** Escape text for HTML email bodies. */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderMorningEmailHtml(payload: MorningEmailPayload): string {
  const section = (title: string, items: MorningEmailItem[]) => {
    if (items.length === 0) {
      return `<h2 style="font-family:Georgia,serif;font-size:18px;color:#0B1F33;margin:28px 0 8px">${escapeHtml(title)}</h2>
<p style="font-family:system-ui,sans-serif;font-size:14px;color:#5A6B7A;margin:0">Nada en esta sección hoy.</p>`
    }
    return `<h2 style="font-family:Georgia,serif;font-size:18px;color:#0B1F33;margin:28px 0 8px">${escapeHtml(title)}</h2>
${items
  .map(
    (item) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px">
  <tr><td style="font-family:system-ui,sans-serif;font-size:15px;color:#0B1F33;padding:0 0 4px">
    <strong>${escapeHtml(item.title)}</strong>
    ${item.detail ? `<br/><span style="color:#5A6B7A;font-size:13px">${escapeHtml(item.detail)}</span>` : ''}
  </td></tr>
  <tr><td style="padding:8px 0 0">
    <a href="${escapeHtml(item.href)}" style="display:inline-block;background:#0B1F33;color:#F4F7F5;text-decoration:none;font-family:system-ui,sans-serif;font-size:13px;padding:10px 16px;border-radius:4px">${escapeHtml(item.ctaLabel)}</a>
  </td></tr>
</table>`
  )
  .join('\n')}`
  }

  return `<!DOCTYPE html>
<html lang="es-MX">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><title>${escapeHtml(payload.subject)}</title></head>
<body style="margin:0;padding:0;background:#E8EEF2">
  <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(payload.previewText)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#E8EEF2;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;padding:28px 24px" cellspacing="0" cellpadding="0">
        <tr><td>
          <p style="font-family:Georgia,serif;font-size:22px;color:#0B1F33;margin:0 0 4px">Cicerón</p>
          <p style="font-family:system-ui,sans-serif;font-size:13px;color:#5A6B7A;margin:0 0 20px">Resumen de la mañana</p>
          <p style="font-family:system-ui,sans-serif;font-size:16px;color:#0B1F33;margin:0 0 8px">${escapeHtml(payload.greeting)}</p>
          <p style="font-family:system-ui,sans-serif;font-size:14px;color:#334455;margin:0 0 8px;line-height:1.5">${escapeHtml(payload.intro)}</p>
          ${section('Novedades del día', payload.novedades)}
          ${section('Plazos de esta semana', payload.plazos)}
          ${section('Sus asignaciones', payload.assignments)}
          <hr style="border:none;border-top:1px solid #D5DEE6;margin:28px 0 16px"/>
          <p style="font-family:system-ui,sans-serif;font-size:12px;color:#5A6B7A;margin:0;line-height:1.5">
            Si ya no desea recibir este correo,
            <a href="${escapeHtml(payload.unsubscribeUrl)}" style="color:#0B1F33">cancele la suscripción</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
