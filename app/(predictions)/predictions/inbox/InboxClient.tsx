'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Plus,
  ChevronUp,
  X,
  Link2,
  Globe,
  Building2,
  Briefcase,
  Users,
  Heart,
  Trophy,
  Leaf,
  BarChart3,
  Map,
  Cpu,
  TrendingUp,
  Clapperboard,
  Lightbulb,
  Sparkles,
  Award,
  Archive,
  CheckCircle,
  XCircle,
  ShieldCheck,
  ExternalLink,
  ArchiveRestore,
} from 'lucide-react'
import type { InboxItem } from './page'
import { parseNominationDescription } from '@/lib/inbox/parse-nomination'

const INBOX_TYPES = [
  'market_idea',
  'cause_proposal',
  'ngo_suggestion',
  'general',
  'location_nomination',
] as const

const CATEGORIES = [
  { id: 'pulse', label: 'Pulse', icon: BarChart3 },
  { id: 'world_cup', label: 'World Cup', icon: Trophy },
  { id: 'world', label: 'World', icon: Globe },
  { id: 'government', label: 'Government', icon: Building2 },
  { id: 'geopolitics', label: 'Geopolitics', icon: Map },
  { id: 'sustainability', label: 'Sustainability', icon: Leaf },
  { id: 'technology', label: 'Technology', icon: Cpu },
  { id: 'economy', label: 'Economy', icon: TrendingUp },
  { id: 'corporate', label: 'Corporate', icon: Briefcase },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'cause', label: 'Cause', icon: Heart },
  { id: 'entertainment', label: 'Entertainment', icon: Clapperboard },
] as const

/** Allowed `fund_causes.category` values — must mirror the CHECK constraint in migration 205. */
const FUND_CATEGORIES = [
  { id: 'water', label: 'Water' },
  { id: 'education', label: 'Education' },
  { id: 'environment', label: 'Environment' },
  { id: 'social_justice', label: 'Social Justice' },
  { id: 'health', label: 'Health' },
  { id: 'mobility', label: 'Mobility' },
  { id: 'housing', label: 'Housing' },
  { id: 'hunger', label: 'Hunger' },
  { id: 'culture', label: 'Culture' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'other', label: 'Other' },
] as const

const TYPE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  market_idea: { label: 'Market Idea', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  cause_proposal: { label: 'Cause/NGO', bg: 'bg-pink-500/10', text: 'text-pink-400' },
  ngo_suggestion: { label: 'Cause/NGO', bg: 'bg-pink-500/10', text: 'text-pink-400' },
  /**
   * Sponsor / municipality nominations submitted via the sponsor dashboard
   * (POST /api/inbox/nominate). They live in the same table as consumer
   * noms — same admin actions, same Promote flow — only the badge differs
   * so we can spot brand-sourced suggestions at a glance.
   */
  cause_suggestion_municipal: {
    label: 'Sponsor nomination',
    bg: 'bg-fuchsia-500/10',
    text: 'text-fuchsia-300',
  },
  general: { label: 'General', bg: 'bg-gray-700/50', text: 'text-gray-300' },
  location_nomination: {
    label: 'Location Nomination',
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
  },
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  pending: { label: 'Pending', bg: 'bg-gray-700/50', text: 'text-gray-400' },
  reviewed: { label: 'Reviewed', bg: 'bg-gray-700/50', text: 'text-gray-300' },
  approved: { label: 'Approved', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  rejected: { label: 'Rejected', bg: 'bg-red-500/20', text: 'text-red-400' },
  published: { label: 'Published', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  promoted_to_cause: { label: 'Promoted to Cause', bg: 'bg-amber-500/20', text: 'text-amber-400' },
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

function truncate(str: string | null, max: number): string {
  if (!str) return ''
  if (str.length <= max) return str
  return str.slice(0, max).trim() + '…'
}

interface Props {
  initialItems: InboxItem[]
  isAdmin: boolean
}

interface PromoteFormState {
  name: string
  organization: string
  category: string
  description: string
  website_url: string
}

export function InboxClient({ initialItems, isAdmin }: Props) {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<InboxItem[]>(initialItems)
  const [filter, setFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [voteLoading, setVoteLoading] = useState<string | null>(null)

  // Admin-only state
  const [showArchived, setShowArchived] = useState(false)
  const [adminBusyId, setAdminBusyId] = useState<string | null>(null)
  const [promoteItem, setPromoteItem] = useState<InboxItem | null>(null)
  const [promoteForm, setPromoteForm] = useState<PromoteFormState>({
    name: '',
    organization: '',
    category: 'other',
    description: '',
    website_url: '',
  })
  const [promoteSubmitting, setPromoteSubmitting] = useState(false)
  const [adminError, setAdminError] = useState('')

  // Form state (Submit Idea)
  const [formType, setFormType] = useState<string>('market_idea')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formLinks, setFormLinks] = useState<{ url: string; label: string }[]>([{ url: '', label: '' }])

  const filterTabs = useMemo(
    () => [
      { id: 'all', label: language === 'es' ? 'Todos' : 'All' },
      { id: 'market_idea', label: language === 'es' ? 'Ideas de Pulse' : 'Pulse Ideas' },
      { id: 'causes', label: language === 'es' ? 'Causas' : 'Causes' },
      { id: 'general', label: language === 'es' ? 'General' : 'General' },
      {
        id: 'location_nomination',
        label: language === 'es' ? 'Nominaciones' : 'Nominations',
      },
    ],
    [language]
  )

  const typeOptions = useMemo(
    () => [
      { value: 'market_idea', label: language === 'es' ? 'Idea de Pulse' : 'Pulse Idea' },
      { value: 'cause_proposal', label: language === 'es' ? 'Causa / ONG' : 'Cause/NGO' },
      { value: 'ngo_suggestion', label: language === 'es' ? 'Sugerencia ONG' : 'NGO suggestion' },
      { value: 'general', label: language === 'es' ? 'Sugerencia general' : 'General Suggestion' },
      {
        value: 'location_nomination',
        label: language === 'es' ? 'Nominación de lugar' : 'Location Nomination',
      },
    ],
    [language]
  )

  useEffect(() => {
    const action = searchParams.get('action')
    if (action !== 'submit') return
    const raw = searchParams.get('type') || searchParams.get('category')
    if (raw === 'location_nomination') {
      setFormType('location_nomination')
    } else if (raw && INBOX_TYPES.includes(raw as (typeof INBOX_TYPES)[number])) {
      setFormType(raw)
    }
    setModalOpen(true)
  }, [searchParams])

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('type', filter)
    if (isAdmin && showArchived) params.set('includeArchived', '1')
    const res = await fetch(`/api/predictions/inbox${params.toString() ? '?' + params : ''}`)
    const data = await res.json()
    if (data.items) setItems(data.items)
  }, [filter, isAdmin, showArchived])

  const fetchMyVotes = useCallback(async () => {
    const res = await fetch('/api/predictions/inbox/my-votes')
    const data = await res.json()
    setMyVotes(new Set(data.votes || []))
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    fetchMyVotes()
  }, [fetchMyVotes])

  const handleVote = async (id: string) => {
    setVoteLoading(id)
    try {
      const res = await fetch(`/api/predictions/inbox/${id}/vote`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        if (res.status === 401) {
          // Redirect to login or show message
          return
        }
        console.error(data.error)
        return
      }
      setMyVotes((prev) => {
        const next = new Set(prev)
        if (data.voted) next.add(id)
        else next.delete(id)
        return next
      })
      setItems((prev) =>
        prev
          .map((i) =>
            i.id === id ? { ...i, upvotes: i.upvotes + (data.voted ? 1 : -1) } : i
          )
          .sort((a, b) => b.upvotes - a.upvotes || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      )
    } finally {
      setVoteLoading(null)
    }
  }

  // ---------- Admin actions ----------

  const updateAdminStatus = useCallback(
    async (id: string, status: 'reviewed' | 'approved' | 'rejected') => {
      setAdminBusyId(id)
      setAdminError('')
      try {
        const res = await fetch(`/api/predictions/admin/inbox/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Update failed')
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)))
      } catch (err) {
        setAdminError(err instanceof Error ? err.message : 'Update failed')
      } finally {
        setAdminBusyId(null)
      }
    },
    []
  )

  const archiveItem = useCallback(
    async (id: string, restore: boolean) => {
      setAdminBusyId(id)
      setAdminError('')
      try {
        const res = await fetch('/api/predictions/admin/archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource: 'inbox', id, restore }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Archive failed')
        if (restore) {
          // Restored items stay visible; just clear archived_at locally.
          setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, archived_at: null } : i))
          )
        } else if (showArchived) {
          // Admin is viewing the archived queue — keep the row, mark archived.
          setItems((prev) =>
            prev.map((i) =>
              i.id === id ? { ...i, archived_at: new Date().toISOString() } : i
            )
          )
        } else {
          // Default live view — drop the row from the visible list.
          setItems((prev) => prev.filter((i) => i.id !== id))
        }
      } catch (err) {
        setAdminError(err instanceof Error ? err.message : 'Archive failed')
      } finally {
        setAdminBusyId(null)
      }
    },
    [showArchived]
  )

  const openPromoteModal = (item: InboxItem) => {
    setAdminError('')
    setPromoteItem(item)
    // Sponsor noms encode `Organization`, `Website`, and a `Sponsor account: <id>`
    // stamp inside the description. Pull them apart so the modal pre-fills
    // those fields directly and the description shown to the admin is the
    // *narrative* — not the audit-trail metadata that would otherwise leak
    // straight into fund_causes.description.
    const parsed = parseNominationDescription(item.description)
    // Best link from the inbox row's links[] when description didn't carry a Website line.
    const linkUrl = item.links.find((l) => l.url)?.url ?? null
    setPromoteForm({
      name: item.title,
      organization: parsed.organization ?? '',
      category: 'other',
      description: parsed.narrative || item.description || '',
      website_url: parsed.website_url ?? linkUrl ?? '',
    })
  }

  const handlePromoteToCause = async () => {
    if (!promoteItem) return
    setPromoteSubmitting(true)
    setAdminError('')
    try {
      const res = await fetch(
        `/api/predictions/admin/inbox/${promoteItem.id}/promote-to-cause`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: promoteForm.name.trim(),
            organization: promoteForm.organization.trim(),
            category: promoteForm.category,
            description: promoteForm.description.trim(),
            website_url: promoteForm.website_url.trim() || undefined,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Promote failed')
      setItems((prev) =>
        prev.map((i) =>
          i.id === promoteItem.id ? { ...i, status: 'promoted_to_cause' } : i
        )
      )
      setPromoteItem(null)
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Promote failed')
    } finally {
      setPromoteSubmitting(false)
    }
  }

  // ---------- Submit Idea form ----------

  const addLink = () => setFormLinks((prev) => [...prev, { url: '', label: '' }])
  const removeLink = (idx: number) =>
    setFormLinks((prev) => prev.filter((_, i) => i !== idx))
  const updateLink = (idx: number, field: 'url' | 'label', value: string) =>
    setFormLinks((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    )

  const resetForm = () => {
    setFormType('market_idea')
    setFormTitle('')
    setFormDescription('')
    setFormCategory('')
    setFormLinks([{ url: '', label: '' }])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) return
    setSubmitting(true)
    try {
      const links = formLinks
        .filter((l) => l.url.trim())
        .map((l) => ({ url: l.url.trim(), label: l.label.trim() || l.url }))
      const res = await fetch('/api/predictions/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          category: formCategory || null,
          links,
        }),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
        return
      }
      setModalOpen(false)
      resetForm()
      await fetchItems()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-7 h-7 text-amber-400" />
            Conscious Inbox
          </h1>
          <p className="text-cc-text-secondary mt-1">
            Suggest markets, causes, and ideas. The community decides what matters.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/predictions/admin/inbox"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            Admin review
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Submit Idea
        </button>
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors border ${
                filter === tab.id
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-cc-card border-cc-border text-gray-400 hover:border-cc-border-light hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {isAdmin && (
          <label className="ml-auto flex items-center gap-2 text-gray-400 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-amber-500"
            />
            Show archived &amp; rejected
          </label>
        )}
      </div>

      {isAdmin && adminError && (
        <div className="px-4 py-2 bg-red-500/10 border border-red-500/40 rounded-lg text-red-300 text-sm">
          {adminError}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setModalOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-cc-nav-bg border-l border-cc-border shadow-xl z-50 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-cc-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Submit Idea</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-cc-card transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-4">
              {formType === 'location_nomination' && (
                <div className="bg-[#0f1419] border border-emerald-500/20 rounded-lg p-3 mb-1">
                  <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-400">
                    <Award className="h-4 w-4 shrink-0" aria-hidden />
                    {language === 'es' ? 'Nominación de lugar' : 'Location Nomination'}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {language === 'es'
                      ? 'Incluye: nombre del lugar, ubicación (colonia/ciudad), por qué crees que es Consciente, y su Instagram si lo conoces.'
                      : "Include: place name, location (neighborhood/city), why you think it's Conscious, and their Instagram if you know it."}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-cc-card border border-cc-border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                >
                  {typeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={
                    formType === 'location_nomination'
                      ? language === 'es'
                        ? 'Nombre del lugar'
                        : 'Place name'
                      : 'Brief title for your idea'
                  }
                  required
                  className="w-full px-4 py-2.5 bg-cc-card border border-cc-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Add more context..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-cc-card border border-cc-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-cc-card border border-cc-border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-300">Links</label>
                  <button
                    type="button"
                    onClick={addLink}
                    className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    <Link2 className="w-4 h-4" />
                    Add link
                  </button>
                </div>
                <div className="space-y-2">
                  {formLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateLink(idx, 'url', e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-3 py-2 bg-cc-card border border-cc-border rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                      />
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateLink(idx, 'label', e.target.value)}
                        placeholder="Label"
                        className="w-24 px-3 py-2 bg-cc-card border border-cc-border rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => removeLink(idx)}
                        className="p-2 text-gray-400 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting || !formTitle.trim()}
                  className="w-full py-3 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Promote to Cause modal (admin only) */}
      {promoteItem && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => !promoteSubmitting && setPromoteItem(null)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="bg-cc-nav-bg border border-cc-border rounded-xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-1">Promote to Cause</h3>
              <p className="text-cc-text-muted text-xs mb-4">
                Creates a row in <code>fund_causes</code>. The original inbox item is
                marked <em>promoted_to_cause</em> and stays linked from this view.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Name *</label>
                  <input
                    type="text"
                    value={promoteForm.name}
                    onChange={(e) => setPromoteForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-cc-card border border-cc-border rounded-lg text-white text-sm"
                    placeholder="Cause name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Organization *
                  </label>
                  <input
                    type="text"
                    value={promoteForm.organization}
                    onChange={(e) =>
                      setPromoteForm((f) => ({ ...f, organization: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 bg-cc-card border border-cc-border rounded-lg text-white text-sm"
                    placeholder="Who runs this on the ground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={promoteForm.category}
                    onChange={(e) =>
                      setPromoteForm((f) => ({ ...f, category: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-cc-card border border-cc-border rounded-lg text-white text-sm"
                  >
                    {FUND_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={promoteForm.description}
                    onChange={(e) =>
                      setPromoteForm((f) => ({ ...f, description: e.target.value }))
                    }
                    required
                    maxLength={500}
                    rows={4}
                    className="w-full px-3 py-2 bg-cc-card border border-cc-border rounded-lg text-white text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={promoteForm.website_url}
                    onChange={(e) =>
                      setPromoteForm((f) => ({ ...f, website_url: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-cc-card border border-cc-border rounded-lg text-white text-sm"
                    placeholder="https://..."
                  />
                </div>
              </div>
              {adminError && (
                <p className="mt-3 text-xs text-red-400">{adminError}</p>
              )}
              <div className="flex gap-2 justify-end mt-5">
                <button
                  onClick={() => setPromoteItem(null)}
                  disabled={promoteSubmitting}
                  className="px-4 py-2 rounded-lg bg-cc-card border border-cc-border text-gray-300 text-sm hover:border-cc-border-light"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePromoteToCause}
                  disabled={
                    promoteSubmitting ||
                    !promoteForm.name.trim() ||
                    !promoteForm.organization.trim() ||
                    !promoteForm.description.trim()
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  <Heart className="w-4 h-4" />
                  {promoteSubmitting ? 'Creating…' : 'Create Cause'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Feed */}
      {items.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-cc-border bg-cc-card/80">
          <span className="text-4xl">💡</span>
          <p className="text-lg text-gray-300 mt-3">¿Tienes una idea para un Pulse?</p>
          <p className="text-cc-text-secondary mt-1">¡Compártela con la comunidad!</p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Compartir idea
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.general
            const typeBadgeLabel =
              item.type === 'location_nomination'
                ? language === 'es'
                  ? 'Nominación de lugar'
                  : 'Location Nomination'
                : item.type === 'cause_suggestion_municipal'
                  ? language === 'es'
                    ? 'Nominación de patrocinador'
                    : 'Sponsor nomination'
                  : typeConfig.label
            // Strip the structured metadata header + "Sponsor account: <uuid>"
            // stamp from the body before showing it on the card. Falls back
            // to the raw description for plain consumer submissions.
            const parsedDescription = parseNominationDescription(item.description)
            const displayDescription =
              parsedDescription.narrative || item.description || ''
            const statusConfig = item.status !== 'pending' ? STATUS_CONFIG[item.status] : null
            const voted = myVotes.has(item.id)
            const isLoading = voteLoading === item.id
            const isArchived = !!item.archived_at
            const adminBusy = adminBusyId === item.id
            const alreadyPromoted = item.status === 'promoted_to_cause'

            return (
              <article
                key={item.id}
                className={`bg-cc-card border rounded-xl p-5 transition-colors ${
                  isArchived
                    ? 'border-amber-500/20 opacity-70'
                    : 'border-cc-border hover:border-cc-border-light'
                }`}
              >
                <div className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <button
                      onClick={() => handleVote(item.id)}
                      disabled={isLoading || isArchived}
                      className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                        voted
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/5'
                      } ${isLoading ? 'opacity-50 cursor-wait' : ''} ${
                        isArchived ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      <ChevronUp className="w-6 h-6" />
                      <span className="text-sm font-medium mt-0.5 text-gray-300">{item.upvotes}</span>
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${typeConfig.bg} ${typeConfig.text}`}
                      >
                        {typeBadgeLabel}
                      </span>
                      {item.status === 'promoted_to_cause' ? (
                        <Link
                          href="/predictions/fund"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Promoted to Cause
                        </Link>
                      ) : statusConfig ? (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                        >
                          {statusConfig.label}
                        </span>
                      ) : null}
                      {isArchived && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <Archive className="w-3 h-3" />
                          Archived
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                    {displayDescription && (
                      <p className="text-cc-text-secondary text-sm mb-3 line-clamp-2">
                        {truncate(displayDescription, 200)}
                      </p>
                    )}
                    {isAdmin && parsedDescription.organization && (
                      <p className="text-cc-text-muted text-xs mb-2">
                        <span className="text-gray-500">Org:</span>{' '}
                        <span className="text-gray-300">{parsedDescription.organization}</span>
                        {parsedDescription.website_url && (
                          <>
                            {' · '}
                            <a
                              href={parsedDescription.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
                            >
                              {parsedDescription.website_url.replace(/^https?:\/\//, '')}
                            </a>
                          </>
                        )}
                      </p>
                    )}
                    <p className="text-cc-text-muted text-xs">
                      Submitted by {item.submitter_name} · {formatRelativeTime(item.created_at)}
                    </p>

                    {isAdmin && (
                      <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-cc-border/60">
                        {!alreadyPromoted && !isArchived && (
                          <button
                            type="button"
                            onClick={() => openPromoteModal(item)}
                            disabled={adminBusy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-medium disabled:opacity-50"
                          >
                            <Heart className="w-3.5 h-3.5" />
                            Promote to Cause
                          </button>
                        )}
                        {item.type === 'market_idea' && !isArchived && (
                          <Link
                            href={`/predictions/admin/create-market?from_inbox=${item.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Create market
                          </Link>
                        )}
                        {!isArchived && item.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => updateAdminStatus(item.id, 'approved')}
                            disabled={adminBusy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cc-card border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs font-medium disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        )}
                        {!isArchived && item.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => updateAdminStatus(item.id, 'rejected')}
                            disabled={adminBusy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cc-card border border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs font-medium disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        )}
                        {isArchived ? (
                          <button
                            type="button"
                            onClick={() => archiveItem(item.id, true)}
                            disabled={adminBusy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cc-card border border-cc-border text-gray-300 hover:border-amber-400 hover:text-amber-300 text-xs font-medium disabled:opacity-50"
                          >
                            <ArchiveRestore className="w-3.5 h-3.5" />
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => archiveItem(item.id, false)}
                            disabled={adminBusy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cc-card border border-cc-border text-gray-400 hover:border-cc-border-light hover:text-white text-xs font-medium disabled:opacity-50"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archive
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
