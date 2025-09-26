'use client'

import { useEffect, useState } from 'react'
import { ImpactBadge } from '../ui/Badge'
import { cn } from '@/lib/design-system'

interface Member {
  id: string
  role: 'founder' | 'admin' | 'member'
  profiles: {
    full_name: string | null
    email: string | null
    avatar_url?: string | null
  } | null
}

interface Community {
  id: string
  name: string
  description: string | null
  image_url: string | null
  address: string | null
  core_values: string[]
  member_count: number
  created_at: string
}

interface ImmersiveHeaderProps {
  community: Community
  members: Member[]
  userMembership: { role: string } | null
  onJoinCommunity?: () => void
  children?: React.ReactNode
}

export default function ImmersiveHeader({
  community,
  members,
  userMembership,
  onJoinCommunity,
  children
}: ImmersiveHeaderProps) {
  const [scrollY, setScrollY] = useState(0)
  const [isActivityLive, setIsActivityLive] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Simulate live activity indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setIsActivityLive(prev => !prev)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const parallaxOffset = scrollY * 0.5
  const headerHeight = 400

  // Get member avatars for floating effect
  const displayMembers = members.slice(0, 8)
  const additionalMemberCount = Math.max(0, community.member_count - displayMembers.length)

  // Map core values to impact types
  const getImpactType = (value: string): 'clean-air' | 'clean-water' | 'safe-cities' | 'zero-waste' | 'fair-trade' => {
    const lowerValue = value.toLowerCase()
    if (lowerValue.includes('air') || lowerValue.includes('climate')) return 'clean-air'
    if (lowerValue.includes('water') || lowerValue.includes('ocean')) return 'clean-water'
    if (lowerValue.includes('city') || lowerValue.includes('safety') || lowerValue.includes('urban')) return 'safe-cities'
    if (lowerValue.includes('waste') || lowerValue.includes('recycle') || lowerValue.includes('circular')) return 'zero-waste'
    if (lowerValue.includes('trade') || lowerValue.includes('social') || lowerValue.includes('economic')) return 'fair-trade'
    return 'clean-air' // default
  }

  return (
    <div className="relative overflow-hidden" style={{ height: headerHeight }}>
      {/* Parallax Background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-teal-600 via-purple-600 to-purple-800"
        style={{
          transform: `translateY(${parallaxOffset}px)`,
          height: `${headerHeight + 200}px`,
        }}
      >
        {/* Background Image with Overlay */}
        {community.image_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{
              backgroundImage: `url(${community.image_url})`,
              transform: `translateY(${-parallaxOffset * 0.3}px)`,
            }}
          />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Animated Particles */}
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full animate-floating"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 text-white">
        <div className="max-w-4xl mx-auto w-full">
          
          {/* Live Activity Indicator */}
          <div className="flex items-center gap-2 mb-4">
            <div className={cn(
              "w-3 h-3 rounded-full transition-colors duration-1000",
              isActivityLive ? "bg-green-400 animate-pulse" : "bg-green-600"
            )} />
            <span className="text-sm text-green-200 font-medium">
              {isActivityLive ? "Live activity" : "Community active"}
            </span>
          </div>

          {/* Community Name */}
          <h1 
            className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-teal-100 bg-clip-text text-transparent"
            style={{
              transform: `translateY(${parallaxOffset * 0.2}px)`,
            }}
          >
            {community.name}
          </h1>

          {/* Location */}
          {community.address && (
            <p className="text-xl text-teal-100 mb-6 flex items-center gap-2">
              <span>📍</span>
              {community.address}
            </p>
          )}

          {/* Description */}
          <p 
            className="text-lg text-white/90 mb-8 max-w-2xl leading-relaxed"
            style={{
              transform: `translateY(${parallaxOffset * 0.3}px)`,
            }}
          >
            {community.description}
          </p>

          {/* Animated Core Value Badges */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-teal-200 mb-3 uppercase tracking-wide">
              Our Impact Areas
            </h3>
            <div className="flex flex-wrap gap-3">
              {community.core_values.map((value, index) => (
                <div
                  key={index}
                  className="transform transition-all duration-500 hover:scale-110 hover:rotate-1"
                  style={{
                    animationDelay: `${index * 200}ms`,
                  }}
                >
                  <ImpactBadge
                    impact={getImpactType(value)}
                    className="text-sm font-semibold shadow-lg backdrop-blur-sm bg-white/20 border border-white/30"
                  >
                    {value}
                  </ImpactBadge>
                </div>
              ))}
            </div>
          </div>

          {/* Floating Member Avatars */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-3">
              <h3 className="text-sm font-medium text-teal-200 uppercase tracking-wide">
                Community Members
              </h3>
              <span className="text-2xl font-bold text-white">
                {community.member_count}
              </span>
            </div>
            
            <div className="flex items-center">
              {/* Member Avatars */}
              <div className="flex -space-x-3">
                {displayMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className="relative transform transition-all duration-300 hover:scale-110 hover:z-10"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      transform: `translateY(${Math.sin((scrollY + index * 100) * 0.01) * 5}px)`,
                    }}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/30 to-white/10 border-2 border-white/50 backdrop-blur-sm flex items-center justify-center shadow-lg">
                      {member.profiles?.avatar_url ? (
                        <img
                          src={member.profiles.avatar_url}
                          alt={member.profiles.full_name || 'Member'}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {(member.profiles?.full_name || member.profiles?.email || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    {/* Role indicator */}
                    {member.role === 'founder' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border border-white flex items-center justify-center">
                        <span className="text-xs">👑</span>
                      </div>
                    )}
                    {member.role === 'admin' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full border border-white flex items-center justify-center">
                        <span className="text-xs">⭐</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Additional members indicator */}
                {additionalMemberCount > 0 && (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500/80 to-purple-500/80 border-2 border-white/50 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <span className="text-white font-semibold text-xs">
                      +{additionalMemberCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {!userMembership ? (
              <button
                onClick={onJoinCommunity}
                className="group relative px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 rounded-xl font-bold text-lg shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-3xl"
              >
                <span className="relative z-10">Join Community</span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300" />
              </button>
            ) : (
              <div className="flex items-center gap-3 px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl">
                <span className="text-green-300 text-xl">✓</span>
                <span className="font-semibold capitalize">
                  {userMembership.role} Member
                </span>
              </div>
            )}
            
            {children}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white/70 animate-bounce">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </div>
  )
}
