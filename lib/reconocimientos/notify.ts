import { sendEmail } from '@/lib/resend'

/**
 * Email moderators when a new recognition lands as `pending`.
 * Recipients: RECONOCIMIENTOS_NOTIFY_EMAIL (comma-separated) or ADMIN_EMAIL.
 * No-ops when neither is set or Resend is not configured. Never includes
 * the private `contact` field or the photo.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function notifyAdminsNewRecognition(args: {
  id: string
  what: string
  where_text: string
  src: string
}): Promise<void> {
  const raw =
    process.env.RECONOCIMIENTOS_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || ''
  const recipients = raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
  if (recipients.length === 0 || !process.env.RESEND_API_KEY) return

  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app').replace(/\/$/, '')
  const html = `
    <p>Nuevo reconocimiento pendiente de revisión.</p>
    <p><strong>Qué:</strong> ${escapeHtml(args.what)}<br/>
    <strong>Dónde:</strong> ${escapeHtml(args.where_text)}<br/>
    <strong>src:</strong> ${escapeHtml(args.src)}</p>
    <p><a href="${base}/admin/reconocimientos">Abrir moderación</a></p>`

  await Promise.all(
    recipients.map((to) =>
      sendEmail(to, { subject: 'Nuevo reconocimiento pendiente', html })
    )
  )
}
