'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { CP_REGEX, REGIMENES_FISCALES, USOS_CFDI, isValidRfcFormat } from '@/lib/organizaciones/fiscal'
import { ORG_PRICES, PILOT_BREAKDOWN, formatMxn } from '@/lib/organizaciones/pricing'

type Mode = 'pilot' | 'proposal'
type Plan = 'pilot' | 'anual' | 'continua' | 'sello'
type Locale = 'es' | 'en'

const C = {
  es: {
    title: 'Contratar lectura piloto privada',
    titleProposal: 'Solicitar propuesta',
    pay: 'Pagar con tarjeta',
    payOr: 'Pagar con tarjeta o transferencia SPEI',
    tabPilot: 'Pagar piloto ahora',
    tabProposal: 'Prefiero propuesta / orden de compra',
    company: 'Nombre de la empresa',
    contact: 'Nombre de contacto',
    email: 'Correo',
    phone: 'Teléfono',
    fiscal: 'Datos fiscales para su CFDI',
    rfc: 'RFC',
    razon: 'Razón social (como aparece en su constancia)',
    regimen: 'Régimen fiscal',
    cp: 'Código postal fiscal',
    uso: 'Uso de CFDI',
    select: 'Seleccione…',
    plan: 'Plan de interés',
    plans: { pilot: 'Lectura piloto privada', anual: 'Lectura anual', continua: 'Escucha continua', sello: 'Escucha continua + Sello verificado' },
    message: 'Mensaje (opcional)',
    optional: '(opcional)',
    subtotal: 'Lectura piloto privada',
    iva: 'IVA 16%',
    total: 'Total',
    fund: 'Al Fondo Consciente (20% antes de IVA)',
    credit: '100% abonable a Escucha continua si la contrata dentro de 90 días.',
    cardOnly:
      'Por ahora el pago en línea es solo con tarjeta. Si prefiere transferencia SPEI u orden de compra, elija «Prefiero propuesta» y le enviamos los datos.',
    spei: 'Puede pagar con tarjeta o con transferencia SPEI (Stripe le dará una CLABE).',
    cfdiNote: 'Emitimos su CFDI 4.0 por separado con estos datos. El recibo que le enviamos al pagar no es un comprobante fiscal.',
    submitProposal: 'Enviar solicitud',
    errRfc: 'RFC con formato inválido (12 caracteres para persona moral, 13 para persona física).',
    errCp: 'El código postal debe tener 5 dígitos.',
    errRequired: 'Campo obligatorio.',
    errGeneric: 'No pudimos procesar la solicitud. Intente de nuevo o escriba a francisco@crowdconscious.app.',
    cancelled: 'El pago se canceló. Sus datos no se cobraron; puede intentarlo de nuevo.',
    proposalDone: 'Gracias. Recibimos su solicitud y le escribimos en 1 a 2 días hábiles.',
    back: 'Volver a organizaciones',
    perMonth: '/mes',
    perYear: '/año',
  },
  en: {
    title: 'Buy the private pilot reading',
    titleProposal: 'Request a proposal',
    pay: 'Pay by card',
    payOr: 'Pay by card or SPEI bank transfer',
    tabPilot: 'Pay for the pilot now',
    tabProposal: 'I prefer a proposal / purchase order',
    company: 'Company name',
    contact: 'Contact name',
    email: 'Email',
    phone: 'Phone',
    fiscal: 'Tax data for your CFDI invoice',
    rfc: 'RFC (Mexican tax ID)',
    razon: 'Legal name (razón social)',
    regimen: 'Tax regime',
    cp: 'Tax postal code',
    uso: 'CFDI use',
    select: 'Select…',
    plan: 'Plan of interest',
    plans: { pilot: 'Private pilot reading', anual: 'Annual reading', continua: 'Continuous listening', sello: 'Continuous listening + Verified Seal' },
    message: 'Message (optional)',
    optional: '(optional)',
    subtotal: 'Private pilot reading',
    iva: 'VAT (IVA) 16%',
    total: 'Total',
    fund: 'To the Conscious Fund (20% before VAT)',
    credit: '100% credited toward Continuous listening if you sign within 90 days.',
    cardOnly:
      'For now online payment is card only. If you prefer a SPEI transfer or purchase order, choose "I prefer a proposal" and we will send the details.',
    spei: 'You can pay by card or SPEI bank transfer (Stripe will give you a CLABE).',
    cfdiNote: 'We issue your CFDI 4.0 separately with this data. The receipt we email on payment is not a tax invoice.',
    submitProposal: 'Send request',
    errRfc: 'Invalid RFC format (12 characters for companies, 13 for individuals).',
    errCp: 'Postal code must be 5 digits.',
    errRequired: 'Required field.',
    errGeneric: 'We could not process the request. Try again or write to francisco@crowdconscious.app.',
    cancelled: 'Payment was cancelled. You were not charged; you can try again.',
    proposalDone: 'Thank you. We received your request and will reply within 1 to 2 business days.',
    back: 'Back to organizations',
    perMonth: '/mo',
    perYear: '/yr',
  },
} as const

const input =
  'mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500'
const labelCls = 'block text-sm font-medium text-slate-300'

type Fields = {
  company_name: string
  contact_name: string
  email: string
  phone: string
  rfc: string
  razon_social: string
  regimen_fiscal: string
  cp_fiscal: string
  uso_cfdi: string
  message: string
}

export default function ContratarForm(props: {
  locale: Locale
  initialMode: Mode
  initialPlan: Plan
  cancelled: boolean
  source: string | null
  speiEnabled: boolean
}) {
  const { locale } = props
  const c = C[locale]
  const fmt = (n: number) => formatMxn(n, locale)
  const [mode, setMode] = useState<Mode>(props.initialMode)
  const [plan, setPlan] = useState<Plan>(props.initialMode === 'proposal' ? props.initialPlan : 'pilot')
  const [f, setF] = useState<Fields>({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    rfc: '',
    razon_social: '',
    regimen_fiscal: '',
    cp_fiscal: '',
    uso_cfdi: 'G03',
    message: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({})
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const isPilot = mode === 'pilot'
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: k === 'rfc' ? e.target.value.toUpperCase() : e.target.value }))

  function validate() {
    const e: Partial<Record<keyof Fields, string>> = {}
    const req: (keyof Fields)[] = ['company_name', 'contact_name', 'email']
    if (isPilot) req.push('phone', 'rfc', 'razon_social', 'regimen_fiscal', 'cp_fiscal', 'uso_cfdi')
    for (const k of req) if (!f[k].trim()) e[k] = c.errRequired
    if (f.rfc.trim() && !isValidRfcFormat(f.rfc)) e.rfc = c.errRfc
    if (f.cp_fiscal.trim() && !CP_REGEX.test(f.cp_fiscal.trim())) e.cp_fiscal = c.errCp
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setFormError(null)
    if (!validate()) return
    setBusy(true)
    try {
      const res = await fetch('/api/organizaciones/contratar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, mode, plan: isPilot ? 'pilot' : plan, locale, source: props.source ?? undefined }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error('request failed')
      if (isPilot && json.data?.url) {
        window.location.href = json.data.url as string
        return
      }
      setDone(true)
    } catch {
      setFormError(c.errGeneric)
    } finally {
      setBusy(false)
    }
  }

  const Field = ({ k, label, type = 'text', placeholder, maxLength }: { k: keyof Fields; label: string; type?: string; placeholder?: string; maxLength?: number }) => (
    <label className={labelCls}>
      {label}
      <input className={input} type={type} value={f[k]} onChange={set(k)} placeholder={placeholder} maxLength={maxLength} aria-invalid={!!errors[k]} />
      {errors[k] ? <span className="mt-1 block text-xs text-red-400">{errors[k]}</span> : null}
    </label>
  )

  return (
    <div className="min-h-screen bg-[#0f1419] px-4 py-10 text-slate-100">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <Link href="/organizaciones" className="text-xs text-slate-500 hover:text-emerald-400">
            ← {c.back}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{isPilot ? c.title : c.titleProposal}</h1>

          <div className="mt-6 flex flex-col gap-2 rounded-xl border border-[#2d3748] bg-[#1a2029] p-1 text-sm sm:flex-row">
            {(['pilot', 'proposal'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setErrors({})
                }}
                className={`min-h-[40px] flex-1 rounded-lg px-3 font-medium ${mode === m ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                {m === 'pilot' ? c.tabPilot : c.tabProposal}
              </button>
            ))}
          </div>

          {props.cancelled ? <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{c.cancelled}</p> : null}

          {done ? (
            <p className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-emerald-200">{c.proposalDone}</p>
          ) : (
            <form onSubmit={submit} noValidate className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {Field({ k: 'company_name', label: c.company, maxLength: 200 })}
                {Field({ k: 'contact_name', label: c.contact, maxLength: 200 })}
                {Field({ k: 'email', label: c.email, type: 'email', maxLength: 320 })}
                {Field({ k: 'phone', label: isPilot ? c.phone : `${c.phone} ${c.optional}`, type: 'tel', maxLength: 40 })}
              </div>

              {!isPilot ? (
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

              <fieldset className="rounded-2xl border border-[#2d3748] bg-[#1a2029] p-5">
                <legend className="px-2 text-sm font-semibold text-emerald-400">
                  {c.fiscal} {isPilot ? '' : c.optional}
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Field({ k: 'rfc', label: c.rfc, placeholder: 'ABC010101AB1', maxLength: 13 })}
                  {Field({ k: 'cp_fiscal', label: c.cp, placeholder: '06600', maxLength: 5 })}
                  <div className="sm:col-span-2">{Field({ k: 'razon_social', label: c.razon, maxLength: 300 })}</div>
                  <label className={labelCls}>
                    {c.regimen}
                    <select className={input} value={f.regimen_fiscal} onChange={set('regimen_fiscal')}>
                      <option value="">{c.select}</option>
                      {REGIMENES_FISCALES.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.code} · {r[locale]}
                        </option>
                      ))}
                    </select>
                    {errors.regimen_fiscal ? <span className="mt-1 block text-xs text-red-400">{errors.regimen_fiscal}</span> : null}
                  </label>
                  <label className={labelCls}>
                    {c.uso}
                    <select className={input} value={f.uso_cfdi} onChange={set('uso_cfdi')}>
                      {USOS_CFDI.map((u) => (
                        <option key={u.code} value={u.code}>
                          {u.code} · {u[locale]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="mt-3 text-xs text-slate-500">{c.cfdiNote}</p>
              </fieldset>

              <label className={labelCls}>
                {c.message}
                <textarea className={`${input} min-h-[90px]`} value={f.message} onChange={set('message')} maxLength={2000} />
              </label>

              {formError ? <p className="text-sm text-red-400">{formError}</p> : null}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60 sm:w-auto"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isPilot ? `${props.speiEnabled ? c.payOr : c.pay} · ${fmt(PILOT_BREAKDOWN.total)} MXN` : c.submitProposal}
              </button>
              {isPilot ? <p className="text-xs text-slate-500">{props.speiEnabled ? c.spei : c.cardOnly}</p> : null}
            </form>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-emerald-500/40 bg-[#1a2029] p-5 lg:sticky lg:top-28">
          {isPilot ? (
            <>
              <h2 className="font-semibold text-white">{c.subtotal}</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-400">{c.subtotal}</dt>
                  <dd className="text-white">{fmt(PILOT_BREAKDOWN.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">{c.iva}</dt>
                  <dd className="text-white">{fmt(PILOT_BREAKDOWN.iva)}</dd>
                </div>
                <div className="flex justify-between border-t border-[#2d3748] pt-2 font-semibold">
                  <dt className="text-white">{c.total}</dt>
                  <dd className="text-emerald-400">{fmt(PILOT_BREAKDOWN.total)} MXN</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-slate-400">
                {c.fund}: {fmt(PILOT_BREAKDOWN.fund)}
              </p>
              <p className="mt-2 text-xs text-slate-400">{c.credit}</p>
            </>
          ) : (
            <ul className="space-y-2 text-sm text-slate-300">
              <li>{c.plans.pilot}: {fmt(ORG_PRICES.pilot)}</li>
              <li>{c.plans.anual}: {fmt(ORG_PRICES.annual)}{c.perYear}</li>
              <li>{c.plans.continua}: {fmt(ORG_PRICES.continuousMonthly)}{c.perMonth}</li>
              <li>+ Sello: {fmt(ORG_PRICES.selloMonthlyAddon)}{c.perMonth}</li>
              <li className="pt-2 text-xs text-slate-500">MXN + IVA</li>
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}
