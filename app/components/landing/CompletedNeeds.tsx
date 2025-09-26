'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface CompletedNeed {
  id: string
  title: string
  description: string | null
  image_url: string | null
  funding_goal: number
  current_funding: number
  completion_date: string
  community_name: string
}

interface CompletedNeedsProps {
  needs: CompletedNeed[]
}

export default function CompletedNeeds({ needs }: CompletedNeedsProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })

  if (needs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🚀</div>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">
          Ready to Create the First Success Story?
        </h3>
        <p className="text-slate-600 max-w-md mx-auto">
          No completed projects yet, but every movement starts with a single step. Be part of the first wave of change.
        </p>
      </div>
    )
  }

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {needs.map((need, index) => {
        const fundingPercentage = (need.current_funding / need.funding_goal) * 100
        
        return (
          <motion.div
            key={need.id}
            className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300"
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            whileHover={{ y: -5 }}
          >
            {/* Project Image */}
            <div className="h-48 bg-gradient-to-br from-green-100 to-emerald-100 relative overflow-hidden">
              {need.image_url ? (
                <img 
                  src={need.image_url} 
                  alt={need.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-6xl opacity-40">✅</div>
                </div>
              )}
              
              {/* Completion Badge */}
              <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Completed
              </div>
            </div>

            <div className="p-6">
              <div className="mb-2">
                <span className="text-sm text-teal-600 font-medium">
                  {need.community_name}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2">
                {need.title}
              </h3>
              
              <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                {need.description || 'Successfully funded community project creating positive impact.'}
              </p>

              {/* Funding Progress */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    Funding Achieved
                  </span>
                  <span className="text-sm font-bold text-green-600">
                    {fundingPercentage.toFixed(0)}%
                  </span>
                </div>
                
                <div className="relative">
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <motion.div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full relative overflow-hidden"
                      initial={{ width: 0 }}
                      animate={isInView ? { width: `${Math.min(100, fundingPercentage)}%` } : { width: 0 }}
                      transition={{ duration: 1.5, delay: index * 0.1 + 0.5 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse" />
                    </motion.div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span className="text-slate-600">
                    Raised: <span className="font-semibold text-slate-900">${need.current_funding.toLocaleString()}</span>
                  </span>
                  <span className="text-slate-600">
                    Goal: <span className="font-semibold text-slate-900">${need.funding_goal.toLocaleString()}</span>
                  </span>
                </div>
              </div>

              {/* Completion Date */}
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Completed</span>
                <span>{new Date(need.completion_date).toLocaleDateString()}</span>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
