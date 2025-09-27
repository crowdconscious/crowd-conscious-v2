'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Footer() {
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as 'es' | 'en'
    const browserLanguage = navigator.language.startsWith('es') ? 'es' : 'en'
    setLanguage(savedLanguage || browserLanguage)
  }, [])

  const content = {
    es: {
      platform: "Plataforma",
      communities: "Comunidades",
      brands: "Marcas",
      impact: "Impacto",
      legal: "Legal",
      terms: "Términos y Condiciones",
      privacy: "Aviso de Privacidad",
      cookies: "Política de Cookies",
      support: "Soporte",
      help: "Centro de Ayuda",
      contact: "Contacto",
      about: "Acerca de",
      mission: "Misión",
      team: "Equipo",
      careers: "Carreras",
      description: "Conectando comunidades con marcas para crear impacto social y ambiental medible.",
      rights: "Todos los derechos reservados.",
      platformFee: "Comisión de plataforma: 15% en todas las transacciones",
      madeIn: "Hecho con ❤️ en México"
    },
    en: {
      platform: "Platform",
      communities: "Communities",
      brands: "Brands",
      impact: "Impact",
      legal: "Legal",
      terms: "Terms & Conditions",
      privacy: "Privacy Policy",
      cookies: "Cookie Policy",
      support: "Support",
      help: "Help Center",
      contact: "Contact",
      about: "About",
      mission: "Mission",
      team: "Team",
      careers: "Careers",
      description: "Connecting communities with brands to create measurable social and environmental impact.",
      rights: "All rights reserved.",
      platformFee: "Platform fee: 15% on all transactions",
      madeIn: "Made with ❤️ in Mexico"
    }
  }

  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-purple-500 rounded-lg"></div>
              <span className="text-xl font-bold">Crowd Conscious</span>
            </div>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              {content[language].description}
            </p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setLanguage('es')
                  localStorage.setItem('preferred-language', 'es')
                }}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  language === 'es'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                🇲🇽 ES
              </button>
              <button
                onClick={() => {
                  setLanguage('en')
                  localStorage.setItem('preferred-language', 'en')
                }}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  language === 'en'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                🇺🇸 EN
              </button>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{content[language].platform}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/communities" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].communities}
                </Link>
              </li>
              <li>
                <Link href="/brand/discover" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].brands}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].impact}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{content[language].legal}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].terms}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].privacy}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].cookies}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{content[language].support}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="mailto:help@crowdconscious.mx" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].help}
                </a>
              </li>
              <li>
                <a href="mailto:contact@crowdconscious.mx" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].contact}
                </a>
              </li>
              <li>
                <Link href="/about" className="text-slate-300 hover:text-teal-400 transition-colors">
                  {content[language].about}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Platform Fee Notice */}
        <div className="border-t border-slate-700 pt-6 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-center text-center">
              <div className="text-sm">
                <span className="text-slate-400">💡 </span>
                <span className="text-slate-300 font-medium">
                  {content[language].platformFee}
                </span>
                <span className="text-slate-400 ml-2">
                  ({language === 'es' ? 'Transparencia total' : 'Full transparency'})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-700 pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-sm text-slate-400">
              © {new Date().getFullYear()} Crowd Conscious. {content[language].rights}
            </div>
            <div className="text-sm text-slate-400">
              {content[language].madeIn}
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="flex justify-center gap-6">
            <a 
              href="#" 
              className="text-slate-400 hover:text-teal-400 transition-colors"
              aria-label="Twitter"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
            <a 
              href="#" 
              className="text-slate-400 hover:text-teal-400 transition-colors"
              aria-label="LinkedIn"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a 
              href="#" 
              className="text-slate-400 hover:text-teal-400 transition-colors"
              aria-label="Facebook"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
