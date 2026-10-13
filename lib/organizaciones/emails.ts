/**
 * B2B pilot emails. Sent through the shared Resend sender (lib/resend.ts).
 * The client receipt is explicitly NOT a CFDI; the CFDI is issued separately
 * by Francisco's accountant from the data in the admin alert.
 */
import { sendEmail } from '@/lib/resend'
import { REGIMENES_FISCALES, USOS_CFDI } from './fiscal'
import { formatMxn } from './pricing'

export type OrgPilotEmailRow = {
  id: string
  kind: 'pilot' | 'proposal'
  plan: string
  company_name: string
  contact_name: string
  email: string
  phone: string | null
  rfc: string | null
  razon_social: string | null
  regimen_fiscal: string | null
  cp_fiscal: string | null
  uso_cfdi: string | null
  message: string | null
  locale: string
  source: string | null
  subtotal_mxn: number | string | null
  iva_mxn: number | string | null
  total_mxn: number | string | null
  fund_mxn: number | string | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  paid_at: string | null
  receipt_number: string | null
  created_at: string
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const n = (v: number | string | null) => (v == null ? 0 : Number(v))
const money = (v: number | string | null) => `${formatMxn(n(v))} MXN`

function regimenLabel(code: string | null) {
  const r = REGIMENES_FISCALES.find((x) => x.code === code)
  return r ? `${r.code} · ${r.es}` : code ?? ''
}
function usoLabel(code: string | null) {
  const u = USOS_CFDI.find((x) => x.code === code)
  return u ? `${u.code} · ${u.es}` : code ?? ''
}

function shell(inner: string) {
  return `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: 0 auto; background: #0f1419; color: #e5e7eb;">
  <div style="padding: 20px 24px; border-bottom: 1px solid #2d3748;"><strong style="color:#10b981;font-size:16px;">Crowd Conscious</strong> <span style="color:#9ca3af;font-size:12px;">· Organizaciones</span></div>
  <div style="padding: 24px;">${inner}</div>
  <div style="padding: 14px 24px; border-top: 1px solid #2d3748; color:#6b7280; font-size:11px;">Crowd Conscious · crowdconscious.app · francisco@crowdconscious.app</div>
</div>`
}

function row(label: string, value: string, bold = false) {
  return `<tr><td style="padding:6px 0;color:#9ca3af;font-size:13px;">${label}</td><td style="padding:6px 0;text-align:right;font-size:13px;color:#e5e7eb;${bold ? 'font-weight:bold;' : ''}">${value}</td></tr>`
}

export function buildClientReceiptEmail(r: OrgPilotEmailRow) {
  const paid = r.paid_at ? new Date(r.paid_at).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }) : ''
  const html = shell(`
  <h1 style="color:#10b981;font-size:20px;margin:0 0 6px;">Recibo de pago · Payment receipt</h1>
  <p style="color:#9ca3af;font-size:12px;margin:0 0 18px;">Folio: ${esc(r.receipt_number)} · ${esc(paid)}</p>
  <div style="border:1px solid #f59e0b;background:#2a2112;border-radius:8px;padding:12px 14px;margin:0 0 18px;">
    <p style="margin:0;color:#fcd34d;font-size:14px;font-weight:bold;">Este recibo no es un comprobante fiscal (CFDI); su factura le llegará por separado.</p>
    <p style="margin:6px 0 0;color:#fcd34d;font-size:12px;">This receipt is not a tax invoice (CFDI); your invoice will arrive separately.</p>
  </div>
  <p style="font-size:14px;line-height:1.6;margin:0 0 14px;">Hola ${esc(r.contact_name)}, gracias. Recibimos el pago de la <strong>Lectura piloto privada</strong> para ${esc(r.company_name)}. En los próximos 2 días hábiles le escribimos para agendar el diseño de las preguntas.</p>
  <p style="font-size:12px;line-height:1.6;color:#9ca3af;margin:0 0 18px;">Hi ${esc(r.contact_name)}, thank you. We received payment for the <strong>Private pilot reading</strong> for ${esc(r.company_name)}. Within 2 business days we will reach out to schedule the question design.</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #2d3748;border-bottom:1px solid #2d3748;">
    ${row('Lectura piloto privada · Private pilot reading', money(r.subtotal_mxn))}
    ${row('IVA 16% · VAT 16%', money(r.iva_mxn))}
    ${row('Total pagado · Total paid', money(r.total_mxn), true)}
  </table>
  <p style="font-size:12px;color:#9ca3af;margin:14px 0 0;">Del subtotal antes de IVA, el 20% (${money(r.fund_mxn)}) va al Fondo Consciente. · 20% of the pre-VAT subtotal (${money(r.fund_mxn)}) goes to the Conscious Fund.</p>
  <p style="font-size:12px;color:#9ca3af;margin:8px 0 0;">100% abonable a Escucha continua si la contrata dentro de 90 días. · 100% credited toward Continuous listening if signed within 90 days.</p>
  <h2 style="font-size:14px;color:#e5e7eb;margin:20px 0 6px;">Datos para su factura · Invoice data</h2>
  <table style="width:100%;border-collapse:collapse;">
    ${row('Razón social', esc(r.razon_social))}
    ${row('RFC', esc(r.rfc))}
    ${row('Régimen fiscal', esc(regimenLabel(r.regimen_fiscal)))}
    ${row('C.P. fiscal', esc(r.cp_fiscal))}
    ${row('Uso de CFDI', esc(usoLabel(r.uso_cfdi)))}
  </table>
  <p style="font-size:12px;color:#9ca3af;margin:14px 0 0;">Si algún dato es incorrecto, responda a este correo antes de que emitamos el CFDI. · If any detail is wrong, reply before we issue the CFDI.</p>`)
  return { subject: `Recibo ${r.receipt_number} · Lectura piloto · Crowd Conscious`, html }
}

export function buildAdminAlertEmail(r: OrgPilotEmailRow) {
  const isPilot = r.kind === 'pilot'
  const title = isPilot ? 'PILOTO PAGADO: emitir CFDI' : `Solicitud de propuesta (${r.plan})`
  const html = shell(`
  <h1 style="color:#10b981;font-size:18px;margin:0 0 14px;">${esc(title)}</h1>
  <table style="width:100%;border-collapse:collapse;">
    ${row('Empresa', esc(r.company_name), true)}
    ${row('Contacto', esc(r.contact_name))}
    ${row('Correo', esc(r.email))}
    ${row('Teléfono', esc(r.phone))}
    ${row('Plan', esc(r.plan))}
    ${row('Origen', esc(r.source))}
    ${row('Idioma', esc(r.locale))}
    ${row('ID solicitud', esc(r.id))}
  </table>
  ${
    r.rfc
      ? `<h2 style="font-size:14px;margin:18px 0 6px;">Datos fiscales (CFDI 4.0)</h2>
  <table style="width:100%;border-collapse:collapse;">
    ${row('Razón social', esc(r.razon_social), true)}
    ${row('RFC', esc(r.rfc), true)}
    ${row('Régimen fiscal', esc(regimenLabel(r.regimen_fiscal)))}
    ${row('C.P. fiscal', esc(r.cp_fiscal))}
    ${row('Uso de CFDI', esc(usoLabel(r.uso_cfdi)))}
  </table>`
      : ''
  }
  ${
    isPilot
      ? `<h2 style="font-size:14px;margin:18px 0 6px;">Pago</h2>
  <table style="width:100%;border-collapse:collapse;">
    ${row('Folio recibo', esc(r.receipt_number))}
    ${row('Subtotal', money(r.subtotal_mxn))}
    ${row('IVA 16%', money(r.iva_mxn))}
    ${row('Total', money(r.total_mxn), true)}
    ${row('20% Fondo Consciente (antes de IVA)', money(r.fund_mxn))}
    ${row('Pagado', esc(r.paid_at))}
    ${row('Stripe session', esc(r.stripe_checkout_session_id))}
    ${row('Stripe payment intent', esc(r.stripe_payment_intent_id))}
  </table>
  <p style="font-size:12px;color:#fcd34d;margin:14px 0 0;">El cliente recibió un recibo que dice que NO es CFDI. Emitir el CFDI y enviarlo a ${esc(r.email)}.</p>`
      : ''
  }
  ${r.message ? `<h2 style="font-size:14px;margin:18px 0 6px;">Mensaje</h2><p style="font-size:13px;white-space:pre-wrap;">${esc(r.message)}</p>` : ''}`)
  return { subject: `[Organizaciones] ${title} · ${r.company_name}`, html }
}

export function adminEmail() {
  return process.env.ADMIN_EMAIL || 'francisco@crowdconscious.app'
}

export async function sendOrgClientReceipt(r: OrgPilotEmailRow) {
  return sendEmail(r.email, buildClientReceiptEmail(r))
}

export async function sendOrgAdminAlert(r: OrgPilotEmailRow) {
  return sendEmail(adminEmail(), buildAdminAlertEmail(r))
}
