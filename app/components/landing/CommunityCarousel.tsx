'use client'

import { motion, useAnimationControls, PanInfo } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

interface Community {
  id: string
  name: string
  description: string | null
  image_url: string | null
  member_count: number
  address: string | null
  core_values: string[]
  created_at: string
  recent_activity?: {
    type: string
    count: number
  }
}

interface CommunityCarouselProps {
  communities: Community[]
}

export default function CommunityCarousel({ communities }: CommunityCarouselProps) {
  const controls = useAnimationControls()
  const [isPaused, setIsPaused] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Calculate how many cards fit in viewport (responsive)
  const [cardsPerView, setCardsPerView] = useState(3)
  
  useEffect(() => {
    const updateCardsPerView = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 640) setCardsPerView(1)      // mobile
        else if (window.innerWidth < 1024) setCardsPerView(2) // tablet  
        else setCardsPerView(3)                               // desktop
      }
    }
    
    updateCardsPerView()
    window.addEventListener('resize', updateCardsPerView)
    return () => window.removeEventListener('resize', updateCardsPerView)
  }, [])

  // Create duplicated array for infinite scroll
  const duplicatedCommunities = [...communities, ...communities, ...communities]
  const cardWidth = 320 // 80 * 4 (w-80 = 320px)
  const cardGap = 24 // space-x-6 = 24px
  const totalCardWidth = cardWidth + cardGap

  // Auto-scroll functionality
  useEffect(() => {
    if (!isPaused && !isDragging && communities.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => {
          const maxIndex = communities.length - 1
          return prev >= maxIndex ? 0 : prev + 1
        })
      }, 4000) // Change slide every 4 seconds
      
      return () => clearInterval(interval)
    }
  }, [isPaused, isDragging, communities.length])

  // Update position based on currentIndex
  useEffect(() => {
    if (!isDragging) {
      const targetX = -(currentIndex * totalCardWidth)
      controls.start({
        x: targetX,
        transition: { duration: 0.5, ease: 'easeInOut' }
      })
    }
  }, [currentIndex, controls, isDragging, totalCardWidth])

  const handlePanStart = () => {
    setIsDragging(true)
    setIsPaused(true)
  }

  const handlePanEnd = (event: any, info: PanInfo) => {
    setIsDragging(false)
    
    const threshold = 50 // minimum drag distance to trigger slide change
    const maxIndex = communities.length - 1
    
    if (info.offset.x > threshold && currentIndex > 0) {
      // Dragged right - go to previous
      setCurrentIndex(prev => prev - 1)
    } else if (info.offset.x < -threshold && currentIndex < maxIndex) {
      // Dragged left - go to next
      setCurrentIndex(prev => prev + 1)
    }
    
    // Resume auto-scroll after a delay
    setTimeout(() => setIsPaused(false), 3000)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsPaused(true)
    setTimeout(() => setIsPaused(false), 5000)
  }

  const goToPrevious = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : communities.length - 1)
    setIsPaused(true)
    setTimeout(() => setIsPaused(false), 3000)
  }

  const goToNext = () => {
    setCurrentIndex(prev => prev < communities.length - 1 ? prev + 1 : 0)
    setIsPaused(true)
    setTimeout(() => setIsPaused(false), 3000)
  }

  if (communities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🌱</div>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">
          Be the First to Create Change
        </h3>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          No communities yet, but that's where you come in. Start the first community and lead the way to meaningful impact.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-gradient-to-r from-teal-600 to-purple-600 text-white font-bold py-3 px-8 rounded-xl hover:shadow-lg transition-all duration-300"
        >
          Start First Community
        </Link>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Navigation Controls */}
      {communities.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 transition-all duration-200 hover:scale-110"
            aria-label="Previous communities"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 transition-all duration-200 hover:scale-110"
            aria-label="Next communities"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Carousel Container */}
      <div className="overflow-hidden" ref={containerRef}>
        <motion.div
          className="flex space-x-6"
          animate={controls}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onPanStart={handlePanStart}
          onPanEnd={handlePanEnd}
          drag="x"
          dragConstraints={{ left: -(communities.length - 1) * totalCardWidth, right: 0 }}
          dragElastic={0.1}
          style={{ width: `${communities.length * totalCardWidth}px` }}
        >
        {communities.map((community, index) => (
          <motion.div
            key={`${community.id}-${index}`}
            className="flex-shrink-0 w-80"
            whileHover={{ scale: 1.05, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Link href={`/communities/${community.id}`}>
              <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden h-full hover:shadow-xl transition-all duration-300">
                {/* Community Image or Placeholder */}
                <div className="h-48 bg-gradient-to-br from-teal-100 to-purple-100 relative overflow-hidden">
                  {community.image_url ? (
                    <img 
                      src={community.image_url} 
                      alt={community.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-6xl opacity-40">🌍</div>
                    </div>
                  )}
                  
                  {/* Activity Badge */}
                  {community.recent_activity && community.recent_activity.count > 0 && (
                    <div className="absolute top-4 right-4 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {community.recent_activity.count} new this month
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1">
                    {community.name}
                  </h3>
                  
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                    {community.description || 'Building a better future together through community action and collaboration.'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      <span>{community.member_count} members</span>
                    </div>
                    
                    {community.address && (
                      <div className="flex items-center gap-1 truncate max-w-[150px]">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="truncate">{community.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Core Values */}
                  {community.core_values.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {community.core_values.slice(0, 3).map((value, valueIndex) => (
                        <span 
                          key={valueIndex}
                          className="bg-gradient-to-r from-teal-100 to-purple-100 text-teal-700 text-xs px-3 py-1 rounded-full font-medium"
                        >
                          {value}
                        </span>
                      ))}
                      {community.core_values.length > 3 && (
                        <span className="text-xs text-slate-500 px-3 py-1 bg-slate-100 rounded-full">
                          +{community.core_values.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
        </motion.div>
      </div>

      {/* Pagination Dots */}
      {communities.length > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          {communities.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentIndex 
                  ? 'bg-teal-500 scale-125' 
                  : 'bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Go to community ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
