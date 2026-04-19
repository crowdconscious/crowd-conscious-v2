'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Copy, ExternalLink, X } from 'lucide-react'

type Props = {
  isOpen: boolean
  onClose: () => void
  name: string
  slug: string
  marketCreated: boolean
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://crowdconscious.app'

/**
 * Post-create modal that surfaces the location's OG share card so the operator
 * can copy the URL + a venue-owner DM template in one motion.
 *
 * The OG image at /api/og/location/[slug] already exists; we just preview it
 * here and offer the share URL plus a Spanish DM the operator can paste into
 * WhatsApp / Instagram.
 */
export function LocationCreatedShareCard({
  isOpen,
  onClose,
  name,
  slug,
  marketCreated,
}: Props) {
  const [copied, setCopied] = useState<'url' | 'dm' | null>(null)
  const shareUrl = `${APP_URL}/locations/${slug}`
  const ogUrl = `${APP_URL}/api/og/location/${slug}`
  const dmTemplate = `Hola! Te etiquetamos en Crowd Conscious — somos una plataforma que mide qué tan Conscious es un lugar a partir de votos reales de la comunidad.

${name} ya tiene su perfil aquí: ${shareUrl}

Te paso una tarjeta lista para compartir en historias o reels. ¿Quieres que te enviemos un kit con el sello?`

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    void navigator.clipboard?.writeText(shareUrl).then(
      () => setCopied('url'),
      () => {
        // Clipboard write can fail on insecure contexts — silent fallback,
        // operator can still hit the manual copy button.
      }
    )
  }, [isOpen, shareUrl])

  const copy = async (which: 'url' | 'dm', text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied((c) => (c === which ? null : c)), 1800)
    } catch {
      // ignore
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-cc-border bg-[#0f1419] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 rounded-lg p-2 text-cc-text-secondary hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-cc-border p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            ✓ {marketCreated ? 'Lugar creado · mercado activo' : 'Lugar creado'}
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">{name}</h2>
          <p className="mt-1 text-xs text-cc-text-secondary">
            La URL está copiada al portapapeles. Mándale esta tarjeta al dueño del lugar.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="overflow-hidden rounded-xl border border-cc-border bg-[#1a2029]">
            <div className="relative aspect-[1200/630] w-full bg-[#0f1419]">
              {/* OG image preview — uses unoptimized=true so we hit the live route */}
              <Image
                src={ogUrl}
                alt={`Tarjeta para ${name}`}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 720px"
                className="object-contain"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-cc-text-secondary">URL pública</label>
            <div className="mt-1 flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 rounded-lg border border-cc-border bg-[#0f1419] px-3 py-2 font-mono text-xs text-white"
              />
              <button
                type="button"
                onClick={() => void copy('url', shareUrl)}
                className="inline-flex items-center gap-1 rounded-lg border border-cc-border px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10"
              >
                {copied === 'url' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === 'url' ? 'Copiado' : 'Copiar'}
              </button>
              <Link
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-cc-border px-3 py-2 text-xs text-cc-text-secondary hover:bg-cc-card hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir
              </Link>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-cc-text-secondary">
              DM listo para enviar (WhatsApp / IG)
            </label>
            <textarea
              readOnly
              value={dmTemplate}
              rows={6}
              className="mt-1 w-full rounded-lg border border-cc-border bg-[#0f1419] px-3 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => void copy('dm', dmTemplate)}
              className="mt-2 inline-flex items-center gap-1 rounded-lg border border-cc-border px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10"
            >
              {copied === 'dm' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === 'dm' ? 'Copiado' : 'Copiar mensaje'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
