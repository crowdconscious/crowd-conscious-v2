'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogoUpload } from '@/components/ui/LogoUpload'
import {
  LOCATION_CATEGORY_ADMIN_LABEL_ES,
  LOCATION_CATEGORY_FORM_OPTIONS,
} from '@/lib/locations/categories'

const LIST_PATH = '/predictions/admin/locations'

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const inputClass =
  'mt-1 w-full rounded-lg border border-cc-border bg-cc-card px-3 py-2 text-cc-text-primary placeholder:text-cc-text-muted focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20'
const labelClass = 'text-sm font-medium text-cc-text-secondary'

export default function LocationFormClient({ action }: { action: string }) {
  const router = useRouter()
  const isNew = action === 'new'
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

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
      const l = json.location
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
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [action, isNew])

  const onNameBlur = () => {
    if (!slugTouched && name) setSlug(slugify(name))
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
      if (isNew && status === 'active') {
        alert('Ubicación creada. Mercado de votación activo.')
      }
      router.push(LIST_PATH)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-cc-text-secondary">Cargando…</p>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">{isNew ? 'Nueva ubicación' : 'Editar ubicación'}</h1>

      <label className="block">
        <span className={labelClass}>Name *</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={onNameBlur}
          className={inputClass}
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
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Category *</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
        >
          {LOCATION_CATEGORY_FORM_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {LOCATION_CATEGORY_ADMIN_LABEL_ES[c.value] ?? c.value}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>City *</span>
        <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>Neighborhood</span>
        <input
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Address</span>
        <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>Why Conscious (ES) *</span>
        <input
          value={whyConscious}
          onChange={(e) => setWhyConscious(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Why Conscious (EN)</span>
        <input
          value={whyConsciousEn}
          onChange={(e) => setWhyConsciousEn(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Description (ES)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Description (EN)</span>
        <textarea
          value={descriptionEn}
          onChange={(e) => setDescriptionEn(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>User benefits (ES)</span>
        <input
          value={userBenefits}
          onChange={(e) => setUserBenefits(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>User benefits (EN)</span>
        <input
          value={userBenefitsEn}
          onChange={(e) => setUserBenefitsEn(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Instagram</span>
        <input
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@labikina.mx"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Website URL</span>
        <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>Contact email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>

      <div>
        <LogoUpload
          label="Cover image"
          storageFolder="locations"
          currentLogoUrl={coverUrl}
          onUpload={(url) => setCoverUrl(url)}
          onClear={() => setCoverUrl(null)}
        />
      </div>

      <div>
        <LogoUpload
          label="Logo"
          storageFolder="locations"
          currentLogoUrl={logoUrl}
          onUpload={(url) => setLogoUrl(url)}
          onClear={() => setLogoUrl(null)}
        />
      </div>

      <label className="block">
        <span className={labelClass}>Status *</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={inputClass}
        >
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
          className="rounded border-cc-border bg-cc-card text-emerald-500"
        />
        <span className="text-sm text-cc-text-secondary">Featured</span>
      </label>

      <button
        type="button"
        disabled={saving}
        onClick={() => void submit()}
        className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {saving ? '…' : 'Guardar'}
      </button>
    </div>
  )
}
