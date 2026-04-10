'use client'

import { useCallback, useState } from 'react'

type Item = { id: string; title: string; url: string }

export default function SponsorShareClient({ markets }: { markets: Item[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copy = useCallback((id: string, url: string) => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])

  const wa = (title: string, url: string) => {
    const text = encodeURIComponent(`¿Qué opinas? ${title}\n${url}`)
    return `https://wa.me/?text=${text}`
  }

  if (markets.length === 0) {
    return (
      <p className="mt-8 rounded-xl border border-[#2d3748] bg-[#1a2029] p-6 text-slate-400">
        Cuando tengas mercados vinculados, aparecerán aquí los enlaces y QR.
      </p>
    )
  }

  return (
    <ul className="mt-8 space-y-8">
      {markets.map((m) => {
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(m.url)}`
        return (
          <li key={m.id} className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-5">
            <h2 className="font-semibold text-white">{m.title}</h2>
            <p className="mt-2 break-all text-sm text-slate-500">{m.url}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => copy(m.id, m.url)}
                className="rounded-lg border border-emerald-500/30 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10"
              >
                {copiedId === m.id ? 'Copiado' : 'Copiar enlace'}
              </button>
              <a
                href={wa(m.title, m.url)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                WhatsApp
              </a>
              <a
                href={qrSrc}
                download={`qr-${m.id.slice(0, 8)}.png`}
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Abrir QR (guardar imagen)
              </a>
            </div>
            <div className="mt-4 flex justify-center rounded-lg bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="" width={200} height={200} className="h-[200px] w-[200px]" />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
