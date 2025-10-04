'use client'

import { useState, useEffect } from 'react'
import { createClientAuth } from '@/lib/auth'

interface TrustedBrand {
  brand_name: string
  brand_logo_url: string | null
  brand_website: string | null
  sponsorship_count: number
  total_sponsored: number
}

export default function TrustedBrands() {
  const [brands, setBrands] = useState<TrustedBrand[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientAuth()

  useEffect(() => {
    fetchTrustedBrands()
  }, [])

  const fetchTrustedBrands = async () => {
    try {
      // Query the trusted_brands materialized view
      const { data, error } = await supabase
        .from('trusted_brands')
        .select('*')
        .order('total_sponsored', { ascending: false })
        .limit(12)

      if (error) {
        console.error('Error fetching trusted brands:', error)
        return
      }

      setBrands(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Trusted by Leading Brands
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Companies making a real impact in communities worldwide
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="w-full h-16 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (brands.length === 0) {
    return null // Don't show section if no brands yet
  }

  return (
    <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Trusted by Leading Brands
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Companies making a real impact in communities worldwide
          </p>
        </div>

        {/* Brands Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {brands.map((brand) => (
            <a
              key={brand.brand_name}
              href={brand.brand_website || '#'}
              target={brand.brand_website ? '_blank' : undefined}
              rel={brand.brand_website ? 'noopener noreferrer' : undefined}
              className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col items-center justify-center"
            >
              {brand.brand_logo_url ? (
                <img
                  src={brand.brand_logo_url}
                  alt={brand.brand_name}
                  className="w-full h-16 object-contain mb-3 opacity-60 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <div className="w-full h-16 flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-slate-300 group-hover:text-teal-600 transition-colors">
                    {brand.brand_name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              
              <h3 className="text-sm font-medium text-slate-700 group-hover:text-teal-600 text-center transition-colors">
                {brand.brand_name}
              </h3>
              
              <p className="text-xs text-slate-500 mt-1">
                ${brand.total_sponsored.toLocaleString()} sponsored
              </p>
            </a>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">
            Want to see your brand here?
          </p>
          <a
            href="/communities"
            className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Sponsor a Community
          </a>
        </div>
      </div>
    </section>
  )
}
