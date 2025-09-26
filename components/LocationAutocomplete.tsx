'use client'

import { useState, useEffect, useRef } from 'react'
import { AnimatedButton } from '@/components/ui/UIComponents'

interface LocationResult {
  place_id: string
  display_name: string
  lat: string
  lon: string
  address: {
    house_number?: string
    road?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
  }
}

interface LocationAutocompleteProps {
  value: string
  onChange: (location: string, coordinates?: { lat: number; lng: number }) => void
  placeholder?: string
  className?: string
}

export default function LocationAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Enter location...",
  className = ""
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<LocationResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()
  const containerRef = useRef<HTMLDivElement>(null)

  // Search using Nominatim (OpenStreetMap) - free alternative to Google Places
  const searchLocations = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      // Using Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchQuery)}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=5&` +
        `countrycodes=us,mx,ca`, // Focus on North America
        {
          headers: {
            'User-Agent': 'CrowdConscious/1.0' // Required by Nominatim
          }
        }
      )
      
      if (!response.ok) throw new Error('Search failed')
      
      const data = await response.json()
      setResults(data)
      setShowResults(true)
    } catch (error) {
      console.error('Location search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      if (query.trim()) {
        searchLocations(query)
      } else {
        setResults([])
        setShowResults(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setQuery(newValue)
    onChange(newValue) // Also update parent with raw text
  }

  const handleLocationSelect = (location: LocationResult) => {
    const formattedAddress = formatAddress(location)
    setQuery(formattedAddress)
    setShowResults(false)
    
    // Pass formatted address and coordinates to parent
    onChange(formattedAddress, {
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lon)
    })
  }

  const formatAddress = (location: LocationResult): string => {
    const addr = location.address
    const parts = []
    
    if (addr.house_number && addr.road) {
      parts.push(`${addr.house_number} ${addr.road}`)
    } else if (addr.road) {
      parts.push(addr.road)
    }
    
    if (addr.city) parts.push(addr.city)
    if (addr.state) parts.push(addr.state)
    if (addr.postcode) parts.push(addr.postcode)
    if (addr.country) parts.push(addr.country)
    
    return parts.join(', ')
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser')
      return
    }

    setIsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        try {
          // Reverse geocoding to get address from coordinates
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?` +
            `lat=${latitude}&` +
            `lon=${longitude}&` +
            `format=json&` +
            `addressdetails=1`,
            {
              headers: {
                'User-Agent': 'CrowdConscious/1.0'
              }
            }
          )
          
          if (response.ok) {
            const data = await response.json()
            const formattedAddress = formatAddress(data)
            setQuery(formattedAddress)
            onChange(formattedAddress, { lat: latitude, lng: longitude })
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error)
          // Fallback to coordinates
          const coordsString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          setQuery(coordsString)
          onChange(coordsString, { lat: latitude, lng: longitude })
        } finally {
          setIsLoading(false)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        alert('Unable to get your location')
        setIsLoading(false)
      }
    )
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            onFocus={() => results.length > 0 && setShowResults(true)}
          />
          
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        
        <AnimatedButton
          onClick={getCurrentLocation}
          variant="secondary"
          size="sm"
          disabled={isLoading}
          className="flex items-center gap-2 px-3"
        >
          <span>📍</span>
          <span className="hidden sm:inline">Current</span>
        </AnimatedButton>
      </div>

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((location) => (
            <button
              key={location.place_id}
              onClick={() => handleLocationSelect(location)}
              className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 focus:bg-slate-50 focus:outline-none"
            >
              <div className="font-medium text-slate-900 text-sm">
                {formatAddress(location)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {location.display_name}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showResults && query.length >= 3 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center text-slate-500 text-sm">
          No locations found. Try a different search term.
        </div>
      )}
    </div>
  )
}
