'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useState } from 'react'
import type { SponsorDashboardMarketRow } from '@/components/sponsor/types'

type Props = {
  market: SponsorDashboardMarketRow & { coverImageUrl?: string | null; displayTitle?: string }
  token: string
  appOrigin: string
}

function formatPct(n: number) {
  return `${Math.round(n * 100)}%`
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function SponsorMarketCard({ market, token, appOrigin }: Props) {
  const [copied, setCopied] = useState(false)
  const title = market.displayTitle ?? market.title
  const top = [...market.outcomes].sort((a, b) => b.probability - a.probability).slice(0, 3)
  const isLive = market.status === 'active' || market.status === 'trading'
  const marketUrl = `${appOrigin}/predictions/markets/${market.id}`

  const copyLink = useCallback(() => {
    void navigator.clipboard.writeText(marketUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [marketUrl])

  return (
    <article className="overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029] shadow-sm">
      {market.coverImageUrl ? (
        <div className="relative h-32 w-full">
          <Image
            src={market.coverImageUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      ) : null}
      <div className="p-5">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            market.isPulse ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {market.isPulse ? 'Pulse' : 'Mercado'}
        </span>
        <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span>{market.totalVotes} votos</span>
          {market.avgConfidence != null && (
            <span>Cert. {market.avgConfidence.toFixed(1)}/10</span>
          )}
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              isLive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'
            }`}
          >
            {isLive ? 'Activo' : market.status}
          </span>
          <span>Cierra {fmtDate(market.resolutionDate)}</span>
        </div>

        {top.length > 0 ? (
          <div className="mt-4 space-y-2">
            {top.map((o) => (
              <div key={o.id} className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-emerald-500/50"
                    style={{ width: `${Math.min(100, Math.round(o.probability * 100))}%` }}
                  />
                </div>
                <span className="w-24 truncate text-right text-xs text-slate-400">{o.label}</span>
                <span className="w-10 text-right text-xs font-medium text-white">
                  {formatPct(o.probability)}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#2d3748] pt-4 text-sm">
          <Link
            href={`/predictions/markets/${market.id}`}
            className="font-medium text-emerald-400 hover:underline"
          >
            Ver resultados →
          </Link>
          <Link
            href={`/dashboard/sponsor/${token}/report/${market.id}`}
            className="text-emerald-400/90 hover:underline"
          >
            PDF →
          </Link>
          {market.isPulse ? (
            <>
              <Link href={`/pulse/${market.id}`} className="text-slate-400 hover:text-emerald-400">
                Vista Pulse →
              </Link>
              <a
                href={`/api/dashboard/sponsor/${encodeURIComponent(token)}/export/${market.id}`}
                className="text-slate-400 hover:text-emerald-400"
              >
                CSV ↓
              </a>
            </>
          ) : null}
          <button
            type="button"
            onClick={copyLink}
            className="text-slate-400 hover:text-emerald-400"
          >
            {copied ? 'Copiado' : 'Copiar link'}
          </button>
        </div>
      </div>
    </article>
  )
}
