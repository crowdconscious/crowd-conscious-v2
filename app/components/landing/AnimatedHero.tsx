'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface ImpactStats {
  total_funds_raised: number
  active_communities: number
  needs_fulfilled: number
  total_members: number
}

interface AnimatedHeroProps {
  impactStats: ImpactStats
}

export default function AnimatedHero({ impactStats }: AnimatedHeroProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-600 via-teal-700 to-purple-700">
        <div className="text-center text-white">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">Crowd Conscious</h1>
          <p className="text-xl md:text-2xl opacity-90">Loading...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-teal-700 to-purple-700">
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              'radial-gradient(600px circle at 0% 0%, rgba(120, 119, 198, 0.3), transparent 50%)',
              'radial-gradient(600px circle at 100% 100%, rgba(120, 119, 198, 0.3), transparent 50%)',
              'radial-gradient(600px circle at 0% 100%, rgba(120, 119, 198, 0.3), transparent 50%)',
              'radial-gradient(600px circle at 100% 0%, rgba(120, 119, 198, 0.3), transparent 50%)',
              'radial-gradient(600px circle at 0% 0%, rgba(120, 119, 198, 0.3), transparent 50%)',
            ],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center text-white px-4 max-w-6xl mx-auto">
        {/* Logo - Much Bigger as Protagonist */}
        <motion.div
          className="flex justify-center mb-12"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, type: 'spring', delay: 0.1 }}
        >
          <div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 relative flex items-center justify-center">
            <Image
              src="/images/logo.png"
              alt="Crowd Conscious Logo"
              width={192}
              height={192}
              className="w-full h-full object-contain brightness-0 invert drop-shadow-2xl"
              priority
            />
          </div>
        </motion.div>

        <motion.h1
          className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 bg-gradient-to-r from-white to-teal-100 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          Crowd Conscious
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl lg:text-3xl mb-8 text-teal-100 max-w-4xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          Communities creating <span className="text-white font-semibold">measurable impact</span> through 
          transparent governance and <span className="text-white font-semibold">brand partnerships</span>
        </motion.p>

        {/* Live Stats Preview */}
        <motion.div
          className="flex flex-wrap justify-center gap-6 md:gap-8 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white">
              ${(impactStats.total_funds_raised / 1000).toFixed(1)}K
            </div>
            <div className="text-teal-200 text-sm md:text-base">Funds Raised</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white">
              {impactStats.active_communities}
            </div>
            <div className="text-teal-200 text-sm md:text-base">Communities</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white">
              {impactStats.needs_fulfilled}
            </div>
            <div className="text-teal-200 text-sm md:text-base">Needs Fulfilled</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white">
              {impactStats.total_members}
            </div>
            <div className="text-teal-200 text-sm md:text-base">Members</div>
          </div>
        </motion.div>

        {/* High Contrast CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.1 }}
        >
          <Link 
            href="/signup" 
            className="group relative w-full sm:w-auto px-8 py-4 min-w-[220px] bg-white text-teal-700 rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300"
          >
            Start a Community
          </Link>

          <Link 
            href="/login" 
            className="group relative w-full sm:w-auto px-8 py-4 min-w-[220px] border-2 border-white text-white rounded-xl font-semibold text-lg hover:bg-white hover:text-teal-700 transition-all duration-300"
          >
            Join Community
          </Link>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
        >
          <motion.div
            className="w-6 h-10 border-2 border-white border-opacity-50 rounded-full flex justify-center"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div 
              className="w-1 h-3 bg-white rounded-full mt-2"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
