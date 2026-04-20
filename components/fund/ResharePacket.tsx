'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Check, Copy, Download, Instagram, Link2, MessageCircle } from 'lucide-react'
import { trackShare } from '@/lib/share-utils'

interface Props {
  causeId: string
  slug: string
  name: string
  organization: string | null
  shortDescription: string | null
  instagramHandle: string | null
  locale: 'es' | 'en'
  /** Attribution token from ?token=. Forwarded as ?ref= on outbound URLs. */
  token: string | null
}

type CopyBlock = {
  id: string
  label: string
  body: string
  hint?: string
}

/**
 * Reshare packet rendered on /fund/causes/[slug]/kit.
 *
 * Every copy block has a one-tap "Copy" button. The cause org opens this
 * URL on their phone, copies, and posts. Zero friction is the product.
 */
export function ResharePacket({
  causeId,
  slug,
  name,
  organization,
  shortDescription,
  instagramHandle,
  locale,
  token,
}: Props) {
  const L = (es: string, en: string) => (locale === 'es' ? es : en)

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://crowdconscious.app'
  const directLink = token
    ? `${baseUrl}/fund/causes/${slug}?ref=${encodeURIComponent(token)}`
    : `${baseUrl}/fund/causes/${slug}`
  const ogImageUrl = `${baseUrl}/api/og/cause/${encodeURIComponent(slug)}?lang=${locale}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
    directLink
  )}`

  const desc =
    shortDescription?.trim() ||
    L(
      'una organización verificada por la comunidad de Crowd Conscious',
      'a community-verified organization on Crowd Conscious'
    )

  const blocks: CopyBlock[] = useMemo(() => {
    const hashtagsEs = '#FondoConsciente #CrowdConscious'
    const hashtagsEn = '#ConsciousFund #CrowdConscious'
    const igHint = instagramHandle ? ` @${instagramHandle}` : ''

    return locale === 'es'
      ? [
          {
            id: 'ig_story',
            label: 'Instagram Story (≤125 car.)',
            body: `Votá por ${name} en el Fondo Consciente → link en bio / stories 🔗`,
            hint: 'Úsalo con sticker de link en tu Story.',
          },
          {
            id: 'ig_feed',
            label: 'Instagram / Feed',
            body:
              `Nos sumamos al Fondo Consciente de Crowd Conscious. ` +
              `${desc}. Cada opinión cuenta: una voz = un voto. ` +
              `Si te resuena, vota por ${name} este mes.\n\n` +
              `${directLink}\n\n${hashtagsEs}${igHint}`,
            hint: 'Buena foto + este caption + link en bio.',
          },
          {
            id: 'linkedin',
            label: 'LinkedIn',
            body:
              `${organization || name} fue seleccionada como causa verificada del ` +
              `Fondo Consciente de Crowd Conscious. Cada mes, la comunidad vota qué ` +
              `organización recibe la asignación — una opinión, un voto, sin ` +
              `intermediarios editoriales.\n\n` +
              `Si ${organization ? 'nuestro' : 'este'} trabajo te resuena, ` +
              `votá este mes:\n${directLink}`,
            hint: 'Tono profesional, voz de la organización.',
          },
          {
            id: 'whatsapp',
            label: 'WhatsApp (reenvío)',
            body:
              `Te comparto una causa increíble en Crowd Conscious: ${name} — ${desc}. ` +
              `Vota aquí: ${directLink}`,
            hint: 'Pégalo en chats y grupos.',
          },
          {
            id: 'how_it_works',
            label: '¿Cómo funciona? (texto corto)',
            body:
              `Tus seguidores votan → más votos = más dinero del Fondo Consciente ` +
              `para la causa → documentamos públicamente cada peso.`,
            hint: 'Explicación de 3 frases, para mezclar en tu propio copy.',
          },
        ]
      : [
          {
            id: 'ig_story',
            label: 'Instagram Story (≤125 chars)',
            body: `Vote for ${name} in the Conscious Fund → link in bio / stories 🔗`,
            hint: 'Use with a link sticker.',
          },
          {
            id: 'ig_feed',
            label: 'Instagram / Feed',
            body:
              `We're in Crowd Conscious's Conscious Fund. ` +
              `${desc}. Every opinion counts — one voice, one vote. ` +
              `If it resonates, vote for ${name} this month.\n\n` +
              `${directLink}\n\n${hashtagsEn}${igHint}`,
            hint: 'Strong photo + this caption + link in bio.',
          },
          {
            id: 'linkedin',
            label: 'LinkedIn',
            body:
              `${organization || name} was selected as a verified cause in the ` +
              `Crowd Conscious Conscious Fund. Every cycle the community votes on ` +
              `which organization receives the allocation — one opinion, one vote, ` +
              `no editorial middle layer.\n\n` +
              `If ${organization ? 'our' : 'this'} work resonates, vote this cycle:\n${directLink}`,
            hint: 'Professional tone, organization voice.',
          },
          {
            id: 'whatsapp',
            label: 'WhatsApp (forwardable)',
            body:
              `Sharing an amazing cause on Crowd Conscious: ${name} — ${desc}. ` +
              `Vote here: ${directLink}`,
            hint: 'Paste into DMs and group chats.',
          },
          {
            id: 'how_it_works',
            label: 'How it works (short)',
            body:
              `Your audience votes → more votes = more Conscious Fund money for the ` +
              `cause → we publicly document every peso.`,
            hint: '3-sentence explainer for mixing into your own copy.',
          },
        ]
  }, [locale, name, organization, desc, directLink, instagramHandle])

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
          {L('Kit de difusión', 'Reshare kit')}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{name}</h1>
        {organization && <p className="text-slate-300">{organization}</p>}
        <p className="text-sm text-slate-400 mt-2 max-w-2xl">
          {L(
            'Todo lo que necesitas para compartir tu causa en el Fondo Consciente. Copia y pega — ya está listo en tu voz.',
            'Everything you need to share your cause in the Conscious Fund. Copy and paste — it is already written in your voice.'
          )}
        </p>
      </header>

      {/* How it works */}
      <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <h2 className="text-sm font-semibold text-white mb-2">
          {L('Cómo funciona', 'How it works')}
        </h2>
        <ol className="text-sm text-slate-200 space-y-1 list-decimal pl-5">
          <li>
            {L(
              'Tus seguidores votan por tu causa en el Fondo Consciente.',
              'Your audience votes for your cause in the Conscious Fund.'
            )}
          </li>
          <li>
            {L(
              'Más votos = más dinero del Fondo Consciente para tu causa.',
              'More votes = more Conscious Fund money for your cause.'
            )}
          </li>
          <li>
            {L(
              'Nosotros documentamos públicamente cada peso.',
              'We publicly document every peso.'
            )}
          </li>
        </ol>
      </section>

      {/* OG card + QR */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardShellLight>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            {L('Imagen para compartir (1200×630)', 'Share image (1200×630)')}
          </p>
          <div className="relative w-full aspect-[1200/630] rounded-lg overflow-hidden border border-white/5 bg-[#0f1419]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ogImageUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <a
              href={ogImageUrl}
              download={`${slug}-og.png`}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-medium text-white"
              onClick={() =>
                trackShare(
                  { type: 'other', otherType: 'cause', otherId: causeId },
                  'story_download',
                  'kit'
                )
              }
            >
              <Download className="h-4 w-4" />
              {L('Descargar imagen', 'Download image')}
            </a>
            <a
              href={ogImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300"
            >
              {L('Abrir a tamaño real', 'Open full size')}
            </a>
          </div>
        </CardShellLight>

        <CardShellLight>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            {L('Código QR', 'QR code')}
          </p>
          <div className="flex items-center justify-center bg-white rounded-lg p-4">
            <Image
              src={qrUrl}
              alt={`QR: ${directLink}`}
              width={240}
              height={240}
              unoptimized
            />
          </div>
          <p className="text-xs text-slate-500 mt-3 break-all">{directLink}</p>
          <CopyButton
            value={directLink}
            onCopy={() =>
              trackShare(
                { type: 'other', otherType: 'cause', otherId: causeId },
                'clipboard',
                'kit_qr'
              )
            }
            label={L('Copiar enlace directo', 'Copy direct link')}
            icon={<Link2 className="h-4 w-4" />}
          />
        </CardShellLight>
      </section>

      {/* Copy blocks */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">
          {L('Textos listos para copiar', 'Ready-to-copy captions')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {blocks.map((b) => (
            <CardShellLight key={b.id}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                  {b.label}
                </p>
                <CopyChip
                  value={b.body}
                  onCopy={() =>
                    trackShare(
                      { type: 'other', otherType: 'cause', otherId: causeId },
                      'clipboard',
                      `kit_${b.id}`
                    )
                  }
                />
              </div>
              <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {b.body}
              </p>
              {b.hint && <p className="text-xs text-slate-500 mt-2">{b.hint}</p>}
            </CardShellLight>
          ))}
        </div>
      </section>

      {/* WhatsApp quick-share */}
      <section>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            `${name} — ${desc} · ${directLink}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] px-4 py-3 text-sm font-semibold text-white"
          onClick={() =>
            trackShare(
              { type: 'other', otherType: 'cause', otherId: causeId },
              'whatsapp',
              'kit_wa'
            )
          }
        >
          <MessageCircle className="h-4 w-4" />
          {L('Enviar por WhatsApp', 'Send on WhatsApp')}
        </a>
      </section>

      {/* Footer */}
      <footer className="text-xs text-slate-500 pt-6 border-t border-white/5">
        {L(
          'Crowd Conscious — Fondo Consciente. Enlace directo:',
          'Crowd Conscious — Conscious Fund. Direct link:'
        )}{' '}
        <span className="text-slate-300 break-all">{directLink}</span>
        {instagramHandle && (
          <span className="ml-2 inline-flex items-center gap-1 text-slate-500">
            <Instagram className="h-3 w-3" />@{instagramHandle}
          </span>
        )}
      </footer>
    </div>
  )
}

function CardShellLight({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">{children}</div>
  )
}

function CopyChip({
  value,
  onCopy,
}: {
  value: string
  onCopy?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      onCopy?.()
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={handle}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2 py-1 text-xs font-medium text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? 'OK' : 'Copy'}
    </button>
  )
}

function CopyButton({
  value,
  label,
  icon,
  onCopy,
}: {
  value: string
  label: string
  icon: React.ReactNode
  onCopy?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      onCopy?.()
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={handle}
      className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : icon}
      {copied ? 'OK' : label}
    </button>
  )
}

export default ResharePacket
