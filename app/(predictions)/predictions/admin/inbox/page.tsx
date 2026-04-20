'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Eye,
  ExternalLink,
  ChevronUp,
  FileText,
  X,
  Heart,
} from 'lucide-react'

type InboxItem = {
  id: string
  user_id: string
  type: string
  title: string
  description: string | null
  category: string | null
  links: { url: string; label: string }[]
  status: string
  admin_notes: string | null
  upvotes: number
  created_at: string
  submitter_name: string
  archived_at: string | null
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'promoted_to_cause', label: 'Promoted to Cause' },
] as const

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'market_idea', label: 'Market Ideas' },
  { id: 'causes', label: 'Causes' },
  { id: 'cause_suggestion_municipal', label: 'Sugerencias municipales' },
  { id: 'general', label: 'General' },
] as const

const SORT_OPTIONS = [
  { id: 'upvotes', label: 'Most Upvoted' },
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
] as const

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  market_idea: { label: 'Market Idea', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  cause_proposal: { label: 'Cause/NGO', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  ngo_suggestion: { label: 'Cause/NGO', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  cause_suggestion_municipal: {
    label: 'Sugerencia municipal',
    bg: 'bg-fuchsia-500/20',
    text: 'text-fuchsia-400',
  },
  general: { label: 'General', bg: 'bg-slate-500/20', text: 'text-slate-400' },
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: 'bg-slate-500/20', text: 'text-slate-400' },
  reviewed: { label: 'Reviewed', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  approved: { label: 'Approved', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  rejected: { label: 'Rejected', bg: 'bg-red-500/20', text: 'text-red-400' },
  published: { label: 'Published', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  promoted_to_cause: { label: 'Promoted to Cause', bg: 'bg-amber-500/20', text: 'text-amber-400' },
}

const CATEGORIES = [
  { id: 'water', label: 'Water' },
  { id: 'education', label: 'Education' },
  { id: 'environment', label: 'Environment' },
  { id: 'social_justice', label: 'Social Justice' },
  { id: 'health', label: 'Health' },
  { id: 'other', label: 'Other' },
] as const

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminInboxPage() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sort, setSort] = useState('upvotes')
  const [rejectModal, setRejectModal] = useState<{ item: InboxItem; note: string } | null>(null)
  const [promoteModal, setPromoteModal] = useState<InboxItem | null>(null)
  const [promoteForm, setPromoteForm] = useState({
    name: '',
    organization: '',
    category: 'other',
    description: '',
    website_url: '',
  })
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      params.set('sort', sort)
      if (showArchived) params.set('includeArchived', '1')
      const res = await fetch(`/api/predictions/admin/inbox?${params}`)
      const data = await res.json()
      if (res.status === 403) {
        window.location.href = '/predictions'
        return
      }
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setItems(data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, sort, showArchived])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const updateStatus = async (id: string, status: string, adminNotes?: string) => {
    setSubmitting(true)
    try {
      const body: { status: string; admin_notes?: string } = { status }
      if (adminNotes !== undefined) body.admin_notes = adminNotes
      const res = await fetch(`/api/predictions/admin/inbox/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status, admin_notes: adminNotes ?? i.admin_notes } : i))
      )
      setRejectModal(null)
      setEditingNotes(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  const saveNotes = (item: InboxItem) => {
    updateStatus(item.id, item.status, notesValue)
    setEditingNotes(null)
  }

  const startEditNotes = (item: InboxItem) => {
    setEditingNotes(item.id)
    setNotesValue(item.admin_notes || '')
  }

  const openPromoteModal = (item: InboxItem) => {
    setPromoteModal(item)
    setPromoteForm({
      name: item.title,
      organization: '',
      category: 'other',
      description: item.description || '',
      website_url: '',
    })
  }

  const archiveInboxItem = async (id: string) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/predictions/admin/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'inbox', id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Archive failed')
      await fetchItems()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Archive failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePromoteToCause = async () => {
    if (!promoteModal) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/predictions/admin/inbox/${promoteModal.id}/promote-to-cause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: promoteForm.name.trim(),
          organization: promoteForm.organization.trim(),
          category: promoteForm.category,
          description: promoteForm.description.trim(),
          website_url: promoteForm.website_url.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Promote failed')
      setItems((prev) =>
        prev.map((i) =>
          i.id === promoteModal.id ? { ...i, status: 'promoted_to_cause' } : i
        )
      )
      setPromoteModal(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Promote failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/predictions"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold text-white">Review Inbox</h1>
      <p className="text-slate-400">
        Review Conscious Inbox submissions. Approve, reject, or create markets from them.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === f.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-gray-400 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="accent-emerald-500"
          />
          Show archived
        </label>
        {showArchived && (
          <span className="text-gray-500 text-xs">
            ({items.filter((i) => i.archived_at).length} archived)
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No submissions match your filters</p>
          <p className="text-sm mt-2">Try adjusting status or type filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item) => {
            const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.general
            const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending

            return (
              <article
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
              >
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${typeConfig.bg} ${typeConfig.text}`}
                  >
                    {typeConfig.label}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center flex-shrink-0 p-2 rounded-lg bg-slate-800/50">
                    <ChevronUp className="w-5 h-5 text-emerald-400" />
                    <span className="text-lg font-bold text-white mt-0.5">{item.upvotes}</span>
                    <span className="text-xs text-slate-500">upvotes</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                    {item.description && (
                      <p className="text-slate-400 text-sm whitespace-pre-wrap mb-3">
                        {item.description}
                      </p>
                    )}
                    <p className="text-slate-500 text-sm">
                      Submitted by {item.submitter_name} · {formatDate(item.created_at)}
                      {item.category && (
                        <span className="ml-2">· Category: {item.category}</span>
                      )}
                    </p>
                  </div>
                </div>

                {item.links && item.links.length > 0 && (
                  <div>
                    <p className="text-slate-500 text-xs font-medium mb-2">Links</p>
                    <div className="flex flex-wrap gap-2">
                      {item.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-emerald-400 hover:bg-slate-700 text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {link.label || link.url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin notes */}
                <div>
                  <p className="text-slate-500 text-xs font-medium mb-2">Admin notes (private)</p>
                  {editingNotes === item.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        placeholder="Add private notes..."
                        rows={3}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveNotes(item)}
                          disabled={submitting}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingNotes(null)
                            setNotesValue('')
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-slate-400 text-sm flex-1 min-w-0">
                        {item.admin_notes || <span className="italic">No notes</span>}
                      </p>
                      <button
                        onClick={() => startEditNotes(item)}
                        className="px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 text-sm"
                      >
                        {item.admin_notes ? 'Edit' : 'Add'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                  {!item.archived_at && (
                    <button
                      type="button"
                      onClick={() => archiveInboxItem(item.id)}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium disabled:opacity-50"
                    >
                      📦 Archive
                    </button>
                  )}
                  <button
                    onClick={() => openPromoteModal(item)}
                    disabled={submitting || item.status === 'promoted_to_cause'}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    <Heart className="w-4 h-4" />
                    Promote to Cause
                  </button>
                  <Link
                    href={`/predictions/admin/create-market?from_inbox=${item.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    Create Market from This
                  </Link>
                  <button
                    onClick={() => updateStatus(item.id, 'reviewed')}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium disabled:opacity-50"
                  >
                    <Eye className="w-4 h-4" />
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => updateStatus(item.id, 'approved')}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-500/80 text-white text-sm font-medium disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectModal({ item, note: '' })}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-500/80 text-white text-sm font-medium disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Promote to Cause modal */}
      {promoteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => !submitting && setPromoteModal(null)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Promote to Cause</h3>
              <p className="text-slate-400 text-sm mb-4">
                Create a fund cause from this inbox item. The item will be marked as promoted.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Name *</label>
                  <input
                    type="text"
                    value={promoteForm.name}
                    onChange={(e) => setPromoteForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    placeholder="Cause name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Organization *</label>
                  <input
                    type="text"
                    value={promoteForm.organization}
                    onChange={(e) => setPromoteForm((f) => ({ ...f, organization: e.target.value }))}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    placeholder="Organization name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Category *</label>
                  <select
                    value={promoteForm.category}
                    onChange={(e) => setPromoteForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Description *</label>
                  <textarea
                    value={promoteForm.description}
                    onChange={(e) => setPromoteForm((f) => ({ ...f, description: e.target.value }))}
                    required
                    maxLength={500}
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Website URL</label>
                  <input
                    type="url"
                    value={promoteForm.website_url}
                    onChange={(e) => setPromoteForm((f) => ({ ...f, website_url: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => setPromoteModal(null)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePromoteToCause}
                  disabled={submitting || !promoteForm.name.trim() || !promoteForm.organization.trim() || !promoteForm.description.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Cause'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setRejectModal(null)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-2">Reject submission</h3>
              <p className="text-slate-400 text-sm mb-4">
                Optional: add a note (stored in admin notes, not shown to user)
              </p>
              <textarea
                value={rejectModal.note}
                onChange={(e) => setRejectModal({ ...rejectModal, note: e.target.value })}
                placeholder="Reason for rejection..."
                rows={3}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setRejectModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const note = rejectModal.note.trim()
                    const existingNotes = rejectModal.item.admin_notes || ''
                    const newNotes = note
                      ? existingNotes
                        ? `${existingNotes}\n\nRejection: ${note}`
                        : `Rejection: ${note}`
                      : existingNotes
                    updateStatus(rejectModal.item.id, 'rejected', newNotes || undefined)
                  }}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
