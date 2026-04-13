'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogoUpload } from '@/components/ui/LogoUpload'
import {
  LOCATION_CATEGORY_ADMIN_LABEL_ES,
  LOCATION_CATEGORY_FORM_OPTIONS,
} from '@/lib/locations/categories'

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

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
      router.push('/admin/locations')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-slate-600">Cargando…</p>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{isNew ? 'Nueva ubicación' : 'Editar ubicación'}</h1>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Name *</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={onNameBlur}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Slug *</span>
        <input
          value={slug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Category *</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          {LOCATION_CATEGORY_FORM_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {LOCATION_CATEGORY_ADMIN_LABEL_ES[c.value] ?? c.value}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">City *</span>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Neighborhood</span>
        <input
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Address</span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Why Conscious (ES) *</span>
        <input
          value={whyConscious}
          onChange={(e) => setWhyConscious(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Why Conscious (EN)</span>
        <input
          value={whyConsciousEn}
          onChange={(e) => setWhyConsciousEn(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Description (ES)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Description (EN)</span>
        <textarea
          value={descriptionEn}
          onChange={(e) => setDescriptionEn(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">User benefits (ES)</span>
        <input
          value={userBenefits}
          onChange={(e) => setUserBenefits(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">User benefits (EN)</span>
        <input
          value={userBenefitsEn}
          onChange={(e) => setUserBenefitsEn(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Instagram</span>
        <input
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@labikina.mx"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Website URL</span>
        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Contact email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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
        <span className="text-sm font-medium text-slate-700">Status *</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="pending">pending</option>
          <option value="active">active</option>
          <option value="under_review">under_review</option>
          <option value="suspended">suspended</option>
          <option value="revoked">revoked</option>
        </select>
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        <span className="text-sm text-slate-700">Featured</span>
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
