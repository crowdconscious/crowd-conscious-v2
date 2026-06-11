'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, MapPin } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { canClaimByEmail } from '@/lib/perks/location-owner'

type LocationInfo = {
  slug: string
  name: string
  contact_email: string | null
  owner_profile_id: string | null
  status: string
}

export default function LocationClaimClient({
  location,
  userEmail,
  isAuthed,
}: {
  location: LocationInfo
  userEmail: string | null
  isAuthed: boolean
}) {
  const { language } = useLanguage()
  const locale = language
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claimed, setClaimed] = useState(Boolean(location.owner_profile_id))

  const eligible = canClaimByEmail(location, userEmail)
  const alreadyOwned = Boolean(location.owner_profile_id)

  const claim = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/location/${encodeURIComponent(location.slug)}/claim`, {
        method: 'POST',
      })
      const json = (await res.json()) as { error?: string; success?: boolean }
      if (!res.ok) {
        setError(json.error ?? (locale === 'es' ? 'No se pudo reclamar' : 'Claim failed'))
        return
      }
      setClaimed(true)
      router.push(`/dashboard/location/${encodeURIComponent(location.slug)}`)
    } catch {
      setError(locale === 'es' ? 'Error de red' : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const copy = {
    title: locale === 'es' ? 'Reclamar este lugar' : 'Claim this location',
    lede:
      locale === 'es'
        ? 'Si eres el responsable del establecimiento, reclama tu perfil para administrar Conscious Perks.'
        : 'If you manage this venue, claim your profile to manage Conscious Perks.',
    emailMatch:
      locale === 'es'
        ? `Tu correo debe coincidir con el contacto del lugar (${location.contact_email ?? '—'}).`
        : `Your email must match the location contact (${location.contact_email ?? '—'}).`,
    claimBtn: locale === 'es' ? 'Reclamar lugar' : 'Claim location',
    login: locale === 'es' ? 'Iniciar sesión para reclamar' : 'Sign in to claim',
    dashboard: locale === 'es' ? 'Ir al panel de perks' : 'Go to perks dashboard',
    already: locale === 'es' ? 'Este lugar ya tiene dueño registrado.' : 'This location is already claimed.',
    success: locale === 'es' ? 'Lugar reclamado correctamente.' : 'Location claimed successfully.',
    notActive:
      locale === 'es'
        ? 'Solo lugares certificados activos pueden publicar perks.'
        : 'Only active certified locations can publish perks.',
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-8 text-slate-100">
        <div className="mb-6 flex items-start gap-3">
          <MapPin className="mt-1 h-6 w-6 text-emerald-400" aria-hidden />
          <div>
            <h1 className="text-2xl font-bold text-white">{location.name}</h1>
            <p className="text-sm text-slate-400">{copy.title}</p>
          </div>
        </div>

        <p className="mb-4 text-slate-300">{copy.lede}</p>
        <p className="mb-6 text-sm text-slate-500">{copy.emailMatch}</p>

        {error ? (
          <p className="mb-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        {claimed ? (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
              {copy.success}
            </p>
            <Link
              href={`/dashboard/location/${encodeURIComponent(location.slug)}`}
              className="inline-block rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
            >
              {copy.dashboard}
            </Link>
          </div>
        ) : alreadyOwned ? (
          <p className="text-amber-400/90">{copy.already}</p>
        ) : !isAuthed ? (
          <Link
            href={`/login?redirectTo=${encodeURIComponent(`/locations/${location.slug}/claim`)}`}
            className="inline-block rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
          >
            {copy.login}
          </Link>
        ) : eligible ? (
          <button
            type="button"
            disabled={loading || location.status !== 'active'}
            onClick={() => void claim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.claimBtn}
          </button>
        ) : (
          <p className="text-amber-400/90">
            {locale === 'es'
              ? 'Tu correo no coincide con el contacto de este lugar.'
              : 'Your email does not match this location contact.'}
          </p>
        )}

        {location.status !== 'active' ? (
          <p className="mt-4 text-sm text-slate-500">{copy.notActive}</p>
        ) : null}

        <Link
          href={`/locations/${encodeURIComponent(location.slug)}`}
          className="mt-8 inline-block text-sm text-emerald-400 hover:text-emerald-300"
        >
          {locale === 'es' ? 'Volver al lugar' : 'Back to location'}
        </Link>
      </div>
    </div>
  )
}
