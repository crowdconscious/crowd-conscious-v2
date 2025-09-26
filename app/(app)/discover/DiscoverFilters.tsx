'use client'

import { useState } from 'react'
import { AnimatedButton } from '@/components/ui/UIComponents'

export default function DiscoverFilters() {
  const [activeFilters, setActiveFilters] = useState({
    coreValues: [] as string[],
    location: '',
    memberCount: '',
    sortBy: 'trending'
  })

  const coreValueOptions = [
    { value: 'clean_air', label: 'Clean Air', color: 'bg-sky-100 text-sky-700' },
    { value: 'clean_water', label: 'Clean Water', color: 'bg-blue-100 text-blue-700' },
    { value: 'zero_waste', label: 'Zero Waste', color: 'bg-amber-100 text-amber-700' },
    { value: 'safe_cities', label: 'Safe Cities', color: 'bg-pink-100 text-pink-700' },
    { value: 'fair_trade', label: 'Fair Trade', color: 'bg-green-100 text-green-700' },
    { value: 'renewable_energy', label: 'Renewable Energy', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'biodiversity', label: 'Biodiversity', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'social_justice', label: 'Social Justice', color: 'bg-purple-100 text-purple-700' }
  ]

  const sortOptions = [
    { value: 'trending', label: '🔥 Trending' },
    { value: 'newest', label: '✨ Newest' },
    { value: 'members', label: '👥 Most Members' },
    { value: 'activity', label: '⚡ Most Active' }
  ]

  const memberCountOptions = [
    { value: '', label: 'Any Size' },
    { value: '1-10', label: '1-10 members' },
    { value: '11-50', label: '11-50 members' },
    { value: '51-100', label: '51-100 members' },
    { value: '100+', label: '100+ members' }
  ]

  const toggleCoreValue = (value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      coreValues: prev.coreValues.includes(value)
        ? prev.coreValues.filter(v => v !== value)
        : [...prev.coreValues, value]
    }))
  }

  const clearFilters = () => {
    setActiveFilters({
      coreValues: [],
      location: '',
      memberCount: '',
      sortBy: 'trending'
    })
  }

  const hasActiveFilters = activeFilters.coreValues.length > 0 || 
                          activeFilters.location || 
                          activeFilters.memberCount || 
                          activeFilters.sortBy !== 'trending'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Filter & Search</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Search Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Search Communities
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, description, or values..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
            <span className="absolute left-3 top-3 text-slate-400">🔍</span>
          </div>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Sort By
          </label>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setActiveFilters(prev => ({ ...prev, sortBy: option.value }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeFilters.sortBy === option.value
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Core Values Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Core Values
          </label>
          <div className="flex flex-wrap gap-2">
            {coreValueOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleCoreValue(option.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeFilters.coreValues.includes(option.value)
                    ? `${option.color} ring-2 ring-offset-2 ring-teal-500 scale-105`
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Location
            </label>
            <input
              type="text"
              placeholder="City, state, or zip code"
              value={activeFilters.location}
              onChange={(e) => setActiveFilters(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Community Size
            </label>
            <select
              value={activeFilters.memberCount}
              onChange={(e) => setActiveFilters(prev => ({ ...prev, memberCount: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            >
              {memberCountOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Active Filters:</h4>
            <div className="flex flex-wrap gap-2">
              {activeFilters.coreValues.map((value) => {
                const option = coreValueOptions.find(o => o.value === value)
                return (
                  <span
                    key={value}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${option?.color || 'bg-slate-100 text-slate-700'}`}
                  >
                    {option?.label}
                    <button
                      onClick={() => toggleCoreValue(value)}
                      className="hover:text-red-600"
                    >
                      ✕
                    </button>
                  </span>
                )
              })}
              
              {activeFilters.location && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  📍 {activeFilters.location}
                  <button
                    onClick={() => setActiveFilters(prev => ({ ...prev, location: '' }))}
                    className="hover:text-red-600"
                  >
                    ✕
                  </button>
                </span>
              )}
              
              {activeFilters.memberCount && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  👥 {memberCountOptions.find(o => o.value === activeFilters.memberCount)?.label}
                  <button
                    onClick={() => setActiveFilters(prev => ({ ...prev, memberCount: '' }))}
                    className="hover:text-red-600"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Apply Filters Button */}
        <div className="pt-4">
          <AnimatedButton
            onClick={() => {
              // Apply filters logic here
              console.log('Applying filters:', activeFilters)
            }}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Apply Filters ({hasActiveFilters ? 'Active' : 'All Communities'})
          </AnimatedButton>
        </div>
      </div>
    </div>
  )
}
