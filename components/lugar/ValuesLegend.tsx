import { Star } from 'lucide-react'
import { VALUES } from '@/lib/lugar/rules'

/** Legend for the 7 stars on the Lugar Consciente badge (left to right). Framed as values, not audited rules. */
export default function ValuesLegend({ locale, withDesc = true }: { locale: 'es' | 'en'; withDesc?: boolean }) {
  return (
    <ol className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2" aria-label={locale === 'es' ? 'Nuestros 7 valores' : 'Our 7 values'}>
      {VALUES.map((v, i) => (
        <li key={v.key} className="flex min-w-0 items-start gap-2 rounded-xl border border-[#2d3748] bg-[#1a2029] p-3">
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 text-emerald-300" aria-hidden>
            <Star className="h-4 w-4 fill-current" />
            <span className="text-xs font-bold">{i + 1}</span>
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-white">{locale === 'es' ? v.es : v.en}</span>
            {withDesc ? <span className="block text-sm text-slate-300">{locale === 'es' ? v.descEs : v.descEn}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  )
}
