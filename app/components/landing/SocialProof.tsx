'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface ImpactStats {
  total_funds_raised: number
  active_communities: number
  needs_fulfilled: number
  total_members: number
}

interface SocialProofProps {
  stats: ImpactStats
}

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Community Leader',
    community: 'Green Valley Initiative',
    quote: 'Through Crowd Conscious, we raised $15,000 for our community garden in just 3 weeks. The transparent voting system gave everyone a voice.',
    avatar: '👩‍🌾'
  },
  {
    name: 'Marcus Rodriguez',
    role: 'Environmental Advocate',
    community: 'Urban Clean Air Project',
    quote: 'The platform made it easy to track our impact metrics. We reduced local air pollution by 23% and engaged over 200 community members.',
    avatar: '🌱'
  },
  {
    name: 'Dr. Amara Okafor',
    role: 'Sustainability Director',
    community: 'Renewable Energy Collective',
    quote: 'Brand partnerships through Crowd Conscious helped us install solar panels for 50 homes. The governance model ensures community ownership.',
    avatar: '☀️'
  }
]

const brandLogos = [
  { name: 'EcoTech', logo: '🌿' },
  { name: 'GreenFuture', logo: '🔋' },
  { name: 'SustainCorp', logo: '♻️' },
  { name: 'CleanEnergy', logo: '💚' },
  { name: 'EarthFirst', logo: '🌍' },
  { name: 'RenewCo', logo: '🌞' }
]

export default function SocialProof({ stats }: SocialProofProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-20%' })

  return (
    <section ref={ref} className="py-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Testimonials */}
        <div className="text-center mb-16">
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-slate-900 mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8 }}
          >
            Voices of Change
          </motion.h2>
          <motion.p
            className="text-xl text-slate-600 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Real stories from community leaders creating measurable impact
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300"
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="text-4xl mb-4">{testimonial.avatar}</div>
              
              <blockquote className="text-slate-700 text-lg mb-6 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>
              
              <div className="border-t border-slate-100 pt-4">
                <div className="font-semibold text-slate-900">{testimonial.name}</div>
                <div className="text-sm text-slate-600">{testimonial.role}</div>
                <div className="text-sm text-teal-600 font-medium">{testimonial.community}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Dashboard */}
        <motion.div
          className="bg-gradient-to-r from-teal-600 to-purple-600 rounded-3xl p-8 md:p-12 text-white mb-20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Global Impact Dashboard
            </h3>
            <p className="text-teal-100 text-lg max-w-2xl mx-auto">
              Real-time metrics showing the collective impact of our community network
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <motion.div
                className="text-4xl md:text-5xl font-bold mb-2"
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : { scale: 0 }}
                transition={{ duration: 0.6, delay: 0.5, type: 'spring' }}
              >
                ${(stats.total_funds_raised / 1000).toFixed(0)}K+
              </motion.div>
              <div className="text-teal-100">Total Funding</div>
            </div>
            
            <div className="text-center">
              <motion.div
                className="text-4xl md:text-5xl font-bold mb-2"
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : { scale: 0 }}
                transition={{ duration: 0.6, delay: 0.6, type: 'spring' }}
              >
                {stats.active_communities}+
              </motion.div>
              <div className="text-teal-100">Communities</div>
            </div>
            
            <div className="text-center">
              <motion.div
                className="text-4xl md:text-5xl font-bold mb-2"
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : { scale: 0 }}
                transition={{ duration: 0.6, delay: 0.7, type: 'spring' }}
              >
                {stats.needs_fulfilled}+
              </motion.div>
              <div className="text-teal-100">Projects Completed</div>
            </div>
            
            <div className="text-center">
              <motion.div
                className="text-4xl md:text-5xl font-bold mb-2"
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : { scale: 0 }}
                transition={{ duration: 0.6, delay: 0.8, type: 'spring' }}
              >
                {stats.total_members}+
              </motion.div>
              <div className="text-teal-100">Active Members</div>
            </div>
          </div>
        </motion.div>

        {/* Brand Partners */}
        <div className="text-center">
          <motion.h3
            className="text-2xl md:text-3xl font-bold text-slate-900 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Trusted by Leading Brands
          </motion.h3>
          
          <motion.div
            className="flex flex-wrap justify-center items-center gap-8 md:gap-12"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {brandLogos.map((brand, index) => (
              <motion.div
                key={brand.name}
                className="flex items-center gap-3 bg-white rounded-xl px-6 py-3 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              >
                <span className="text-2xl">{brand.logo}</span>
                <span className="font-semibold text-slate-700">{brand.name}</span>
              </motion.div>
            ))}
          </motion.div>
          
          <motion.p
            className="text-slate-600 mt-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            Companies partner with us to fund community projects and demonstrate real environmental impact
          </motion.p>
        </div>
      </div>
    </section>
  )
}
