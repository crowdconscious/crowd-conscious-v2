'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
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
} from 'lucide-react'
import type { InboxItem } from './page'

const TYPE_OPTIONS = [
  { value: 'market_idea', label: 'Market Idea' },
  { value: 'cause_proposal', label: 'Cause/NGO' },
  { value: 'general', label: 'General Suggestion' },
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

const TYPE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  market_idea: { label: 'Market Idea', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  cause_proposal: { label: 'Cause/NGO', bg: 'bg-pink-500/10', text: 'text-pink-400' },
  ngo_suggestion: { label: 'Cause/NGO', bg: 'bg-pink-500/10', text: 'text-pink-400' },
  general: { label: 'General', bg: 'bg-gray-700/50', text: 'text-gray-300' },
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

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'market_idea', label: 'Market Ideas' },
  { id: 'causes', label: 'Causes' },
  { id: 'general', label: 'General' },
] as const

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
}

export function InboxClient({ initialItems }: Props) {
  const [items, setItems] = useState<InboxItem[]>(initialItems)
  const [filter, setFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [voteLoading, setVoteLoading] = useState<string | null>(null)

  // Form state
  const [formType, setFormType] = useState<string>('market_idea')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formLinks, setFormLinks] = useState<{ url: string; label: string }[]>([{ url: '', label: '' }])

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('type', filter)
    const res = await fetch(`/api/predictions/inbox${params.toString() ? '?' + params : ''}`)
    const data = await res.json()
    if (data.items) setItems(data.items)
  }, [filter])

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
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Lightbulb className="w-7 h-7 text-amber-400" />
          Conscious Inbox
        </h1>
        <p className="text-cc-text-secondary mt-1">
          Suggest markets, causes, and ideas. The community decides what matters.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Submit Idea
        </button>
        <div className="flex gap-2">
          {FILTER_TABS.map((tab) => (
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
      </div>

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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-cc-card border border-cc-border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                >
                  {TYPE_OPTIONS.map((o) => (
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
                  placeholder="Brief title for your idea"
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

      {/* Feed */}
      {items.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-cc-border bg-cc-card/80">
          <span className="text-4xl">💡</span>
          <p className="text-lg text-gray-300 mt-3">¿Tienes una idea para un mercado?</p>
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
            const statusConfig = item.status !== 'pending' ? STATUS_CONFIG[item.status] : null
            const voted = myVotes.has(item.id)
            const isLoading = voteLoading === item.id

            return (
              <article
                key={item.id}
                className="bg-cc-card border border-cc-border rounded-xl p-5 transition-colors hover:border-cc-border-light"
              >
                <div className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <button
                      onClick={() => handleVote(item.id)}
                      disabled={isLoading}
                      className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                        voted
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/5'
                      } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
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
                        {typeConfig.label}
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
                    </div>
                    <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                    {item.description && (
                      <p className="text-cc-text-secondary text-sm mb-3 line-clamp-2">
                        {truncate(item.description, 200)}
                      </p>
                    )}
                    <p className="text-cc-text-muted text-xs">
                      Submitted by {item.submitter_name} · {formatRelativeTime(item.created_at)}
                    </p>
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
