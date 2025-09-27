'use client'

import { useState, useEffect } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { AnimatedButton, useKeyboardShortcuts } from '@/components/ui/UIComponents'

interface Notification {
  id: string
  user_id: string
  type: 'vote' | 'content_approved' | 'event_rsvp' | 'community_invite' | 'content_created'
  title: string
  message: string
  data?: any
  read: boolean
  created_at: string
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  duration?: number
}

let toastCounter = 0

// Global toast state
const toastListeners = new Set<(toasts: Toast[]) => void>()
let globalToasts: Toast[] = []

export const addToast = (toast: Omit<Toast, 'id'>) => {
  const newToast = { ...toast, id: `toast-${++toastCounter}` }
  globalToasts = [...globalToasts, newToast]
  toastListeners.forEach(listener => listener(globalToasts))
  
  // Auto remove toast after duration
  const duration = toast.duration || 5000
  setTimeout(() => {
    removeToast(newToast.id)
  }, duration)
}

export const removeToast = (id: string) => {
  globalToasts = globalToasts.filter(toast => toast.id !== id)
  toastListeners.forEach(listener => listener(globalToasts))
}

// Notification Bell Component
export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Fetch initial notifications
    fetchNotifications()

    // Set up real-time subscription
    const channel = supabaseClient
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Real-time notification:', payload)
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new as Notification, ...prev])
            setUnreadCount(prev => prev + 1)
            
            // Show toast for new notification
            const notification = payload.new as Notification
            addToast({
              type: 'info',
              title: notification.title,
              message: notification.message,
              duration: 8000
            })
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId])

  const fetchNotifications = async () => {
    const { data, error } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      setNotifications(data)
      setUnreadCount(data.filter((n: any) => !n.read).length)
    }
  }

  const markAsRead = async (notificationId: string) => {
    // TODO: Fix type issues with notifications table
    /* await supabaseClient
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId) */

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    // TODO: Fix type issues with notifications table
    /* await supabaseClient
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false) */

    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'vote': return '🗳️'
      case 'content_approved': return '✅'
      case 'event_rsvp': return '📅'
      case 'community_invite': return '🏘️'
      case 'content_created': return '💡'
      default: return '🔔'
    }
  }

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-teal-600 hover:text-teal-700 text-sm font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-teal-50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <span className="text-xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-900 text-sm">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm mt-1">
                        {notification.message}
                      </p>
                      <p className="text-slate-400 text-xs mt-2">
                        {new Date(notification.created_at).toLocaleDateString()} at{' '}
                        {new Date(notification.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <div className="text-4xl mb-2">🔕</div>
                <p className="text-slate-500 text-sm">No notifications yet</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-200">
            <a
              href="/notifications"
              className="block text-center text-teal-600 hover:text-teal-700 text-sm font-medium"
            >
              View all notifications
            </a>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

// Toast Notifications Component
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    toastListeners.add(setToasts)
    return () => {
      toastListeners.delete(setToasts)
    }
  }, [])

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            max-w-sm bg-white rounded-lg shadow-lg border-l-4 p-4 transform transition-all duration-300 ease-out
            ${toast.type === 'success' ? 'border-green-500' :
              toast.type === 'error' ? 'border-red-500' :
              toast.type === 'warning' ? 'border-yellow-500' :
              'border-blue-500'
            }
            animate-slide-in-right
          `}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">
              {toast.type === 'success' ? '✅' :
               toast.type === 'error' ? '❌' :
               toast.type === 'warning' ? '⚠️' :
               'ℹ️'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 text-sm">{toast.title}</p>
              <p className="text-slate-600 text-sm mt-1">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Global Search Component
export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({
    communities: [],
    content: [],
    loading: false
  })

  // Keyboard shortcut for Command+K
  useKeyboardShortcuts({
    'cmd+k': () => {
      setIsOpen(true)
    },
    'escape': () => {
      setIsOpen(false)
      setQuery('')
    }
  })

  useEffect(() => {
    if (!query.trim() || !isOpen) {
      setResults({ communities: [], content: [], loading: false })
      return
    }

    const searchTimeout = setTimeout(async () => {
      setResults(prev => ({ ...prev, loading: true }))
      
      try {
        const [communitiesRes, contentRes] = await Promise.all([
          supabaseClient
            .from('communities')
            .select('id, name, description, image_url, member_count, core_values')
            .textSearch('name', query)
            .limit(5),
          
          supabaseClient
            .from('community_content')
            .select(`
              id, title, description, type, community_id, created_at,
              community:communities(name)
            `)
            .textSearch('title', query)
            .limit(5)
        ])

        setResults({
          communities: communitiesRes.data || [],
          content: contentRes.data || [],
          loading: false
        })
      } catch (error) {
        console.error('Search error:', error)
        setResults({ communities: [], content: [], loading: false })
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [query, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-96 overflow-hidden">
        {/* Search Input */}
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔍</span>
            <input
              type="text"
              placeholder="Search communities and content..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-lg outline-none"
              autoFocus
            />
            <kbd className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">⌘K</kbd>
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.loading ? (
            <div className="px-4 py-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-slate-600 text-sm mt-2">Searching...</p>
            </div>
          ) : (
            <>
              {/* Communities Section */}
              {results.communities.length > 0 && (
                <div className="px-4 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Communities</h3>
                  {results.communities.map((community: any) => (
                    <a
                      key={community.id}
                      href={`/communities/${community.id}`}
                      className="block p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-teal-700">
                            {community.name[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm">{community.name}</p>
                          <p className="text-slate-600 text-xs truncate">
                            {community.member_count} members
                          </p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* Content Section */}
              {results.content.length > 0 && (
                <div className="px-4 py-3">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Content</h3>
                  {results.content.map((content: any) => (
                    <a
                      key={content.id}
                      href={`/communities/${content.community_id}/content/${content.id}`}
                      className="block p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {content.type === 'need' ? '💡' :
                           content.type === 'event' ? '📅' :
                           content.type === 'poll' ? '🗳️' : '🏆'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm">{content.title}</p>
                          <p className="text-slate-600 text-xs">
                            in {content.community?.name}
                          </p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* No Results */}
              {query && !results.loading && results.communities.length === 0 && results.content.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="text-slate-600 text-sm">No results found for "{query}"</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-center">
          <p className="text-xs text-slate-500">
            Press <kbd className="px-1 bg-white rounded">↵</kbd> to select, <kbd className="px-1 bg-white rounded">ESC</kbd> to close
          </p>
        </div>
      </div>

      {/* Click outside to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={() => setIsOpen(false)}
      />
    </div>
  )
}
