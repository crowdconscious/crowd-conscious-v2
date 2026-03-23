'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createPortal } from 'react-dom'

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

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

function NotificationPanel({
  notifications,
  onClose,
  onMarkRead,
}: {
  notifications: Notification[]
  onClose: () => void
  onMarkRead: (id: string) => void
}) {
  return (
    <>
      <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <h3 className="font-semibold text-white">Notifications</h3>
        <Link
          href="/predictions/notifications"
          className="text-xs font-medium text-emerald-400 hover:text-emerald-300 whitespace-nowrap"
          onClick={onClose}
        >
          See all
        </Link>
      </div>
      <div className="overflow-y-auto flex-1 min-h-0">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">No notifications yet</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link || '#'}
                onClick={() => {
                  if (!n.read) onMarkRead(n.id)
                  onClose()
                }}
                className={`block p-3 hover:bg-slate-800/50 transition-colors ${
                  !n.read ? 'bg-slate-800/30' : ''
                }`}
              >
                <p className="font-medium text-white text-sm">{n.title}</p>
                {(n.body || n.message) && (
                  <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{n.body || n.message}</p>
                )}
                <p className="text-slate-500 text-xs mt-1">{formatTime(n.created_at)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="p-2 border-t border-slate-800 shrink-0 md:hidden">
        <Link
          href="/predictions/notifications"
          className="block w-full text-center py-2.5 rounded-lg bg-emerald-600/20 text-emerald-400 text-sm font-medium hover:bg-emerald-600/30"
          onClick={onClose}
        >
          Open notifications page
        </Link>
      </div>
    </>
  )
}

export function NotificationsBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=15')
      if (res.status === 401) {
        router.replace('/login')
        return
      }
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t)) return
      const mobilePanel = document.getElementById('cc-notifications-mobile-panel')
      if (mobilePanel?.contains(t)) return
      setOpen(false)
    }
    if (open) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [open])

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      if (res.status === 401) {
        router.replace('/login')
        return
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // ignore
    }
  }

  const close = () => setOpen(false)

  const mobileOverlay =
    mounted &&
    open &&
    isMobile &&
    typeof document !== 'undefined' &&
    createPortal(
      <>
        <div
          className="fixed inset-0 z-[100] bg-black/50"
          aria-hidden
          onClick={close}
        />
        <div
          id="cc-notifications-mobile-panel"
          className="fixed z-[110] left-3 right-3 top-16 max-h-[min(70vh,520px)] flex flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
        >
          <NotificationPanel
            notifications={notifications}
            onClose={close}
            onMarkRead={markAsRead}
          />
        </div>
      </>,
      document.body
    )

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop / tablet: anchored dropdown — high z-index so it paints above sidebar */}
      {open && !isMobile && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 z-[100] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
          <NotificationPanel
            notifications={notifications}
            onClose={close}
            onMarkRead={markAsRead}
          />
        </div>
      )}

      {mobileOverlay}
    </div>
  )
}
