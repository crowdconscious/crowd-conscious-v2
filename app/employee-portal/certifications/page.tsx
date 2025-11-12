'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Award, Download, Share2, Calendar, CheckCircle, Lock, ArrowRight } from 'lucide-react'

export default function EmployeeCertificationsPage() {
  const [loading, setLoading] = useState(true)
  const [certificates, setCertificates] = useState<any[]>([])

  useEffect(() => {
    loadCertificates()
  }, [])

  const loadCertificates = async () => {
    try {
      const response = await fetch('/api/certificates/my-certificates')
      if (response.ok) {
        const responseData = await response.json()
        console.log('📜 Certificates API response:', responseData)
        
        // ✅ PHASE 4: Parse standardized API response format
        const data = responseData.success !== undefined ? responseData.data : responseData
        setCertificates(data?.certificates || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Failed to load certificates:', errorData)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading certificates:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando certificados...</p>
        </div>
      </div>
    )
  }

  const availableModules = [
    { id: 'clean_air', name: 'Aire Limpio para Todos', icon: '🌬️', color: 'from-teal-500 to-blue-600' },
    { id: 'clean_water', name: 'Agua Limpia y Vida', icon: '💧', color: 'from-blue-500 to-cyan-600' },
    { id: 'zero_waste', name: 'Cero Residuos', icon: '♻️', color: 'from-green-500 to-emerald-600' },
  ]

  const earnedModules = certificates.map(c => c.moduleId)
  const remainingModules = availableModules.filter(m => !earnedModules.includes(m.id))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-600 text-white py-8 sm:py-12 px-4 shadow-xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <Award className="w-10 h-10 sm:w-12 sm:h-12" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-1 sm:mb-2">Mis Certificados</h1>
              <p className="text-base sm:text-xl text-white/90">
                Tus logros y certificaciones ganadas
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 sm:p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold">{certificates.length}</div>
              <div className="text-xs sm:text-sm text-white/90">Certificados</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 sm:p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold">{certificates.reduce((sum, c) => sum + (c.xpEarned || 0), 0)}</div>
              <div className="text-xs sm:text-sm text-white/90">XP Total</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 sm:p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold">{remainingModules.length}</div>
              <div className="text-xs sm:text-sm text-white/90">Por Ganar</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Earned Certificates */}
        {certificates.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Certificados Obtenidos
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {certificates.map((cert) => (
                <Link
                  key={cert.id}
                  href={`/employee-portal/modules/${cert.moduleId}/certificate`}
                  className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all hover:scale-105"
                >
                  {/* Certificate Preview */}
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 border-b-4 border-yellow-400 relative">
                    <div className="absolute top-2 right-2">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative w-16 h-16">
                        <Image
                          src="/images/logo.png"
                          alt="Crowd Conscious"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                    <h3 className="text-center font-bold text-slate-900 text-base sm:text-lg mb-2">
                      {cert.moduleName}
                    </h3>
                    <div className="text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <Calendar className="w-3 h-3" />
                        {new Date(cert.issuedAt).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-600">
                        <span className="font-bold text-teal-600">{cert.xpEarned || 750}</span> XP
                      </div>
                      <div className="flex items-center gap-1 text-teal-600 text-sm font-medium group-hover:gap-2 transition-all">
                        Ver certificado
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No Certificates Yet */}
        {certificates.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center mb-12">
            <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Aún no tienes certificados</h2>
            <p className="text-slate-600 mb-6">
              Completa módulos para ganar certificados y demostrar tus conocimientos
            </p>
            <Link
              href="/employee-portal/dashboard"
              className="inline-block bg-gradient-to-r from-teal-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
            >
              Ver Mis Cursos
            </Link>
          </div>
        )}

        {/* Available Modules to Earn */}
        {remainingModules.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Lock className="w-6 h-6 text-slate-400" />
              Próximos Certificados
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {remainingModules.map((module) => (
                <div
                  key={module.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-slate-200 opacity-75"
                >
                  <div className={`bg-gradient-to-br ${module.color} p-6 text-white`}>
                    <div className="text-5xl mb-4 text-center">{module.icon}</div>
                    <h3 className="text-center font-bold text-lg">
                      {module.name}
                    </h3>
                  </div>

                  <div className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-4">
                      <Lock className="w-4 h-4" />
                      <span>Bloqueado</span>
                    </div>
                    <Link
                      href="/employee-portal/dashboard"
                      className="inline-block text-teal-600 hover:text-teal-700 font-medium text-sm"
                    >
                      Ver en Dashboard →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benefits Section */}
        <div className="mt-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 sm:p-8 border-2 border-purple-200">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">✨ Beneficios de tus Certificados</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Reconocimiento profesional</p>
                <p className="text-sm text-slate-600">Demuestra tus conocimientos y compromiso</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Comparte en redes sociales</p>
                <p className="text-sm text-slate-600">Publica tus logros en LinkedIn, Twitter, Instagram</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Verificación autenticada</p>
                <p className="text-sm text-slate-600">Cada certificado incluye código de verificación único</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Descarga en alta calidad</p>
                <p className="text-sm text-slate-600">PDF listo para imprimir o compartir digitalmente</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
