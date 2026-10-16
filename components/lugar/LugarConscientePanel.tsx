import Link from 'next/link'
import SealBadge from '@/components/seal/SealBadge'
import ValuesLegend from './ValuesLegend'
import ValuesPledgeForm from './ValuesPledgeForm'
import { ensureSrcSlug, latestPledge, openAward, pledgeIsCurrent, progressFor } from '@/lib/lugar/repo'
import { MIN_TOTAL_VOTERS, MIN_VOTERS_PER_WEEK, MIN_WEEKS, WINDOW_WEEKS, locationCanJoin } from '@/lib/lugar/rules'
import { sealAssets, sealVerifyPath } from '@/lib/org/sello-badge'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

const T = {
  es: {
    h: 'Lugar Consciente',
    sub: 'Sello gratuito que su lugar gana al difundir los Pulsos de Crowd Conscious y aceptar nuestros valores. Se revisa cada año. Es distinto del Sello verificado (servicio de pago para organizaciones).',
    s1: '1. Su QR y su enlace', s1p: 'Imprima el QR o comparta el enlace. Cada voto que llegue por aquí cuenta para su lugar.',
    dlqr: 'Descargar QR', copy: 'Enlace para compartir',
    s2: '2. Nuestros valores', accepted: (n: string, d: string) => `Aceptados por ${n} el ${d}.`,
    s3: '3. Su progreso', s3p: `En las últimas ${WINDOW_WEEKS} semanas necesita ${MIN_WEEKS} semanas con al menos ${MIN_VOTERS_PER_WEEK} personas distintas votando, y ${MIN_TOTAL_VOTERS} personas distintas en total. No cuentan sus propios votos ni muchos votos desde una misma red.`,
    weeks: 'Semanas que cuentan', voters: 'Personas distintas',
    active: (d: string) => `¡Activo! Vigente hasta el ${d}.`, pending: 'Cumplió los requisitos. Estamos revisando su caso; le avisaremos pronto.',
    dl: 'Descargar sello', verify: 'Página pública de verificación',
    closed: 'Este lugar no puede participar en su estado actual.',
  },
  en: {
    h: 'Lugar Consciente',
    sub: 'A free seal your place earns by spreading Crowd Conscious Pulses and accepting our values. Reviewed every year. It is different from the Sello verificado (a paid service for organizations).',
    s1: '1. Your QR and link', s1p: 'Print the QR or share the link. Every vote that arrives through it counts for your place.',
    dlqr: 'Download QR', copy: 'Link to share',
    s2: '2. Our values', accepted: (n: string, d: string) => `Accepted by ${n} on ${d}.`,
    s3: '3. Your progress', s3p: `In the last ${WINDOW_WEEKS} weeks you need ${MIN_WEEKS} weeks with at least ${MIN_VOTERS_PER_WEEK} different people voting, and ${MIN_TOTAL_VOTERS} different people in total. Your own votes and many votes from one network do not count.`,
    weeks: 'Weeks that count', voters: 'Different people',
    active: (d: string) => `Active! Valid until ${d}.`, pending: 'You met the requirements. We are reviewing your case and will let you know soon.',
    dl: 'Download seal', verify: 'Public verification page',
    closed: 'This place cannot take part in its current status.',
  },
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div>
      <div className="flex justify-between text-sm text-slate-200"><span>{label}</span><span className="font-semibold text-white">{Math.min(value, max)} / {max}</span></div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-[#2d3748]" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}>
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Owner view: QR + share link, values pledge, progress tracker and award status. */
export default async function LugarConscientePanel({ location, locale }: { location: { id: string; slug: string; status: string }; locale: 'es' | 'en' }) {
  const t = T[locale]
  const fmt = (d: string) => new Date(d).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  if (!locationCanJoin(location.status)) return <section className="mx-auto mt-8 max-w-3xl rounded-2xl border border-[#2d3748] bg-[#1a2029] p-5 text-slate-200">{t.closed}</section>
  const src = await ensureSrcSlug(location)
  const subj = { locationId: location.id }
  const [pledge, progress, award] = await Promise.all([latestPledge(subj), progressFor(location.id), openAward(subj)])
  const link = `${APP_URL}/stand?via=lugar-consciente&src=${encodeURIComponent(src)}`
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&data=${encodeURIComponent(link)}`
  const card = 'rounded-2xl border border-[#2d3748] bg-[#1a2029] p-4 sm:p-5'
  return (
    <section id="lugar-consciente" className="mx-auto mt-8 max-w-3xl space-y-4">
      <div className="flex items-center gap-4">
        <SealBadge type="lugar_consciente" size={72} id="lc-owner" />
        <div className="min-w-0"><h2 className="text-xl font-bold text-white">{t.h}</h2><p className="text-sm text-slate-300">{t.sub}</p></div>
      </div>
      {award?.status === 'active' && award.expires_at ? (
        <div className="rounded-2xl border border-emerald-400/60 bg-emerald-400/10 p-4 sm:p-5">
          <p className="font-semibold text-emerald-200">{t.active(fmt(award.expires_at))}</p>
          <p className="mt-3 text-sm font-semibold text-white">{t.dl}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {([[sealAssets('lugar_consciente').png1024, 'PNG 1024'], [sealAssets('lugar_consciente').png512, 'PNG 512'], [sealAssets('lugar_consciente').svg, 'SVG']] as const).map(([href, label]) => (
              <a key={href} href={href} download className="min-h-[44px] rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-100">{label}</a>
            ))}
          </div>
          <Link href={sealVerifyPath('lugar_consciente', location.slug)} className="mt-3 inline-block break-all text-sm text-emerald-300 underline">{t.verify}</Link>
        </div>
      ) : award?.status === 'pending' ? <p className="rounded-2xl border border-amber-300/50 bg-amber-300/10 p-4 text-amber-100">{t.pending}</p> : null}
      <div className={card}>
        <h3 className="font-semibold text-white">{t.s1}</h3>
        <p className="mt-1 text-sm text-slate-300">{t.s1p}</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR" width={160} height={160} className="h-40 w-40 rounded-lg bg-white p-1" />
          <div className="min-w-0 space-y-2">
            <p className="text-sm text-slate-200">{t.copy}</p>
            <code className="block break-all rounded-lg bg-[#0f1419] p-2 text-sm text-emerald-200">{link}</code>
            <a href={qr} download={`qr-${location.slug}.png`} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-100">{t.dlqr}</a>
          </div>
        </div>
      </div>
      <div className={card}>
        <h3 className="mb-3 font-semibold text-white">{t.s2}</h3>
        <ValuesLegend locale={locale} />
        <div className="mt-4">
          {pledgeIsCurrent(pledge) ? <p className="text-sm text-emerald-200">{t.accepted(pledge!.signer_name, fmt(pledge!.accepted_at))}</p> : <ValuesPledgeForm endpoint={`/api/dashboard/location/${encodeURIComponent(location.slug)}/lugar-consciente`} extra={{ action: 'accept_values' }} locale={locale} />}
        </div>
      </div>
      <div className={card}>
        <h3 className="font-semibold text-white">{t.s3}</h3>
        <p className="mt-1 text-sm text-slate-300">{t.s3p}</p>
        <div className="mt-4 space-y-4">
          <Bar label={t.weeks} value={progress.weeksOk} max={MIN_WEEKS} />
          <Bar label={t.voters} value={progress.totalVoters} max={MIN_TOTAL_VOTERS} />
        </div>
      </div>
    </section>
  )
}
