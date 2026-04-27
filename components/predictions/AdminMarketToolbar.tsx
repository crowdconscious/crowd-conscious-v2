import Link from 'next/link'
import { Pencil, ExternalLink } from 'lucide-react'

type Props = {
  marketId: string
  /**
   * Whether the market has `is_pulse = true`. Used only to decide which
   * dashboard the "Sponsor view" deep link should point to. Not gating —
   * admins can edit either market type from the same form.
   */
  isPulse?: boolean
}

/**
 * Slim slate strip, rendered just below the DraftBanner (or at the very top
 * of the page when the market is published). Visible only to admins; the
 * server pages decide whether to render it. Keeps admin tools one click
 * away from the live market view so we don't have to bounce through
 * /admin/markets every time we need to fix a typo or swap a cover image.
 */
export function AdminMarketToolbar({ marketId, isPulse }: Props) {
  return (
    <div className="bg-slate-900/95 border-b border-slate-700 text-slate-200 px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
      <span className="font-semibold uppercase tracking-wide text-slate-400">
        Admin
      </span>
      <Link
        href={`/predictions/admin/edit-market/${marketId}`}
        className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 font-medium"
      >
        <Pencil className="w-3.5 h-3.5" aria-hidden />
        Editar mercado
      </Link>
      <Link
        href={`/admin/markets`}
        className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white"
      >
        <ExternalLink className="w-3.5 h-3.5" aria-hidden />
        Panel de mercados
      </Link>
      {isPulse && (
        <Link
          href={`/admin/sponsors`}
          className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          Sponsors
        </Link>
      )}
    </div>
  )
}
