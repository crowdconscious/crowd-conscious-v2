'use client'

import { useState, useEffect } from 'react'

// ============================================================================
// LOADING SKELETONS
// ============================================================================

export const Skeleton = ({ className = '', variant = 'default' }: {
  className?: string
  variant?: 'default' | 'circle' | 'text' | 'card'
}) => {
  const variants = {
    default: 'h-4 bg-slate-200 rounded animate-pulse',
    circle: 'rounded-full bg-slate-200 animate-pulse',
    text: 'h-3 bg-slate-200 rounded animate-pulse',
    card: 'h-48 bg-slate-200 rounded-lg animate-pulse'
  }
  
  return <div className={`${variants[variant]} ${className}`} />
}

export const CommunityCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 space-y-4">
    <Skeleton variant="card" className="h-32 -m-6 mb-4" />
    <div className="space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton variant="text" className="w-1/2" />
      <Skeleton variant="text" className="w-full" />
      <Skeleton variant="text" className="w-4/5" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  </div>
)

export const ContentListSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Skeleton variant="circle" className="w-10 h-10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton variant="text" className="w-full" />
            <Skeleton variant="text" className="w-4/5" />
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <Skeleton variant="text" className="w-16" />
          <Skeleton variant="text" className="w-20" />
          <Skeleton variant="text" className="w-24" />
        </div>
      </div>
    ))}
  </div>
)

export const DashboardSkeleton = () => (
  <div className="space-y-8">
    {/* Welcome Section */}
    <div className="bg-gradient-to-r from-teal-600 to-purple-700 rounded-xl p-6 space-y-4">
      <Skeleton className="h-8 w-1/3 bg-white/20" />
      <Skeleton className="h-4 w-2/3 bg-white/20" />
      <div className="grid grid-cols-3 gap-4 pt-4">
        <Skeleton className="h-16 bg-white/20 rounded-lg" />
        <Skeleton className="h-16 bg-white/20 rounded-lg" />
        <Skeleton className="h-16 bg-white/20 rounded-lg" />
      </div>
    </div>
    
    {/* Content Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <CommunityCardSkeleton key={i} />
      ))}
    </div>
  </div>
)

export const DashboardSectionSkeleton = () => (
  <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
    <Skeleton className="h-8 w-1/3 mb-4" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  </div>
)

// ============================================================================
// MICRO-INTERACTIONS & ANIMATIONS
// ============================================================================

export const AnimatedButton = ({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  type = 'button'
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  className?: string
  type?: 'button' | 'submit'
}) => {
  const variants = {
    primary: 'bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        rounded-lg font-medium transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
        ${className}
      `}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : children}
    </button>
  )
}

export const AnimatedCard = ({ 
  children, 
  onClick,
  className = '',
  hover = true
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  hover?: boolean
}) => (
  <div
    onClick={onClick}
    className={`
      ${onClick ? 'cursor-pointer' : ''}
      ${hover ? 'hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02]' : ''}
      transition-all duration-300 ease-out
      ${className}
    `}
  >
    {children}
  </div>
)

// ============================================================================
// MOBILE BOTTOM NAVIGATION
// ============================================================================

export const BottomNavigation = ({ 
  currentPath 
}: { 
  currentPath: string 
}) => {
  const navItems = [
    { path: '/dashboard', icon: '🏠', label: 'Home' },
    { path: '/communities', icon: '🌍', label: 'Communities' },
    { path: '/profile', icon: '👤', label: 'Profile' },
    { path: '/settings', icon: '⚙️', label: 'Settings' }
  ]
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="grid grid-cols-4 py-2">
        {navItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`
              flex flex-col items-center justify-center py-2 px-1
              ${currentPath === item.path 
                ? 'text-teal-600' 
                : 'text-slate-500 hover:text-slate-700'
              }
              transition-colors duration-200
            `}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// EMPTY STATES
// ============================================================================

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  illustration
}: {
  icon?: string
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  illustration?: string
}) => (
  <div className="text-center py-12 px-6">
    <div className="max-w-md mx-auto">
      {illustration ? (
        <div className="text-8xl mb-6">{illustration}</div>
      ) : icon ? (
        <div className="text-6xl mb-6">{icon}</div>
      ) : (
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl text-slate-400">📭</span>
        </div>
      )}
      
      <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 mb-6">{description}</p>
      
      {action && (
        <AnimatedButton
          onClick={action.onClick}
          variant="primary"
          size="lg"
        >
          {action.label}
        </AnimatedButton>
      )}
    </div>
  </div>
)

// ============================================================================
// KEYBOARD SHORTCUTS HOOK
// ============================================================================

export const useKeyboardShortcuts = (shortcuts: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey
      
      // Common shortcuts
      if (cmdOrCtrl && key === 'k') {
        event.preventDefault()
        shortcuts['cmd+k']?.()
      } else if (key === 'escape') {
        event.preventDefault()
        shortcuts['escape']?.()
      } else if (event.code === 'ArrowLeft' && !event.target?.tagName?.match(/INPUT|TEXTAREA/)) {
        event.preventDefault()
        shortcuts['arrowleft']?.()
      } else if (event.code === 'ArrowRight' && !event.target?.tagName?.match(/INPUT|TEXTAREA/)) {
        event.preventDefault()
        shortcuts['arrowright']?.()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

// ============================================================================
// PULL TO REFRESH
// ============================================================================

export const usePullToRefresh = (onRefresh: () => Promise<void>) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  useEffect(() => {
    let startY = 0
    let currentY = 0
    let isDragging = false
    
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY
        isDragging = true
      }
    }
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return
      currentY = e.touches[0].clientY
      
      if (currentY - startY > 100 && window.scrollY === 0) {
        // Trigger refresh
        if (!isRefreshing) {
          setIsRefreshing(true)
          onRefresh().finally(() => setIsRefreshing(false))
        }
      }
    }
    
    const handleTouchEnd = () => {
      isDragging = false
    }
    
    if ('ontouchstart' in window) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true })
      document.addEventListener('touchmove', handleTouchMove, { passive: true })
      document.addEventListener('touchend', handleTouchEnd, { passive: true })
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [onRefresh, isRefreshing])
  
  return isRefreshing
}

// ============================================================================
// TOAST ANIMATIONS & SUCCESS ANIMATIONS
// ============================================================================

// Add these animations to your global CSS or Tailwind config
// @keyframes slide-in-right {
//   from { transform: translateX(100%); opacity: 0; }
//   to { transform: translateX(0); opacity: 1; }
// }

// ============================================================================
// SUCCESS ANIMATIONS
// ============================================================================

export const SuccessAnimation = ({ 
  show, 
  onComplete 
}: { 
  show: boolean
  onComplete?: () => void 
}) => {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 2000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])
  
  if (!show) return null
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce">
        <div className="flex items-center gap-2">
          <span className="text-xl">✅</span>
          <span className="font-medium">Success!</span>
        </div>
      </div>
    </div>
  )
}
