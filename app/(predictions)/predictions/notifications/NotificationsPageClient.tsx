'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, ArrowLeft, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  body?: string | null
  link: string | null
  read: boolean
  created_at: string
}

function formatTime(iso: string, locale: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return locale === 'es' ? 'Ahora' : 'Just now'
  if (diffMins < 60) return locale === 'es' ? `Hace ${diffMins} min` : `${diffMins}m ago`
  if (diffHours < 24) return locale === 'es' ? `Hace ${diffHours} h` : `${diffHours}h ago`
  if (diffDays < 7) return locale === 'es' ? `Hace ${diffDays} d` : `${diffDays}d ago`
  return d.toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US')
}

export function NotificationsPageClient() {
  const router = useRouter()
  const { language } = useLanguage()
  const locale = language === 'es' ? 'es' : 'en'
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/notifications?limit=50')
      if (res.status === 401) {
        router.replace('/login')
        return
      }
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      setError(locale === 'es' ? 'No se pudieron cargar las notificaciones.' : 'Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }, [router, locale])

  useEffect(() => {
    load()
  }, [load])

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        )
        setUnreadCount((c) => Math.max(0, c - 1))
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/predictions"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label={locale === 'es' ? 'Volver' : 'Back'}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-7 h-7 text-emerald-400 shrink-0" />
            {locale === 'es' ? 'Notificaciones' : 'Notifications'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {unreadCount > 0
              ? locale === 'es'
                ? `${unreadCount} sin leer`
                : `${unreadCount} unread`
              : locale === 'es'
                ? 'Todo al día'
                : 'All caught up'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            load()
          }}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label={locale === 'es' ? 'Actualizar' : 'Refresh'}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
      )}

      {loading && notifications.length === 0 ? (
        <p className="text-slate-500 text-center py-12">{locale === 'es' ? 'Cargando…' : 'Loading…'}</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center">
          <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">
            {locale === 'es'
              ? 'Aún no tienes notificaciones. Cuando votes, recibas resúmenes por email o haya novedades en tus mercados, aparecerán aquí.'
              : 'No notifications yet. When you vote, get email digests, or markets update, they will show up here.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                href={n.link || '#'}
                onClick={() => {
                  if (!n.read) markAsRead(n.id)
                }}
                className={`block rounded-xl border p-4 transition-colors ${
                  !n.read
                    ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/50'
                }`}
              >
                <p className="font-medium text-white text-sm">{n.title}</p>
                {(n.body || n.message) && (
                  <p className="text-slate-400 text-sm mt-1 whitespace-pre-wrap">{n.body || n.message}</p>
                )}
                <p className="text-slate-500 text-xs mt-2">{formatTime(n.created_at, locale)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
