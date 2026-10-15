'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarClock, CreditCard, FileText, Loader2 } from 'lucide-react'
import { CP_REGEX, REGIMENES_FISCALES, USOS_CFDI, isValidRfcFormat } from '@/lib/organizaciones/fiscal'
import { BASE_SIZES, ORG_TYPES, VISIBILITY_PREFS } from '@/lib/organizaciones/lead-options'
import { PILOT_BREAKDOWN, formatMxn } from '@/lib/organizaciones/pricing'
import { ORG_CONTACT_EMAIL, SAMPLE_PDF_HREF } from '@/lib/org/config'

export type Mode = 'call' | 'proposal' | 'pilot'
export type Plan = 'pilot' | 'anual' | 'continua' | 'sello'
type Locale = 'es' | 'en'

const C = {
  es: {
    title: 'Empecemos',
    sub: 'La mayoría de las organizaciones empieza con una llamada. Elija lo que le acomode.',
    opts: {
      call: { t: 'Agendar una llamada de 20 minutos', d: 'Le explicamos el piloto y definimos juntos preguntas y población.' },
      proposal: { t: 'Solicitar propuesta u orden de compra', d: 'Le enviamos una propuesta en PDF en menos de 48 horas.' },
      pilot: { t: 'Pagar el piloto ahora con tarjeta', d: 'Para organizaciones pequeñas listas para empezar.' },
    },
    booking: 'Elegir horario',
    bookingTitle: 'Elija un horario en el calendario',
    bookingOr: 'O déjenos sus datos y le proponemos horarios:',
    mailto: 'También puede escribir a',
    defineTitle: 'Lo que define su piloto',
    orgType: 'Tipo de organización',
    reporting: '¿Qué reportan hoy sobre satisfacción, y a quién?',
    reportingPh: 'Ej. NPS trimestral al consejo',
    baseSize: 'Tamaño aproximado de su base de usuarios',
    visibility: 'Visibilidad',
    visibilityNote: 'Usted la elige y puede cambiarla en cualquier momento desde su panel.',
    plan: 'Plan de interés',
    plans: { pilot: 'Lectura piloto privada', anual: 'Lectura anual', continua: 'Escucha continua', sello: 'Escucha continua + Sello verificado' },
    whoTitle: 'Quién es usted',
    company: 'Empresa',
    contact: 'Nombre',
    cargo: 'Cargo',
    email: 'Correo',
    phone: 'Teléfono',
    optional: '(opcional)',
    callMsg: 'Horarios que le acomodan (opcional)',
    callMsgPh: 'Ej. martes o jueves por la mañana',
    message: 'Algo más que debamos saber (opcional)',
    fiscal: 'Datos fiscales para su CFDI',
    fiscalNote: 'Emitimos su CFDI 4.0 por separado con estos datos. El recibo que le enviamos al pagar no es un comprobante fiscal.',
    rfc: 'RFC',
    rfcPh: 'Ej. ABC010101AB1',
    razon: 'Razón social (como aparece en su constancia)',
    regimen: 'Régimen fiscal',
    cp: 'Código postal fiscal',
    cpPh: 'Ej. 06600',
    uso: 'Uso de CFDI',
    select: 'Seleccione…',
    submit: { call: 'Solicitar llamada', proposal: 'Solicitar propuesta', pilot: 'Pagar con tarjeta' },
    payOr: 'Pagar con tarjeta o SPEI',
    cardOnly: 'El pago en línea es solo con tarjeta. Para transferencia SPEI u orden de compra, elija «Solicitar propuesta».',
    spei: 'Puede pagar con tarjeta o con transferencia SPEI (Stripe le dará una CLABE).',
    errRfc: 'RFC con formato inválido (12 caracteres para persona moral, 13 para persona física).',
    errCp: 'El código postal debe tener 5 dígitos.',
    errRequired: 'Campo obligatorio.',
    errEmail: 'Correo inválido.',
    errGeneric: 'No pudimos enviar su solicitud. Intente de nuevo o escriba a francisco@crowdconscious.app.',
    cancelled: 'El pago se canceló y no se hizo ningún cargo. Puede intentarlo de nuevo o elegir otra opción.',
    summary: 'Lectura piloto privada',
    subtotal: 'Piloto',
    iva: 'IVA 16%',
    total: 'Total',
    fund: 'Al Fondo Consciente (20% antes de IVA)',
    credit: '100% abonable a Escucha continua si la contrata dentro de 90 días.',
    next: 'Qué pasa después',
    timeline: [
      ['Días 1-2', 'Llamada de arranque'],
      ['Semana 1', 'Preguntas y población'],
      ['Semanas 2-4', 'Consulta abierta'],
      ['Semana 6', 'Lectura y sesión de resultados'],
    ],
    done: {
      call: { t: 'Gracias. Recibimos su solicitud de llamada.', d: 'Le escribimos en menos de 1 día hábil con dos o tres horarios.' },
      proposal: { t: 'Gracias. Recibimos su solicitud.', d: 'Le enviamos una propuesta en PDF en menos de 48 horas, con orden de compra y datos para transferencia SPEI.' },
    },
    shareTitle: 'Mientras tanto, compártalo internamente:',
    shareDemo: 'Ver el demo',
    sharePdf: 'Descargar PDF de muestra',
  },
  en: {
    title: 'Let’s get started',
    sub: 'Most organizations start with a call. Choose what suits you.',
    opts: {
      call: { t: 'Book a 20-minute call', d: 'We walk you through the pilot and define questions and population together.' },
      proposal: { t: 'Request a proposal or purchase order', d: 'We send you a PDF proposal within 48 hours.' },
      pilot: { t: 'Pay for the pilot now by card', d: 'For small organizations ready to start.' },
    },
    booking: 'Pick a time',
    bookingOr: 'Or leave your details and we will propose times:',
    mailto: 'You can also write to',
    defineTitle: 'What defines your pilot',
    orgType: 'Type of organization',
    reporting: 'What do you report today about satisfaction, and to whom?',
    reportingPh: 'E.g. quarterly NPS to the board',
    baseSize: 'Approximate size of your user base',
    visibility: 'Visibility',
    visibilityNote: 'You choose it and can change it at any time from your dashboard.',
    plan: 'Plan of interest',
    plans: { pilot: 'Private pilot reading', anual: 'Annual reading', continua: 'Continuous listening', sello: 'Continuous listening + Verified Seal' },
    whoTitle: 'Who you are',
    company: 'Company',
    contact: 'Name',
    cargo: 'Job title',
    email: 'Email',
    phone: 'Phone',
    optional: '(optional)',
    callMsg: 'Times that work for you (optional)',
    bookingTitle: 'Pick a time on the calendar',
    callMsgPh: 'E.g. Tuesday or Thursday morning',
    message: 'Anything else we should know (optional)',
    fiscal: 'Tax data for your CFDI invoice',
    fiscalNote: 'We issue your CFDI 4.0 separately with this data. The receipt we email on payment is not a tax invoice.',
    rfc: 'RFC (Mexican tax ID)',
    rfcPh: 'E.g. ABC010101AB1',
    razon: 'Legal name (razón social)',
    regimen: 'Tax regime',
    cp: 'Tax postal code',
    cpPh: 'E.g. 06600',
    uso: 'CFDI use',
    select: 'Select…',
    submit: { call: 'Request a call', proposal: 'Request a proposal', pilot: 'Pay by card' },
    payOr: 'Pay by card or SPEI',
    cardOnly: 'Online payment is card only. For a SPEI transfer or purchase order, choose "Request a proposal".',
    spei: 'You can pay by card or SPEI bank transfer (Stripe will give you a CLABE).',
    errRfc: 'Invalid RFC format (12 characters for companies, 13 for individuals).',
    errCp: 'Postal code must be 5 digits.',
    errRequired: 'Required field.',
    errEmail: 'Invalid email.',
    errGeneric: 'We could not send your request. Try again or write to francisco@crowdconscious.app.',
    cancelled: 'Payment was cancelled and nothing was charged. You can try again or choose another option.',
    summary: 'Private pilot reading',
    subtotal: 'Pilot',
    iva: 'VAT (IVA) 16%',
    total: 'Total',
    fund: 'To the Conscious Fund (20% before VAT)',
    credit: '100% credited toward Continuous listening if you sign within 90 days.',
    next: 'What happens next',
    timeline: [
      ['Days 1-2', 'Kickoff call'],
      ['Week 1', 'Questions and population'],
      ['Weeks 2-4', 'Consultation open'],
      ['Week 6', 'Reading and results session'],
    ],
    done: {
      call: { t: 'Thank you. We received your call request.', d: 'We will write within 1 business day with two or three time slots.' },
      proposal: { t: 'Thank you. We received your request.', d: 'We will send a PDF proposal within 48 hours, with purchase order and SPEI transfer details.' },
    },
    shareTitle: 'Meanwhile, share it internally:',
    shareDemo: 'See the demo',
    sharePdf: 'Download sample PDF',
  },
} as const

const input =
  'mt-1 w-full rounded-lg border px-3 py-2.5 text-base text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400 sm:text-sm'
const labelCls = 'block text-sm font-medium text-slate-100'

type Fields = Record<
  | 'company_name' | 'contact_name' | 'cargo' | 'email' | 'phone' | 'org_type' | 'current_reporting' | 'base_size'
  | 'visibility_pref' | 'rfc' | 'razon_social' | 'regimen_fiscal' | 'cp_fiscal' | 'uso_cfdi' | 'message',
  string
>

const EMPTY: Fields = {
  company_name: '', contact_name: '', cargo: '', email: '', phone: '', org_type: '', current_reporting: '', base_size: '',
  visibility_pref: '', rfc: '', razon_social: '', regimen_fiscal: '', cp_fiscal: '', uso_cfdi: 'G03', message: '',
}

const FISCAL: (keyof Fields)[] = ['rfc', 'razon_social', 'regimen_fiscal', 'cp_fiscal', 'uso_cfdi']

export default function ContratarForm(props: {
  locale: Locale
  initialMode: Mode
  initialPlan: Plan
  cancelled: boolean
  source: string | null
  speiEnabled: boolean
  bookingUrl: string | null
}) {
  const { locale } = props
  const c = C[locale]
  const fmt = (n: number) => formatMxn(n, locale)
  const [mode, setMode] = useState<Mode>(props.initialMode)
  const [plan, setPlan] = useState<Plan>(props.initialPlan)
  const [f, setF] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({})
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState<Mode | null>(null)

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: k === 'rfc' ? e.target.value.toUpperCase() : e.target.value }))

  function validate() {
    const e: Partial<Record<keyof Fields, string>> = {}
    const req: (keyof Fields)[] = ['company_name', 'contact_name', 'email']
    if (mode !== 'call') req.push('org_type', 'base_size', 'visibility_pref', 'cargo')
    if (mode === 'pilot') req.push('phone', ...FISCAL)
    for (const k of req) if (!f[k].trim()) e[k] = c.errRequired
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = c.errEmail
    if (mode === 'pilot') {
      if (f.rfc.trim() && !isValidRfcFormat(f.rfc)) e.rfc = c.errRfc
      if (f.cp_fiscal.trim() && !CP_REGEX.test(f.cp_fiscal.trim())) e.cp_fiscal = c.errCp
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setFormError(null)
    if (!validate()) return
    setBusy(true)
    // Fiscal fields are only ever sent for card payments.
    const payload: Record<string, string | undefined> = { ...f }
    if (mode !== 'pilot') for (const k of FISCAL) delete payload[k]
    if (mode === 'call') for (const k of ['org_type', 'base_size', 'visibility_pref'] as const) delete payload[k]
    for (const k of Object.keys(payload)) if (payload[k] === '') delete payload[k]
    try {
      const res = await fetch('/api/organizaciones/contratar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, mode, plan: mode === 'proposal' ? plan : 'pilot', locale, source: props.source ?? undefined }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error('request failed')
      if (mode === 'pilot' && json.data?.url) {
        window.location.href = json.data.url as string
        return
      }
      setDone(mode)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setFormError(c.errGeneric)
    } finally {
      setBusy(false)
    }
  }

  const err = (k: keyof Fields) => (errors[k] ? <span className="mt-1 block text-sm text-red-300">{errors[k]}</span> : null)
  const text = (k: keyof Fields, label: string, o: { type?: string; ph?: string; max?: number; auto?: string } = {}) => (
    <label className={labelCls}>
      {label}
      <input
        className={input}
        type={o.type ?? 'text'}
        value={f[k]}
        onChange={set(k)}
        placeholder={o.ph}
        maxLength={o.max}
        autoComplete={o.auto}
        aria-invalid={!!errors[k]}
      />
      {err(k)}
    </label>
  )
  const select = (k: keyof Fields, label: string, opts: readonly { code: string; es: string; en: string }[], withCode = false) => (
    <label className={labelCls}>
      {label}
      <select className={input} value={f[k]} onChange={set(k)} aria-invalid={!!errors[k]}>
        {k !== 'uso_cfdi' ? <option value="">{c.select}</option> : null}
        {opts.map((o) => (
          <option key={o.code} value={o.code}>
            {withCode ? `${o.code} · ` : ''}
            {o[locale]}
          </option>
        ))}
      </select>
      {err(k)}
    </label>
  )

  const icons = { call: CalendarClock, proposal: FileText, pilot: CreditCard }

  return (
    <div className="px-4 py-8 sm:py-10">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_330px]">
        <div className="min-w-0">
          <Link href="/organizaciones" className="text-sm text-slate-200 hover:text-white">
            ← {locale === 'es' ? 'Volver a organizaciones' : 'Back to organizations'}
          </Link>

          {done && done !== 'pilot' ? (
            <div className="mt-4 rounded-2xl border border-emerald-400/50 bg-emerald-400/10 p-6">
              <h1 className="text-2xl font-bold text-white">{c.done[done].t}</h1>
              <p className="mt-2 text-base text-slate-100">{c.done[done].d}</p>
              <p className="mt-5 text-sm font-semibold text-white">{c.shareTitle}</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <Link href="/organizaciones/demo" className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-400 px-5 font-semibold text-[#0f1419]">
                  {c.shareDemo}
                </Link>
                <a href={`${SAMPLE_PDF_HREF}?lang=${locale}`} className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-400 px-5 font-semibold text-slate-100">
                  {c.sharePdf}
                </a>
              </div>
            </div>
          ) : (
            <>
              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{c.title}</h1>
              <p className="mt-1 text-slate-200">{c.sub}</p>

              {props.cancelled ? <p className="mt-4 rounded-xl border border-amber-300/50 bg-amber-300/10 p-3 text-sm text-amber-100">{c.cancelled}</p> : null}

              <div className="mt-6 grid gap-3" role="radiogroup">
                {(['call', 'proposal', 'pilot'] as const).map((m) => {
                  const Icon = icons[m]
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mode === m}
                      onClick={() => {
                        setMode(m)
                        setErrors({})
                      }}
                      className={`flex items-start gap-3 rounded-xl border p-4 text-left ${
                        mode === m ? 'border-emerald-400 bg-emerald-400/10' : 'border-[#2d3748] bg-[#1a2029] hover:border-slate-400'
                      }`}
                    >
                      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${mode === m ? 'text-emerald-300' : 'text-slate-300'}`} />
                      <span>
                        <span className="block font-semibold text-white">{c.opts[m].t}</span>
                        <span className="block text-sm text-slate-200">{c.opts[m].d}</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              {mode === 'call' && props.bookingUrl ? (
                <div className="mt-6 rounded-2xl border border-emerald-400/50 bg-emerald-400/[0.07] p-5">
                  <p className="text-base font-semibold text-white">{c.bookingTitle}</p>
                  <a
                    href={props.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-emerald-400 px-6 text-base font-semibold text-[#0f1419] hover:bg-emerald-300 sm:w-auto"
                  >
                    {c.booking} →
                  </a>
                  <p className="mt-4 text-sm text-slate-200">{c.bookingOr}</p>
                </div>
              ) : null}

              <form onSubmit={submit} noValidate className="mt-6 space-y-6">
                {mode !== 'call' ? (
                  <fieldset className="space-y-4 rounded-2xl border border-[#2d3748] bg-[#1a2029] p-5">
                    <legend className="px-2 text-base font-semibold text-emerald-300">{c.defineTitle}</legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {select('org_type', c.orgType, ORG_TYPES)}
                      {select('base_size', c.baseSize, BASE_SIZES)}
                    </div>
                    <label className={labelCls}>
                      {c.reporting} <span className="font-normal text-slate-300">{c.optional}</span>
                      <input className={input} value={f.current_reporting} onChange={set('current_reporting')} maxLength={500} placeholder={c.reportingPh} />
                    </label>
                    <div>
                      <p className={labelCls}>{c.visibility}</p>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row" role="radiogroup">
                        {VISIBILITY_PREFS.map((v) => (
                          <label
                            key={v.code}
                            className={`flex min-h-[44px] flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${
                              f.visibility_pref === v.code ? 'border-emerald-400 bg-emerald-400/10 text-white' : 'border-slate-500 text-slate-100'
                            }`}
                          >
                            <input
                              type="radio"
                              name="visibility_pref"
                              value={v.code}
                              checked={f.visibility_pref === v.code}
                              onChange={set('visibility_pref')}
                              className="accent-emerald-400"
                            />
                            {v[locale]}
                          </label>
                        ))}
                      </div>
                      <p className="mt-2 text-sm text-slate-200">{c.visibilityNote}</p>
                      {err('visibility_pref')}
                    </div>
                    {mode === 'proposal' ? (
                      <label className={labelCls}>
                        {c.plan}
                        <select className={input} value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
                          {(['pilot', 'anual', 'continua', 'sello'] as const).map((p) => (
                            <option key={p} value={p}>
                              {c.plans[p]}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </fieldset>
                ) : null}

                <fieldset className="space-y-4 rounded-2xl border border-[#2d3748] bg-[#1a2029] p-5">
                  <legend className="px-2 text-base font-semibold text-emerald-300">{c.whoTitle}</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {text('company_name', c.company, { max: 200, auto: 'organization' })}
                    {text('contact_name', c.contact, { max: 200, auto: 'name' })}
                    {text('cargo', mode === 'call' ? `${c.cargo} ${c.optional}` : c.cargo, { max: 120, auto: 'organization-title' })}
                    {text('email', c.email, { type: 'email', max: 320, auto: 'email' })}
                    {text('phone', mode === 'pilot' ? c.phone : `${c.phone} ${c.optional}`, { type: 'tel', max: 40, auto: 'tel' })}
                  </div>
                  {mode === 'call' ? (
                    <label className={labelCls}>
                      {c.reporting} <span className="font-normal text-slate-300">{c.optional}</span>
                      <input className={input} value={f.current_reporting} onChange={set('current_reporting')} maxLength={500} placeholder={c.reportingPh} />
                    </label>
                  ) : null}
                  {/* With a calendar, the free-text "times" field is replaced by the booking link above. */}
                  {mode === 'call' && props.bookingUrl ? null : (
                  <label className={labelCls}>
                    {mode === 'call' ? c.callMsg : c.message}
                    <textarea
                      className={`${input} min-h-[80px]`}
                      value={f.message}
                      onChange={set('message')}
                      maxLength={2000}
                      placeholder={mode === 'call' ? c.callMsgPh : undefined}
                    />
                  </label>
                  )}
                </fieldset>

                {mode === 'pilot' ? (
                  <fieldset className="space-y-4 rounded-2xl border border-[#2d3748] bg-[#1a2029] p-5">
                    <legend className="px-2 text-base font-semibold text-emerald-300">{c.fiscal}</legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {text('rfc', c.rfc, { ph: c.rfcPh, max: 13 })}
                      {text('cp_fiscal', c.cp, { ph: c.cpPh, max: 5, auto: 'postal-code' })}
                      <div className="sm:col-span-2">{text('razon_social', c.razon, { max: 300 })}</div>
                      {select('regimen_fiscal', c.regimen, REGIMENES_FISCALES, true)}
                      {select('uso_cfdi', c.uso, USOS_CFDI, true)}
                    </div>
                    <p className="text-sm text-slate-200">{c.fiscalNote}</p>
                  </fieldset>
                ) : null}

                {formError ? <p className="text-sm text-red-300">{formError}</p> : null}

                <div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-base font-semibold text-[#0f1419] hover:bg-emerald-300 disabled:opacity-60 sm:w-auto"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {mode === 'pilot'
                      ? `${props.speiEnabled ? c.payOr : c.submit.pilot} · ${fmt(PILOT_BREAKDOWN.total)} MXN`
                      : c.submit[mode]}
                  </button>
                  {mode === 'pilot' ? <p className="mt-2 text-sm text-slate-200">{props.speiEnabled ? c.spei : c.cardOnly}</p> : null}
                  {mode === 'call' ? (
                    <p className="mt-3 text-sm text-slate-200">
                      {c.mailto}{' '}
                      <a href={`mailto:${ORG_CONTACT_EMAIL}`} className="font-semibold text-emerald-300 hover:underline">
                        {ORG_CONTACT_EMAIL}
                      </a>
                    </p>
                  ) : null}
                </div>
              </form>
            </>
          )}
        </div>

        <aside className="h-fit space-y-5 rounded-2xl border border-emerald-400/50 bg-[#1a2029] p-5 lg:sticky lg:top-24">
          <div>
            <h2 className="font-semibold text-white">{c.summary}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-200">{c.subtotal}</dt>
                <dd className="text-white">{fmt(PILOT_BREAKDOWN.subtotal)} MXN</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-200">{c.iva}</dt>
                <dd className="text-white">{fmt(PILOT_BREAKDOWN.iva)}</dd>
              </div>
              <div className="flex justify-between border-t border-[#2d3748] pt-2 font-semibold">
                <dt className="text-white">{c.total}</dt>
                <dd className="text-emerald-300">{fmt(PILOT_BREAKDOWN.total)} MXN</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-slate-200">
              {c.fund}: <span className="font-semibold text-white">{fmt(PILOT_BREAKDOWN.fund)}</span>
            </p>
            <p className="mt-1 text-sm text-slate-200">{c.credit}</p>
          </div>
          <div>
            <h2 className="font-semibold text-white">{c.next}</h2>
            <ol className="mt-3 space-y-3 border-l border-emerald-400/50 pl-4">
              {c.timeline.map(([when, what]) => (
                <li key={when} className="text-sm">
                  <span className="block font-semibold text-emerald-300">{when}</span>
                  <span className="text-slate-100">{what}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  )
}
