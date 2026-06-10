'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'
import { CreatorCard, type CreatorCardRow } from '@/components/creators/CreatorCard'

/**
 * "Creadores Conscientes" grid for the /creators landing, plus the public
 * nomination entry point. Nomination flow mirrors the modal on
 * components/locations/LocationsPage (→ conscious_inbox via the API).
 */
export default function CreatorsDirectorySection({
  creators,
  locale,
}: {
  creators: CreatorCardRow[]
  locale: CreatorLocale
}) {
  const t = getCreatorCopy(locale)
  const [nominateOpen, setNominateOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    craft: '',
    why: '',
    instagram: '',
    submitter_email: '',
  })
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  const submitNomination = async () => {
    if (!form.name.trim() || !form.craft.trim() || !form.why.trim()) {
      setBanner(t.nominateRequired)
      return
    }
    setBusy(true)
    setBanner(null)
    try {
      const res = await fetch('/api/creators/nominate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          craft: form.craft.trim(),
          why: form.why.trim(),
          instagram: form.instagram.trim() || undefined,
          submitter_email: form.submitter_email.trim() || undefined,
        }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setBanner(j.error ?? t.nominateError)
        return
      }
      setNominateOpen(false)
      setForm({ name: '', craft: '', why: '', instagram: '', submitter_email: '' })
      setBanner(t.nominateSuccess)
    } finally {
      setBusy(false)
    }
  }

  const input =
    'mt-1 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'

  return (
    <section id="creadores-conscientes" className="scroll-mt-24 border-t border-white/10 px-4 py-14">
      <div className="mx-auto max-w-5xl">
        {banner ? (
          <div className="mb-6 rounded-xl border border-emerald-500/40 bg-[#1a2029] px-4 py-3 text-center text-sm text-emerald-200 shadow-lg">
            {banner}
          </div>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.directoryTitle}</h2>
            <p className="mt-2 text-slate-400">{t.directorySubtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setBanner(null)
              setNominateOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
          >
            <UserPlus className="h-4 w-4" />
            {t.directoryNominateCta}
          </button>
        </div>

        {creators.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((c) => (
              <CreatorCard key={c.profile_id} creator={c} locale={locale} />
            ))}
          </div>
        ) : null}

        {nominateOpen ? (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#2d3748] bg-[#1a2029] p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white">{t.nominateTitle}</h3>
              <p className="mt-1 text-sm text-slate-400">{t.nominateSub}</p>

              <div className="mt-4 space-y-3">
                <label className="block text-sm text-slate-300">
                  {t.nominateName}
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className={input}
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  {t.nominateCraft}
                  <input
                    value={form.craft}
                    onChange={(e) => setForm((f) => ({ ...f, craft: e.target.value }))}
                    className={input}
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  {t.nominateWhy}
                  <textarea
                    value={form.why}
                    onChange={(e) => setForm((f) => ({ ...f, why: e.target.value }))}
                    rows={3}
                    className={`${input} resize-y`}
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  {t.nominateInstagram}
                  <input
                    value={form.instagram}
                    onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                    placeholder="@"
                    className={input}
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  {t.nominateEmail}
                  <input
                    type="email"
                    value={form.submitter_email}
                    onChange={(e) => setForm((f) => ({ ...f, submitter_email: e.target.value }))}
                    className={input}
                  />
                </label>
              </div>

              {banner ? <p className="mt-3 text-center text-sm text-red-400">{banner}</p> : null}

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setNominateOpen(false)}
                  className="flex-1 rounded-lg border border-[#2d3748] py-2.5 text-sm text-gray-400"
                >
                  {t.nominateCancel}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submitNomination()}
                  className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {t.nominateSend}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
