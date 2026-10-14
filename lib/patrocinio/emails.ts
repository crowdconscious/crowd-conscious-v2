/**
 * Patrocinio comunitario emails (Resend via lib/resend.ts).
 * The donor receipt states it is a contribution, NOT a tax invoice (CFDI) and
 * NOT a tax-deductible donation receipt. Never claim deductibility.
 */
import { sendEmail } from '@/lib/resend'
import { formatMxn } from '@/lib/organizaciones/pricing'

export type DonationEmailRow = {
  id: string
  stripe_checkout_session_id: string
  stripe_payment_intent_id: string | null
  amount_mxn: number | string
  stripe_fee_mxn: number | string | null
  net_mxn: number | string | null
  fee_source: string
  fund_credited: boolean
  donor_name: string | null
  donor_email: string | null
  is_anonymous: boolean
  locale: string
  receipt_number: string | null
  paid_at: string
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const money = (v: number | string | null) => (v == null ? '—' : `${formatMxn(Number(v))} MXN`)

function shell(inner: string) {
  return `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: 0 auto; background: #0f1419; color: #e5e7eb;">
  <div style="padding: 20px 24px; border-bottom: 1px solid #2d3748;"><strong style="color:#10b981;font-size:16px;">Crowd Conscious</strong> <span style="color:#9ca3af;font-size:12px;">· Patrocinio comunitario</span></div>
  <div style="padding: 24px;">${inner}</div>
  <div style="padding: 14px 24px; border-top: 1px solid #2d3748; color:#9ca3af; font-size:11px;">Crowd Conscious · crowdconscious.app · comunidad@crowdconscious.app</div>
</div>`
}
function row(label: string, value: string, bold = false) {
  return `<tr><td style="padding:6px 0;color:#9ca3af;font-size:13px;">${label}</td><td style="padding:6px 0;text-align:right;font-size:13px;color:#e5e7eb;${bold ? 'font-weight:bold;' : ''}">${value}</td></tr>`
}

export function buildDonorReceiptEmail(r: DonationEmailRow) {
  const date = new Date(r.paid_at).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' })
  const name = r.is_anonymous ? '' : r.donor_name ?? ''
  const html = shell(`
  <h1 style="color:#10b981;font-size:20px;margin:0 0 6px;">Gracias por tu aportación · Thank you for your contribution</h1>
  <p style="color:#9ca3af;font-size:12px;margin:0 0 18px;">Folio: ${esc(r.receipt_number)} · ${esc(date)}</p>
  <div style="border:1px solid #f59e0b;background:#2a2112;border-radius:8px;padding:12px 14px;margin:0 0 18px;">
    <p style="margin:0;color:#fcd34d;font-size:14px;font-weight:bold;">Este correo confirma una aportación al Fondo Consciente. No es una factura ni un comprobante fiscal (CFDI), y no es un recibo de donativo deducible de impuestos.</p>
    <p style="margin:6px 0 0;color:#fcd34d;font-size:12px;">This email confirms a contribution to the Conscious Fund. It is not a tax invoice (CFDI) and not a tax-deductible donation receipt.</p>
  </div>
  <p style="font-size:14px;line-height:1.6;margin:0 0 14px;">Hola${name ? ' ' + esc(name) : ''}, recibimos tu aportación de <strong>${money(r.amount_mxn)}</strong>. Se descuentan las comisiones de la tarjeta; el resto va al Fondo Consciente, y la comunidad vota qué causas lo reciben.</p>
  <p style="font-size:12px;line-height:1.6;color:#9ca3af;margin:0 0 18px;">Hi${name ? ' ' + esc(name) : ''}, we received your contribution of <strong>${money(r.amount_mxn)}</strong>. Card fees are deducted; the rest goes to the Conscious Fund, and the community votes on which causes receive it.</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #2d3748;border-bottom:1px solid #2d3748;">
    ${row('Aportación · Contribution', money(r.amount_mxn), true)}
  </table>
  <p style="font-size:12px;color:#9ca3af;margin:14px 0 0;">Ve el fondo y vota causas · See the fund and vote: <a href="https://crowdconscious.app/predictions/fund" style="color:#6ee7b7;">crowdconscious.app/predictions/fund</a></p>`)
  return { subject: `Gracias por tu aportación · Folio ${r.receipt_number} · Crowd Conscious`, html }
}

export function buildDonationAdminAlertEmail(r: DonationEmailRow) {
  const pending = r.fee_source !== 'stripe_balance_transaction' || !r.fund_credited
  const html = shell(`
  <h1 style="color:#10b981;font-size:18px;margin:0 0 14px;">Nueva aportación · Patrocinio comunitario</h1>
  ${pending ? '<p style="color:#fcd34d;font-size:13px;margin:0 0 12px;"><strong>Atención:</strong> la comisión de Stripe no estaba disponible, así que el Fondo aún NO se acreditó. Revisa el pago en Stripe y acredita el neto manualmente.</p>' : ''}
  <table style="width:100%;border-collapse:collapse;">
    ${row('Monto bruto', money(r.amount_mxn), true)}
    ${row('Comisión Stripe', money(r.stripe_fee_mxn))}
    ${row('Neto al Fondo', money(r.net_mxn))}
    ${row('Fondo acreditado', r.fund_credited ? 'Sí' : 'No')}
    ${row('Nombre', esc(r.is_anonymous ? '(anónimo)' : r.donor_name || '—'))}
    ${row('Correo', esc(r.donor_email || '—'))}
    ${row('Idioma', esc(r.locale))}
    ${row('Folio', esc(r.receipt_number))}
    ${row('Checkout session', esc(r.stripe_checkout_session_id))}
    ${row('Payment intent', esc(r.stripe_payment_intent_id))}
  </table>`)
  return { subject: `Aportación ${money(r.amount_mxn)} · Patrocinio comunitario${pending ? ' · REVISAR comisión' : ''}`, html }
}

export async function sendDonorReceipt(r: DonationEmailRow) {
  if (!r.donor_email) return { success: true as const, skipped: true }
  return sendEmail(r.donor_email, buildDonorReceiptEmail(r))
}

export async function sendDonationAdminAlert(r: DonationEmailRow) {
  return sendEmail(process.env.ADMIN_EMAIL || 'comunidad@crowdconscious.app', buildDonationAdminAlertEmail(r))
}
