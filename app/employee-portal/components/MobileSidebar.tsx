'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Award, TrendingUp, Home, FileText, X, Menu } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface MobileSidebarProps {
  isGraduated: boolean | null
  corporateAccount?: {
    company_name: string
    program_tier: string
  } | null
}

export default function MobileSidebar({ isGraduated, corporateAccount }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const navigation = [
    { name: 'Mi Progreso', href: '/employee-portal/dashboard', icon: Home },
    { name: 'Cursos', href: '/employee-portal/courses', icon: BookOpen },
    { name: 'Certificaciones', href: '/employee-portal/certifications', icon: Award },
    { name: 'Mi Impacto', href: '/employee-portal/impact', icon: TrendingUp },
    { name: 'Reportes ESG', href: '/employee-portal/mi-impacto', icon: FileText },
  ]

  // Close sidebar when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 bg-white rounded-lg p-2 shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-slate-700" />
        </button>
      )}

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.2 }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && isMobile ? (
          <motion.aside
            className="fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 overflow-y-auto"
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 200,
              duration: prefersReducedMotion ? 0.1 : 0.3
            }}
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">CC</span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Concientizaciones</div>
                    <div className="text-xs text-slate-500">Portal de Aprendizaje</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="space-y-1 mb-6">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-teal-50 text-teal-600 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-teal-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  )
                })}
              </nav>

              {/* Account Info */}
              {corporateAccount && (
                <div className="mb-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase mb-2">Programa</div>
                  <div className="font-bold text-slate-900 capitalize text-sm">
                    {corporateAccount?.program_tier || 'Activo'}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {corporateAccount?.company_name}
                  </div>
                </div>
              )}

              {/* Graduation Badge */}
              {isGraduated === true && (
                <div className="bg-gradient-to-br from-teal-50 to-purple-50 rounded-lg border-2 border-teal-200 p-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🎓</div>
                    <div className="font-bold text-teal-900 text-sm">
                      Certificado
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Ahora puedes acceder a la comunidad
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  )
}

