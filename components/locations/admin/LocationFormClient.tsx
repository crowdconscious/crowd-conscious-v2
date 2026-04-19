'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { LogoUpload } from '@/components/ui/LogoUpload'
import {
  LOCATION_CATEGORY_ADMIN_LABEL_ES,
  LOCATION_CATEGORY_FORM_OPTIONS,
} from '@/lib/locations/categories'
import { CONSCIOUS_VALUE_OPTIONS, parseMetadataValues, type ConsciousValueKey } from '@/lib/locations/conscious-values'
import { slugifyLocationName } from '@/lib/locations/slug'
import type { Json } from '@/types/database'
import { LocationCreatedShareCard } from './LocationCreatedShareCard'

const LIST_PATH = '/predictions/admin/locations'

const darkInput =
  'mt-1 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
const darkTextarea = darkInput + ' resize-y min-h-[88px]'
const labelClass = 'text-sm font-medium text-gray-300'

const slugify = slugifyLocationName

export default function LocationFormClient({ action }: { action: string }) {
  const router = useRouter()
  const isNew = action === 'new'
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [showEnglish, setShowEnglish] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [baseMetadata, setBaseMetadata] = useState<Record<string, unknown>>({})
  const [shareCard, setShareCard] = useState<{
    name: string
    slug: string
    marketCreated: boolean
  } | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [category, setCategory] = useState<string>('restaurant')
  const [city, setCity] = useState('CDMX')
  const [neighborhood, setNeighborhood] = useState('')
  const [address, setAddress] = useState('')
  const [whyConscious, setWhyConscious] = useState('')
  const [whyConsciousEn, setWhyConsciousEn] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [userBenefits, setUserBenefits] = useState('')
  const [userBenefitsEn, setUserBenefitsEn] = useState('')
  const [instagram, setInstagram] = useState('')
  const [website, setWebsite] = useState('')
  const [email, setEmail] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('pending')
  const [featured, setFeatured] = useState(false)
  const [values, setValues] = useState<string[]>([])

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    void (async () => {
      const res = await fetch(`/api/admin/locations/${action}`)
      const json = await res.json()
      if (cancelled || !res.ok || !json.location) {
        setLoading(false)
        return
      }
      const l = json.location as {
        name?: string
        slug?: string
        category?: string
        city?: string
        neighborhood?: string | null
        address?: string | null
        why_conscious?: string | null
        why_conscious_en?: string | null
        description?: string | null
        description_en?: string | null
        user_benefits?: string | null
        user_benefits_en?: string | null
        instagram_handle?: string | null
        website_url?: string | null
        contact_email?: string | null
        cover_image_url?: string | null
        logo_url?: string | null
        status?: string
        is_featured?: boolean
        metadata?: Json | null
      }
      setName(l.name ?? '')
      setSlug(l.slug ?? '')
      setSlugTouched(true)
      setCategory(l.category ?? 'restaurant')
      setCity(l.city ?? 'CDMX')
      setNeighborhood(l.neighborhood ?? '')
      setAddress(l.address ?? '')
      setWhyConscious(l.why_conscious ?? '')
      setWhyConsciousEn(l.why_conscious_en ?? '')
      setDescription(l.description ?? '')
      setDescriptionEn(l.description_en ?? '')
      setUserBenefits(l.user_benefits ?? '')
      setUserBenefitsEn(l.user_benefits_en ?? '')
      setInstagram(l.instagram_handle ?? '')
      setWebsite(l.website_url ?? '')
      setEmail(l.contact_email ?? '')
      setCoverUrl(l.cover_image_url ?? null)
      setLogoUrl(l.logo_url ?? null)
      setStatus(l.status ?? 'pending')
      setFeatured(Boolean(l.is_featured))
      const meta =
        l.metadata && typeof l.metadata === 'object' && !Array.isArray(l.metadata)
          ? { ...(l.metadata as Record<string, unknown>) }
          : {}
      setBaseMetadata(meta)
      setValues(parseMetadataValues(l.metadata))
      const hasEn = Boolean(
        (l.why_conscious_en ?? '').trim() ||
          (l.description_en ?? '').trim() ||
          (l.user_benefits_en ?? '').trim()
      )
      if (hasEn) setShowEnglish(true)
      const hasDetails = Boolean(
        (l.description ?? '').trim() ||
          (l.description_en ?? '').trim() ||
          (l.user_benefits ?? '').trim() ||
          (l.user_benefits_en ?? '').trim() ||
          (l.address ?? '').trim()
      )
      if (hasDetails) setShowDetails(true)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [action, isNew])

  const onNameBlur = () => {
    if (!slugTouched && name) setSlug(slugify(name))
  }

  const toggleValue = (key: ConsciousValueKey) => {
    setValues((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const submit = async () => {
    if (!name.trim() || !slug.trim()) {
      alert('Nombre y slug son obligatorios')
      return
    }
    if (!whyConscious.trim()) {
      alert('Why Conscious (ES) es obligatorio')
      return
    }
    setSaving(true)
    try {
      const metadataPayload = {
        ...baseMetadata,
        values: values.filter(Boolean),
      }
      const body = {
        name: name.trim(),
        slug: slug.trim(),
        category,
        city,
        neighborhood: neighborhood || null,
        address: address || null,
        why_conscious: whyConscious.trim(),
        why_conscious_en: whyConsciousEn || null,
        description: description || null,
        description_en: descriptionEn || null,
        user_benefits: userBenefits || null,
        user_benefits_en: userBenefitsEn || null,
        instagram_handle: instagram || null,
        website_url: website || null,
        contact_email: email || null,
        cover_image_url: coverUrl,
        logo_url: logoUrl,
        status,
        is_featured: featured,
        metadata: metadataPayload,
      }
      const res = isNew
        ? await fetch('/api/admin/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/admin/locations/${action}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || 'Error')
        return
      }
      if (isNew) {
        const createdSlug = (json.location?.slug as string | undefined) ?? slug.trim()
        const createdName = (json.location?.name as string | undefined) ?? name.trim()
        setShareCard({
          name: createdName,
          slug: createdSlug,
          marketCreated: status === 'active' && Boolean(json.market?.id),
        })
        return
      }
      router.push(LIST_PATH)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const closeShareCard = () => {
    setShareCard(null)
    router.push(LIST_PATH)
    router.refresh()
  }

  if (loading) {
    return <p className="text-gray-400">Cargando…</p>
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-white">{isNew ? 'Nueva ubicación' : 'Editar ubicación'}</h1>

      {/* GROUP 1 — Identity */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Identidad</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelClass}>Name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={onNameBlur}
              className={darkInput}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Slug *</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              className={darkInput}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Category *</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={darkInput}>
              {LOCATION_CATEGORY_FORM_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {LOCATION_CATEGORY_ADMIN_LABEL_ES[c.value] ?? c.value}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>City *</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={darkInput} />
          </label>
          <label className="block">
            <span className={labelClass}>Neighborhood</span>
            <input
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className={darkInput}
            />
          </label>
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
            placeholder="Describe por qué este lugar es Conscious…"
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

      {/* GROUP 3 — Details (collapsed) */}
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex w-full items-center justify-between rounded-lg border border-[#2d3748] bg-[#1a2029] px-4 py-3 text-left text-white"
        >
          <span className="font-semibold">Details</span>
          <ChevronRight className={`h-5 w-5 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
        </button>
        {showDetails ? (
          <div className="space-y-4 pt-2">
            <label className="block">
              <span className={labelClass}>Description (ES)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={darkTextarea}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Description (EN)</span>
              <textarea
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                rows={3}
                className={darkTextarea}
              />
            </label>
            <label className="block">
              <span className={labelClass}>User benefits (ES)</span>
              <input
                value={userBenefits}
                onChange={(e) => setUserBenefits(e.target.value)}
                className={darkInput}
              />
            </label>
            <label className="block">
              <span className={labelClass}>User benefits (EN)</span>
              <input
                value={userBenefitsEn}
                onChange={(e) => setUserBenefitsEn(e.target.value)}
                className={darkInput}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Address</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={darkInput} />
            </label>
          </div>
        ) : null}
      </section>

      {/* GROUP 4 — Contact */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Contact & social</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Instagram</span>
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@labikina.mx"
              className={darkInput}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Website URL</span>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className={darkInput} />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClass}>Contact email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={darkInput} />
          </label>
        </div>
      </section>

      {/* GROUP 5 — Images */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Images</h2>
        <LogoUpload
          label="Cover image"
          storageFolder="locations"
          currentLogoUrl={coverUrl}
          onUpload={(url) => setCoverUrl(url)}
          onClear={() => setCoverUrl(null)}
        />
        <LogoUpload
          label="Logo"
          storageFolder="locations"
          currentLogoUrl={logoUrl}
          onUpload={(url) => setLogoUrl(url)}
          onClear={() => setLogoUrl(null)}
        />
      </section>

      {/* GROUP 6 — Settings */}
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
        {saving ? '…' : isNew && status === 'active' ? 'Crear y lanzar mercado' : 'Guardar'}
      </button>

      {shareCard && (
        <LocationCreatedShareCard
          isOpen
          onClose={closeShareCard}
          name={shareCard.name}
          slug={shareCard.slug}
          marketCreated={shareCard.marketCreated}
        />
      )}
    </div>
  )
}
