'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/design-system'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  snapPoints?: number[] // Heights in vh (e.g., [25, 50, 90])
  initialSnap?: number
  showHandle?: boolean
  className?: string
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [90],
  initialSnap = 0,
  showHandle = true,
  className
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(initialSnap)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const currentHeight = snapPoints[currentSnap]

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setTranslateY(0)
    } else {
      document.body.style.overflow = 'unset'
      setTranslateY(100)
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartY(e.touches[0].clientY)
    setCurrentY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return

    const touchY = e.touches[0].clientY
    const deltaY = touchY - startY
    const newTranslateY = Math.max(0, (deltaY / window.innerHeight) * 100)
    
    setCurrentY(touchY)
    setTranslateY(newTranslateY)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return

    setIsDragging(false)
    
    const deltaY = currentY - startY
    const threshold = window.innerHeight * 0.1 // 10vh threshold
    
    if (deltaY > threshold) {
      // Swipe down - close or snap to lower point
      if (currentSnap === snapPoints.length - 1) {
        onClose()
      } else {
        setCurrentSnap(prev => Math.min(prev + 1, snapPoints.length - 1))
      }
    } else if (deltaY < -threshold) {
      // Swipe up - snap to higher point
      setCurrentSnap(prev => Math.max(prev - 1, 0))
    }
    
    setTranslateY(0)
  }

  const handleMouseStart = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartY(e.clientY)
    setCurrentY(e.clientY)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const mouseY = e.clientY
    const deltaY = mouseY - startY
    const newTranslateY = Math.max(0, (deltaY / window.innerHeight) * 100)
    
    setCurrentY(mouseY)
    setTranslateY(newTranslateY)
  }

  const handleMouseEnd = () => {
    if (!isDragging) return

    setIsDragging(false)
    
    const deltaY = currentY - startY
    const threshold = window.innerHeight * 0.1
    
    if (deltaY > threshold) {
      if (currentSnap === snapPoints.length - 1) {
        onClose()
      } else {
        setCurrentSnap(prev => Math.min(prev + 1, snapPoints.length - 1))
      }
    } else if (deltaY < -threshold) {
      setCurrentSnap(prev => Math.max(prev - 1, 0))
    }
    
    setTranslateY(0)
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
  }, [isDragging, startY, currentY])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          isDragging ? 'transition-none' : '',
          className
        )}
        style={{
          height: `${currentHeight}vh`,
          transform: `translateY(${translateY}%)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseStart}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1 bg-neutral-300 rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Snap indicators */}
        {snapPoints.length > 1 && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 space-y-1">
            {snapPoints.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSnap(index)}
                className={cn(
                  'w-2 h-8 rounded-full transition-colors',
                  index === currentSnap
                    ? 'bg-primary-500'
                    : 'bg-neutral-300 hover:bg-neutral-400'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Hook for managing bottom sheet state
export function useBottomSheet() {
  const [isOpen, setIsOpen] = useState(false)
  
  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen(prev => !prev)
  
  return {
    isOpen,
    open,
    close,
    toggle,
  }
}
