import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BadgeCheck } from 'lucide-react'
import SealBadge from '@/components/seal/SealBadge'
import ValuesLegend from '@/components/lugar/ValuesLegend'
import ValuesPledgeForm from '@/components/lugar/ValuesPledgeForm'
import TeamPanel from '@/components/org/TeamPanel'
import { SEAL_NAMES, sealAssets, sealVerifyPath } from '@/lib/org/sello-badge'
import { LUGAR_CONSCIENTE_ENABLED } from '@/lib/lugar/config'
import { ensurePaidLugar, latestPledge, pledgeIsCurrent, type Award } from '@/lib/lugar/repo'
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
    selloOn: 'Activo: su organización tiene el servicio vigente y una lectura medida con resultados públicos.',
    selloOff: 'Se activa solo mientras su servicio esté activo y una lectura cerrada sea pública. Desaparece si deja de pagar o si sus resultados son privados.',
    billingOff: 'Su servicio no está activo.',
    dl: 'Descargar su Sello verificado', png1024: 'PNG 1024 px', png512: 'PNG 512 px', svg: 'SVG',
    usage: 'Puede usarlo en su sitio web, redes sociales y otras plataformas. Es válido mientras su servicio esté activo y sus resultados sean públicos. Enlácelo a su página de verificación:',
    verify: 'Página pública de verificación',
    lcH: 'Lugar Consciente (incluido)', lcP: 'Como cliente con servicio vigente, su organización recibe también el sello Lugar Consciente, sin pasos extra, en cuanto acepte nuestros valores.', lcOn: (d: string) => `Activo hasta el ${d}. Se renueva mientras su servicio siga vigente.`,
  },
  en: {
    readings: 'Your readings', empty: 'No readings yet. We will reach out to design the first one.',
    status: { design: 'In design', field: 'In field', closed: 'Closed' }, pub: 'Public', priv: 'Private',
    inField: (n: number, d: number) => `${n} responses · closes in ${d} ${d === 1 ? 'day' : 'days'}`,
    locked: 'Results open at close.', open: 'Open reading',
    selloOn: 'Active: your service is active and a measured reading has public results.',
    selloOff: 'It turns on only while your service is active and a closed reading is public. It disappears if payment stops or results are private.',
    billingOff: 'Your service is not active.',
    dl: 'Download your Sello verificado', png1024: 'PNG 1024 px', png512: 'PNG 512 px', svg: 'SVG',
    usage: 'You may use it on your website, social media and other platforms. It is valid while your service is active and your results are public. Link it to your verification page:',
    verify: 'Public verification page',
    lcH: 'Lugar Consciente (included)', lcP: 'As a client with an active service, your organization also gets the Lugar Consciente seal, with no extra steps, once it accepts our values.', lcOn: (d: string) => `Active until ${d}. Renews while your service stays active.`,
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
  // Paying clients get Lugar Consciente automatically once they accept the values (first visit shows the form).
  let lcPledged = false
  let lcAward: Award | null = null
  if (LUGAR_CONSCIENTE_ENABLED && !ctx.demo && ctx.org) {
    lcPledged = pledgeIsCurrent(await latestPledge({ orgId: ctx.org.id }))
    lcAward = lcPledged ? await ensurePaidLugar(ctx.org.id, ctx.billingActive) : null
  }
  const fmt = (d: string) => new Date(d).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
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
              <BadgeCheck className={`h-5 w-5 ${ctx.sello ? 'text-emerald-300' : 'text-slate-400'}`} aria-hidden /> {SEAL_NAMES.sello_verificado[locale]}
            </p>
            <p className="mt-2 text-sm text-slate-200">{ctx.sello ? t.selloOn : t.selloOff}</p>
            {!ctx.billingActive ? <p className="mt-1 text-sm text-amber-200">{t.billingOff}</p> : null}
            {ctx.sello ? (
              <div className="mt-4">
                <div className="flex justify-center"><SealBadge type="sello_verificado" size={140} id="sello-dash" slug={slug} /></div>
                <p className="mt-4 text-sm font-semibold text-white">{t.dl}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {([[sealAssets('sello_verificado').png1024, t.png1024], [sealAssets('sello_verificado').png512, t.png512], [sealAssets('sello_verificado').svg, t.svg]] as const).map(([href, label]) => (
                    <a key={href} href={href} download className="min-h-[44px] rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/10">{label}</a>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-200">{t.usage}</p>
                <Link href={sealVerifyPath('sello_verificado', slug)} className="mt-1 inline-block break-all text-xs font-semibold text-emerald-300 underline">{t.verify}: {sealVerifyPath('sello_verificado', slug)}</Link>
              </div>
            ) : null}
          </div>
          {LUGAR_CONSCIENTE_ENABLED && !ctx.demo && ctx.billingActive ? (
            <div className="rounded-2xl border border-[#2d3748] bg-[#1a2029] p-5">
              <div className="flex items-center gap-3"><SealBadge type="lugar_consciente" size={56} id="lc-org" /><p className="font-semibold text-white">{t.lcH}</p></div>
              {lcAward?.status === 'active' && lcAward.expires_at ? (
                <p className="mt-3 text-sm text-emerald-200">{t.lcOn(fmt(lcAward.expires_at))} <Link className="underline" href={sealVerifyPath('lugar_consciente', slug)}>{t.verify}</Link></p>
              ) : !lcPledged && ctx.role === 'owner' ? (
                <div className="mt-3 space-y-3"><p className="text-sm text-slate-200">{t.lcP}</p><ValuesLegend locale={locale} withDesc={false} /><ValuesPledgeForm endpoint={`/api/org/${encodeURIComponent(slug)}/valores`} locale={locale} /></div>
              ) : <p className="mt-3 text-sm text-slate-200">{t.lcP}</p>}
            </div>
          ) : null}
          {!ctx.demo ? <TeamPanel slug={slug} locale={locale} canEdit={ctx.role === 'owner'} /> : null}
        </aside>
      </div>
    </div>
  )
}
