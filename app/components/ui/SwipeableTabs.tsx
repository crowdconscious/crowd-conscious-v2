'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/design-system'

interface Tab {
  id: string
  label: string
  icon?: string
  badge?: number
  content: React.ReactNode
}

interface SwipeableTabsProps {
  tabs: Tab[]
  defaultTab?: string
  onTabChange?: (tabId: string) => void
  className?: string
}

export default function SwipeableTabs({
  tabs,
  defaultTab,
  onTabChange,
  className
}: SwipeableTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  const activeIndex = tabs.findIndex(tab => tab.id === activeTab)
  const tabWidth = 100 / tabs.length

  useEffect(() => {
    if (onTabChange) {
      onTabChange(activeTab)
    }
  }, [activeTab, onTabChange])

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
    setTranslateX(0)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].clientX)
    setCurrentX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !contentRef.current) return

    const touchX = e.touches[0].clientX
    const deltaX = touchX - startX
    const containerWidth = contentRef.current.offsetWidth
    const newTranslateX = (deltaX / containerWidth) * 100

    setCurrentX(touchX)
    setTranslateX(newTranslateX)
  }

  const handleTouchEnd = () => {
    if (!isDragging || !contentRef.current) return

    setIsDragging(false)
    
    const deltaX = currentX - startX
    const containerWidth = contentRef.current.offsetWidth
    const threshold = containerWidth * 0.2 // 20% of container width
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && activeIndex > 0) {
        // Swipe right - go to previous tab
        setActiveTab(tabs[activeIndex - 1].id)
      } else if (deltaX < 0 && activeIndex < tabs.length - 1) {
        // Swipe left - go to next tab
        setActiveTab(tabs[activeIndex + 1].id)
      }
    }
    
    setTranslateX(0)
  }

  const handleMouseStart = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.clientX)
    setCurrentX(e.clientX)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !contentRef.current) return

    const mouseX = e.clientX
    const deltaX = mouseX - startX
    const containerWidth = contentRef.current.offsetWidth
    const newTranslateX = (deltaX / containerWidth) * 100

    setCurrentX(mouseX)
    setTranslateX(newTranslateX)
  }

  const handleMouseEnd = () => {
    if (!isDragging || !contentRef.current) return

    setIsDragging(false)
    
    const deltaX = currentX - startX
    const containerWidth = contentRef.current.offsetWidth
    const threshold = containerWidth * 0.2
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && activeIndex > 0) {
        setActiveTab(tabs[activeIndex - 1].id)
      } else if (deltaX < 0 && activeIndex < tabs.length - 1) {
        setActiveTab(tabs[activeIndex + 1].id)
      }
    }
    
    setTranslateX(0)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseEnd)
      }
    }
  }, [isDragging, startX, currentX, activeIndex])

  return (
    <div className={cn('w-full', className)}>
      {/* Tab Headers */}
      <div 
        ref={tabsRef}
        className="relative flex bg-neutral-100 rounded-lg p-1 mb-4 overflow-x-auto scrollbar-hide"
      >
        {/* Active tab indicator */}
        <div
          className="absolute top-1 bottom-1 bg-white rounded-md shadow-sm transition-all duration-300 ease-out"
          style={{
            left: `${activeIndex * tabWidth}%`,
            width: `${tabWidth}%`,
            transform: `translateX(${translateX * 0.1}px)`,
          }}
        />
        
        {/* Tab buttons */}
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              'relative flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium transition-colors duration-200 rounded-md z-10',
              activeTab === tab.id
                ? 'text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-800'
            )}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span className="truncate">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-1 bg-primary-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="relative overflow-hidden">
        <div
          ref={contentRef}
          className={cn(
            'flex transition-transform duration-300 ease-out',
            isDragging ? 'transition-none' : ''
          )}
          style={{
            width: `${tabs.length * 100}%`,
            transform: `translateX(calc(-${activeIndex * tabWidth}% + ${translateX}%))`,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseStart}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="w-full flex-shrink-0"
              style={{ width: `${100 / tabs.length}%` }}
            >
              <div className="w-full">
                {tab.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Swipe indicators for mobile */}
      <div className="flex justify-center mt-4 space-x-1 md:hidden">
        {tabs.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(tabs[index].id)}
            className={cn(
              'w-2 h-2 rounded-full transition-colors duration-200',
              index === activeIndex
                ? 'bg-primary-500'
                : 'bg-neutral-300 hover:bg-neutral-400'
            )}
          />
        ))}
      </div>

      {/* Swipe hint for first-time users */}
      {activeIndex === 0 && (
        <div className="flex items-center justify-center mt-2 text-xs text-neutral-500 md:hidden">
          <span>👈 Swipe to explore more tabs 👉</span>
        </div>
      )}
    </div>
  )
}

export { SwipeableTabs }
export type { Tab }
