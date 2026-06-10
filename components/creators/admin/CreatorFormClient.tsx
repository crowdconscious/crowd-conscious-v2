'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { LogoUpload } from '@/components/ui/LogoUpload'
import {
  CONSCIOUS_VALUE_OPTIONS,
  parseMetadataValues,
  type ConsciousValueKey,
} from '@/lib/locations/conscious-values'
import { CREATOR_CRAFT_FORM_OPTIONS, craftDefForLabel } from '@/lib/creators/crafts'
import type { Json } from '@/types/database'

const LIST_PATH = '/predictions/admin/creators'

const darkInput =
  'mt-1 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
const darkTextarea = darkInput + ' resize-y min-h-[88px]'
const labelClass = 'text-sm font-medium text-gray-300'

export default function CreatorFormClient({ action }: { action: string }) {
  const router = useRouter()
  const isNew = action === 'new'
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [showEnglish, setShowEnglish] = useState(false)
  const [baseMetadata, setBaseMetadata] = useState<Record<string, unknown>>({})

  const [profileHandle, setProfileHandle] = useState('')
  const [profileLabel, setProfileLabel] = useState('')
  const [craftKey, setCraftKey] = useState<string>('chef')
  const [craftOther, setCraftOther] = useState('')
  const [craftOtherEn, setCraftOtherEn] = useState('')
  const [city, setCity] = useState('CDMX')
  const [whyConscious, setWhyConscious] = useState('')
  const [whyConsciousEn, setWhyConsciousEn] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('pending')
  const [featured, setFeatured] = useState(false)
  const [values, setValues] = useState<string[]>([])

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    void (async () => {
      const res = await fetch(`/api/admin/creators/${action}`)
      const json = await res.json()
      if (cancelled || !res.ok || !json.certification) {
        setLoading(false)
        return
      }
      const c = json.certification as {
        why_conscious?: string | null
        why_conscious_en?: string | null
        craft?: string | null
        craft_en?: string | null
        city?: string | null
        cover_image_url?: string | null
        status?: string
        is_featured?: boolean
        metadata?: Json | null
      }
      const p = json.profile as { handle?: string | null; full_name?: string | null } | null
      setProfileLabel(p?.full_name || (p?.handle ? `@${p.handle}` : ''))
      setProfileHandle(p?.handle ?? '')
      const def = craftDefForLabel(c.craft ?? null)
      if (def && def.value !== 'other') {
        setCraftKey(def.value)
      } else if (c.craft) {
        setCraftKey('other')
        setCraftOther(c.craft ?? '')
        setCraftOtherEn(c.craft_en ?? '')
      }
      setCity(c.city ?? 'CDMX')
      setWhyConscious(c.why_conscious ?? '')
      setWhyConsciousEn(c.why_conscious_en ?? '')
      setCoverUrl(c.cover_image_url ?? null)
      setStatus(c.status ?? 'pending')
      setFeatured(Boolean(c.is_featured))
      const meta =
        c.metadata && typeof c.metadata === 'object' && !Array.isArray(c.metadata)
          ? { ...(c.metadata as Record<string, unknown>) }
          : {}
      setBaseMetadata(meta)
      setValues(parseMetadataValues(c.metadata))
      if ((c.why_conscious_en ?? '').trim()) setShowEnglish(true)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [action, isNew])

  const toggleValue = (key: ConsciousValueKey) => {
    setValues((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const submit = async () => {
    if (isNew && !profileHandle.trim()) {
      alert('El handle del creador es obligatorio')
      return
    }
    if (!whyConscious.trim()) {
      alert('Why Conscious (ES) es obligatorio')
      return
    }
    const craftDef = CREATOR_CRAFT_FORM_OPTIONS.find((c) => c.value === craftKey)
    const isOther = craftKey === 'other'
    if (isOther && !craftOther.trim()) {
      alert('Especifica el oficio (ES)')
      return
    }
    setSaving(true)
    try {
      const metadataPayload = {
        ...baseMetadata,
        values: values.filter(Boolean),
      }
      const body: Record<string, unknown> = {
        craft: isOther ? craftOther.trim() : (craftDef?.label.es ?? null),
        craft_en: isOther ? craftOtherEn.trim() || null : (craftDef?.label.en ?? null),
        city,
        why_conscious: whyConscious.trim(),
        why_conscious_en: whyConsciousEn || null,
        cover_image_url: coverUrl,
        status,
        is_featured: featured,
        metadata: metadataPayload,
      }
      if (isNew) body.profile_handle = profileHandle.trim()

      const res = isNew
        ? await fetch('/api/admin/creators', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/admin/creators/${action}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || 'Error')
        return
      }
      router.push(LIST_PATH)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-gray-400">Cargando…</p>
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-white">
        {isNew ? 'Nueva certificación de creador' : `Editar certificación${profileLabel ? ` — ${profileLabel}` : ''}`}
      </h1>

      {/* GROUP 1 — Identity (profiles row is the identity; we only link to it) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Identidad</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelClass}>Handle del creador *</span>
            <input
              value={profileHandle}
              onChange={(e) => setProfileHandle(e.target.value)}
              placeholder="handle de su cuenta de creador"
              disabled={!isNew}
              className={`${darkInput} ${!isNew ? 'opacity-60' : ''}`}
            />
            {isNew ? (
              <span className="mt-1 block text-xs text-slate-500">
                Debe existir como cuenta de creador (profiles.handle). La identidad vive en el
                perfil; aquí sólo se certifica.
              </span>
            ) : null}
          </label>
          <label className="block">
            <span className={labelClass}>Oficio *</span>
            <select value={craftKey} onChange={(e) => setCraftKey(e.target.value)} className={darkInput}>
              {CREATOR_CRAFT_FORM_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label.es}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>City *</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={darkInput} />
          </label>
          {craftKey === 'other' ? (
            <>
              <label className="block">
                <span className={labelClass}>Oficio (ES) *</span>
                <input
                  value={craftOther}
                  onChange={(e) => setCraftOther(e.target.value)}
                  className={darkInput}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Craft (EN)</span>
                <input
                  value={craftOtherEn}
                  onChange={(e) => setCraftOtherEn(e.target.value)}
                  className={darkInput}
                />
              </label>
            </>
          ) : null}
        </div>
      </section>

      {/* GROUP 2 — Why Conscious + values */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Por qué es Conscious</h2>
        <label className="block">
          <span className={labelClass}>Why Conscious (ES) *</span>
          <textarea
            value={whyConscious}
            onChange={(e) => setWhyConscious(e.target.value)}
            rows={4}
            className={darkTextarea}
            placeholder="Describe por qué esta persona es un Creador Consciente…"
          />
        </label>

        <button
          type="button"
          onClick={() => setShowEnglish(!showEnglish)}
          className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${showEnglish ? 'rotate-90' : ''}`} />
          {showEnglish ? 'Hide' : 'Add'} English translation
        </button>
        {showEnglish ? (
          <label className="block">
            <span className={labelClass}>Why Conscious (EN)</span>
            <textarea
              value={whyConsciousEn}
              onChange={(e) => setWhyConsciousEn(e.target.value)}
              rows={3}
              className={darkTextarea}
            />
          </label>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Conscious Values — select all that apply
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CONSCIOUS_VALUE_OPTIONS.map((v) => {
              const isSelected = values.includes(v.key)
              const Icon = v.icon
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => toggleValue(v.key)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                      : 'border-[#2d3748] bg-[#0f1419] text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-gray-500'}`} />
                  <span className="leading-tight">{v.label.es}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* GROUP 3 — Images */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Images</h2>
        <LogoUpload
          label="Cover image"
          storageFolder="creators"
          currentLogoUrl={coverUrl}
          onUpload={(url) => setCoverUrl(url)}
          onClear={() => setCoverUrl(null)}
        />
      </section>

      {/* GROUP 4 — Settings */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <label className="block">
          <span className={labelClass}>Status *</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={darkInput}>
            <option value="pending">pending</option>
            <option value="active">active</option>
            <option value="under_review">under_review</option>
            <option value="suspended">suspended</option>
            <option value="revoked">revoked</option>
          </select>
          <span className="mt-1 block text-xs text-slate-500">
            active publica la tarjeta y crea la votación de la comunidad. El sello Certificado se
            otorga con el botón Certificar en la lista.
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="rounded border-[#2d3748] bg-[#0f1419] text-emerald-500"
          />
          <span className="text-sm text-gray-300">Featured</span>
        </label>
      </section>

      <button
        type="button"
        disabled={saving}
        onClick={() => void submit()}
        className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {saving ? '…' : isNew && status === 'active' ? 'Crear y lanzar votación' : 'Guardar'}
      </button>
    </div>
  )
}
