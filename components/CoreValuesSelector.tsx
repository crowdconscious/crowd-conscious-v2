'use client'

import { useState } from 'react'

interface CoreValueOption {
  id: string
  label: string
  emoji: string
  color: string
}

const CORE_VALUES: CoreValueOption[] = [
  { id: 'clean_air', label: 'Clean Air', emoji: '🌬️', color: 'bg-sky-100 text-sky-700 border-sky-300' },
  { id: 'clean_water', label: 'Clean Water', emoji: '💧', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'zero_waste', label: 'Zero Waste', emoji: '♻️', color: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'safe_cities', label: 'Safe Cities', emoji: '🏙️', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'biodiversity', label: 'Biodiversity', emoji: '🌿', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { id: 'fair_trade', label: 'Fair Trade', emoji: '🤝', color: 'bg-amber-100 text-amber-700 border-amber-300' },
]

interface CoreValuesSelectorProps {
  selected: string[]
  onChange: (values: string[]) => void
  minRequired?: number
  className?: string
}

export default function CoreValuesSelector({
  selected,
  onChange,
  minRequired = 3,
  className = ''
}: CoreValuesSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  const toggleValue = (valueId: string) => {
    if (selected.includes(valueId)) {
      // Remove if already selected
      onChange(selected.filter(v => v !== valueId))
    } else {
      // Add if not selected
      onChange([...selected, valueId])
    }
  }

  const getValueData = (id: string) => {
    return CORE_VALUES.find(v => v.id === id)
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Core Values * (minimum {minRequired})
      </label>
      
      {/* Selected Values */}
      <div className="flex flex-wrap gap-2 mb-3 min-h-[42px]">
        {selected.length === 0 ? (
          <span className="text-sm text-slate-400 py-2">
            Select at least {minRequired} core values that guide your community
          </span>
        ) : (
          selected.map(valueId => {
            const value = getValueData(valueId)
            if (!value) return null
            return (
              <span
                key={valueId}
                className={`${value.color} px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border`}
              >
                <span>{value.emoji}</span>
                <span>{value.label}</span>
                <button
                  type="button"
                  onClick={() => toggleValue(valueId)}
                  className="ml-1 text-current opacity-70 hover:opacity-100 font-bold"
                >
                  ×
                </button>
              </span>
            )
          })
        )}
      </div>

      {/* Dropdown Toggle Button */}
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-left flex justify-between items-center"
      >
        <span className="text-slate-600">
          {selected.length === 0 
            ? 'Select core values...' 
            : `${selected.length} value${selected.length === 1 ? '' : 's'} selected`
          }
        </span>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Options */}
      {showDropdown && (
        <div className="mt-2 border border-slate-300 rounded-lg bg-white shadow-lg overflow-hidden">
          {CORE_VALUES.map(value => {
            const isSelected = selected.includes(value.id)
            return (
              <button
                key={value.id}
                type="button"
                onClick={() => toggleValue(value.id)}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                  isSelected ? 'bg-teal-50' : ''
                }`}
              >
                <span className="text-2xl">{value.emoji}</span>
                <span className="flex-1 font-medium text-slate-700">{value.label}</span>
                {isSelected && (
                  <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}

      <p className="text-sm text-slate-500 mt-2">
        These values will guide your community's decisions and attract like-minded members.
        {selected.length < minRequired && (
          <span className="text-amber-600 font-medium ml-1">
            (Select at least {minRequired - selected.length} more)
          </span>
        )}
      </p>
    </div>
  )
}

// Export the core values array for use in other components
export { CORE_VALUES }
export type { CoreValueOption }

