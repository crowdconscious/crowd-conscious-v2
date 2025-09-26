'use client'

import { motion, useInView, useSpring, useTransform } from 'framer-motion'
import { useRef, useEffect } from 'react'

interface ImpactStats {
  total_funds_raised: number
  active_communities: number
  needs_fulfilled: number
  total_members: number
}

interface ImpactCountersProps {
  stats: ImpactStats
}

function AnimatedCounter({ value, prefix = '', suffix = '', duration = 2 }: {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })
  
  const spring = useSpring(0, { 
    stiffness: 100, 
    damping: 30,
    restDelta: 0.001
  })
  
  const display = useTransform(spring, (latest) => {
    if (value < 1000) {
      return prefix + Math.floor(latest).toLocaleString() + suffix
    } else {
      return prefix + (latest / 1000).toFixed(1) + 'K' + suffix
    }
  })

  useEffect(() => {
    if (isInView) {
      spring.set(value)
    }
  }, [isInView, spring, value])

  return (
    <motion.span 
      ref={ref}
      className="font-bold text-4xl md:text-5xl lg:text-6xl bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent"
    >
      {display}
    </motion.span>
  )
}

export default function ImpactCounters({ stats }: ImpactCountersProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-20%' })

  return (
    <section 
      ref={ref}
      className="py-20 bg-white border-b border-slate-100"
    >
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Real Impact, Real Numbers
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Our platform has facilitated meaningful change across communities worldwide
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <motion.div
            className="text-center group"
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div className="mb-4">
              <AnimatedCounter value={stats.total_funds_raised} prefix="$" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
              Funds Raised
            </h3>
            <p className="text-slate-600 text-sm md:text-base">
              Total funding secured for community projects
            </p>
            <motion.div 
              className="w-12 h-1 bg-gradient-to-r from-teal-500 to-purple-500 mx-auto mt-4 rounded-full"
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            />
          </motion.div>

          <motion.div
            className="text-center group"
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="mb-4">
              <AnimatedCounter value={stats.active_communities} />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
              Active Communities
            </h3>
            <p className="text-slate-600 text-sm md:text-base">
              Communities creating positive change
            </p>
            <motion.div 
              className="w-12 h-1 bg-gradient-to-r from-purple-500 to-teal-500 mx-auto mt-4 rounded-full"
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            />
          </motion.div>

          <motion.div
            className="text-center group"
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="mb-4">
              <AnimatedCounter value={stats.needs_fulfilled} />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
              Needs Fulfilled
            </h3>
            <p className="text-slate-600 text-sm md:text-base">
              Community projects completed successfully
            </p>
            <motion.div 
              className="w-12 h-1 bg-gradient-to-r from-teal-500 to-purple-500 mx-auto mt-4 rounded-full"
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            />
          </motion.div>

          <motion.div
            className="text-center group"
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="mb-4">
              <AnimatedCounter value={stats.total_members} />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
              Community Members
            </h3>
            <p className="text-slate-600 text-sm md:text-base">
              Changemakers actively participating
            </p>
            <motion.div 
              className="w-12 h-1 bg-gradient-to-r from-purple-500 to-teal-500 mx-auto mt-4 rounded-full"
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            />
          </motion.div>
        </div>

        {/* Impact Categories */}
        <motion.div 
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          {[
            { icon: '🌱', label: 'Clean Air', color: 'from-green-400 to-emerald-500' },
            { icon: '💧', label: 'Clean Water', color: 'from-blue-400 to-cyan-500' },
            { icon: '🏙️', label: 'Safe Cities', color: 'from-purple-400 to-pink-500' },
            { icon: '♻️', label: 'Zero Waste', color: 'from-orange-400 to-amber-500' }
          ].map((category, index) => (
            <motion.div
              key={category.label}
              className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300"
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-4xl mb-3">{category.icon}</div>
              <h4 className="font-semibold text-slate-900 mb-2">{category.label}</h4>
              <div className={`w-8 h-1 bg-gradient-to-r ${category.color} mx-auto rounded-full`} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
