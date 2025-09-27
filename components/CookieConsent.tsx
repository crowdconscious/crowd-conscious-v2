'use client'

import { useState, useEffect } from 'react'
import { AnimatedCard } from './ui/UIComponents'
import Link from 'next/link'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem('cookie-consent')
    if (!hasConsented) {
      setShowBanner(true)
    }

    // Detect language from browser or previous setting
    const savedLanguage = localStorage.getItem('preferred-language') as 'es' | 'en'
    const browserLanguage = navigator.language.startsWith('es') ? 'es' : 'en'
    setLanguage(savedLanguage || browserLanguage)
  }, [])

  const handleAcceptAll = () => {
    localStorage.setItem('cookie-consent', 'all')
    localStorage.setItem('analytics-cookies', 'true')
    localStorage.setItem('marketing-cookies', 'true')
    setShowBanner(false)
  }

  const handleAcceptEssential = () => {
    localStorage.setItem('cookie-consent', 'essential')
    localStorage.setItem('analytics-cookies', 'false')
    localStorage.setItem('marketing-cookies', 'false')
    setShowBanner(false)
  }

  const content = {
    es: {
      title: "🍪 Usamos Cookies",
      description: "Utilizamos cookies para mejorar su experiencia, analizar el tráfico del sitio y personalizar el contenido. También incluimos una comisión del 15% en todas las transacciones de patrocinio.",
      essential: "Solo Esenciales",
      acceptAll: "Aceptar Todas",
      learnMore: "Más información",
      platformFee: "📋 Transparencia: Cobramos una comisión del 15% en todas las transacciones para mantener la plataforma."
    },
    en: {
      title: "🍪 We Use Cookies",
      description: "We use cookies to improve your experience, analyze site traffic, and personalize content. We also include a 15% commission on all sponsorship transactions.",
      essential: "Essential Only",
      acceptAll: "Accept All",
      learnMore: "Learn more",
      platformFee: "📋 Transparency: We charge a 15% commission on all transactions to maintain the platform."
    }
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <AnimatedCard className="bg-white border-2 border-gray-200 shadow-lg max-w-4xl mx-auto">
        <div className="p-6">
          {/* Language Toggle */}
          <div className="flex justify-end mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('es')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  language === 'es'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ES
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  language === 'en'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">
                {content[language].title}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {content[language].description}
              </p>
              
              {/* Platform Fee Notice */}
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-3">
                <p className="text-xs text-teal-800 font-medium">
                  {content[language].platformFee}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Link 
                  href="/cookies" 
                  className="text-teal-600 hover:text-teal-700 underline"
                >
                  {content[language].learnMore}
                </Link>
                <span className="text-gray-400">•</span>
                <Link 
                  href="/privacy" 
                  className="text-teal-600 hover:text-teal-700 underline"
                >
                  {language === 'es' ? 'Privacidad' : 'Privacy'}
                </Link>
                <span className="text-gray-400">•</span>
                <Link 
                  href="/terms" 
                  className="text-teal-600 hover:text-teal-700 underline"
                >
                  {language === 'es' ? 'Términos' : 'Terms'}
                </Link>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 md:ml-4">
              <button
                onClick={handleAcceptEssential}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {content[language].essential}
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-600 to-purple-600 hover:from-teal-700 hover:to-purple-700 rounded-lg transition-colors"
              >
                {content[language].acceptAll}
              </button>
            </div>
          </div>
        </div>
      </AnimatedCard>
    </div>
  )
}
