import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BadgeCheck } from 'lucide-react'
import SelloBadge from '@/components/org/SelloBadge'
import TeamPanel from '@/components/org/TeamPanel'
import { SELLO_ASSETS, selloVerifyPath } from '@/lib/org/sello-badge'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { DEMO_BANNER } from '@/lib/org/demo-data'
import { readingHeadline } from '@/lib/org/headline-copy'
import { responseRate } from '@/lib/org/readings'
import { clientReadings, orgContext } from '@/lib/org/server-reading'
import { getOrgLocale } from '@/app/organizaciones/locale'

export const dynamic = 'force-dynamic'

const T = {
  es: {
    readings: 'Sus lecturas', empty: 'Todavía no hay lecturas. Le escribiremos para diseñar la primera.',
    status: { design: 'En diseño', field: 'En campo', closed: 'Cerrada' }, pub: 'Pública', priv: 'Privada',
    inField: (n: number, d: number) => `${n} respuestas · cierra en ${d} ${d === 1 ? 'día' : 'días'}`,
    locked: 'Los resultados se abren al cierre.', open: 'Ver lectura',
    sello: 'Sello verificado', selloOn: 'Activo: su organización paga el servicio y tiene resultados públicos.',
    selloOff: 'Se activa solo mientras su servicio esté activo y una lectura cerrada sea pública. Desaparece si deja de pagar o si sus resultados son privados.',
    billingOff: 'Su servicio no está activo.',
    dl: 'Descargar el Sello', png1024: 'PNG 1024 px', png512: 'PNG 512 px', svg: 'SVG',
    usage: 'Puede usarlo en su sitio web, redes sociales y otras plataformas. Es válido mientras su servicio esté activo y sus resultados sean públicos. Enlácelo a su página de verificación:',
    verify: 'Página pública de verificación',
  },
  en: {
    readings: 'Your readings', empty: 'No readings yet. We will reach out to design the first one.',
    status: { design: 'In design', field: 'In field', closed: 'Closed' }, pub: 'Public', priv: 'Private',
    inField: (n: number, d: number) => `${n} responses · closes in ${d} ${d === 1 ? 'day' : 'days'}`,
    locked: 'Results open at close.', open: 'Open reading',
    sello: 'Verified Seal', selloOn: 'Active: your organization is a paying client with public results.',
    selloOff: 'It turns on only while your service is active and a closed reading is public. It disappears if payment stops or results are private.',
    billingOff: 'Your service is not active.',
    dl: 'Download the Seal', png1024: 'PNG 1024 px', png512: 'PNG 512 px', svg: 'SVG',
    usage: 'You may use it on your website, social media and other platforms. It is valid while your service is active and your results are public. Link it to your verification page:',
    verify: 'Public verification page',
  },
}

/** Client home: readings list, Sello status and team seats. */
export default async function OrgHome({ params }: { params: Promise<{ slug: string }> }) {
  if (!ORG_PORTAL_V2) notFound()
  const { slug } = await params
  const c = await orgContext(slug)
  if (!c.ok) {
    if (c.access.kind === 'login') redirect(`/login?redirect=${encodeURIComponent(`/org/${slug}`)}`)
    notFound()
  }
  const ctx = c.ctx
  const locale = await getOrgLocale()
  const t = T[locale]
  const readings = await clientReadings(ctx)
  return (
    <div>
      {ctx.demo ? (
        <div className="border-b border-amber-300/40 bg-amber-300/10 px-4 py-2 text-center text-sm font-semibold text-amber-100">{DEMO_BANNER[locale]} · {ctx.name}</div>
      ) : null}
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          <p className="text-sm text-slate-300">{ctx.name}</p>
          <h1 className="text-2xl font-bold text-white">{t.readings}</h1>
          {readings.length === 0 ? <p className="mt-4 text-slate-200">{t.empty}</p> : null}
          <ul className="mt-5 space-y-3">
            {readings.map((r) => {
              const h = r.status === 'closed' ? readingHeadline(r.questions, locale) : null
              const rate = responseRate(r)
              return (
                <li key={r.id}>
                  <Link href={`/org/${slug}/lecturas/${r.id}`} className="block rounded-2xl border border-[#2d3748] bg-[#1a2029] p-4 hover:border-emerald-400/70 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <span className="rounded border border-slate-500 px-1.5 py-0.5 font-semibold text-slate-100">{t.status[r.status]}</span>
                      <span>{r.period[locale]}</span>
                      <span>· {r.visibility === 'public' ? t.pub : t.priv}</span>
                    </div>
                    <p className="mt-2 break-words text-lg font-semibold text-white">{r.title[locale]}</p>
                    {r.status === 'field' ? (
                      <p className="mt-1 text-sm text-slate-200">{t.inField(r.responded, r.closesInDays ?? 0)} · {t.locked}</p>
                    ) : h ? (
                      <p className="mt-1 break-words text-sm text-slate-200">{h.main}</p>
                    ) : null}
                    {r.status === 'closed' && r.invited > 0 ? <p className="mt-1 text-xs text-slate-300">{r.responded} / {r.invited} · {rate}%</p> : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
        <aside className="min-w-0 space-y-4">
          <div className={`rounded-2xl border p-5 ${ctx.sello ? 'border-emerald-400/60 bg-emerald-400/10' : 'border-[#2d3748] bg-[#1a2029]'}`}>
            <p className="flex items-center gap-2 font-semibold text-white">
              <BadgeCheck className={`h-5 w-5 ${ctx.sello ? 'text-emerald-300' : 'text-slate-400'}`} aria-hidden /> {t.sello}
            </p>
            <p className="mt-2 text-sm text-slate-200">{ctx.sello ? t.selloOn : t.selloOff}</p>
            {!ctx.billingActive ? <p className="mt-1 text-sm text-amber-200">{t.billingOff}</p> : null}
            {ctx.sello ? (
              <div className="mt-4">
                <div className="flex justify-center"><SelloBadge size={140} id="sello-dash" slug={slug} /></div>
                <p className="mt-4 text-sm font-semibold text-white">{t.dl}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {([[SELLO_ASSETS.png1024, t.png1024], [SELLO_ASSETS.png512, t.png512], [SELLO_ASSETS.svg, t.svg]] as const).map(([href, label]) => (
                    <a key={href} href={href} download className="min-h-[44px] rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/10">{label}</a>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-200">{t.usage}</p>
                <Link href={selloVerifyPath(slug)} className="mt-1 inline-block break-all text-xs font-semibold text-emerald-300 underline">{t.verify}: {selloVerifyPath(slug)}</Link>
              </div>
            ) : null}
          </div>
          {!ctx.demo ? <TeamPanel slug={slug} locale={locale} canEdit={ctx.role === 'owner'} /> : null}
        </aside>
      </div>
    </div>
  )
}
