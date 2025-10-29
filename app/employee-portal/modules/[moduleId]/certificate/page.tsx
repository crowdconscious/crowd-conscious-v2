'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Award, Download, Share2, ArrowLeft } from 'lucide-react'
import { cleanAirModule } from '@/app/lib/course-content/clean-air-module'

export default function CertificatePage({ params }: { params: { moduleId: string } }) {
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const module = cleanAirModule
  const today = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // In a real implementation, fetch user data and verification
    // For now, using placeholder
    setUserData({
      name: 'Nombre del Empleado',
      completedAt: today,
      certificateId: `CC-${Date.now()}`
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Generando certificado...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link 
          href={`/employee-portal/modules/${params.moduleId}`}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al Módulo
        </Link>

        {/* Certificate */}
        <div className="bg-white rounded-2xl shadow-2xl p-12 border-8 border-double border-yellow-500 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-teal-400/20 to-purple-400/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full translate-x-1/2 translate-y-1/2"></div>

          {/* Content */}
          <div className="relative z-10 text-center">
            {/* Logo */}
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
              <span className="text-white font-bold text-3xl">CC</span>
            </div>

            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Certificado de Finalización
            </h1>
            <p className="text-lg text-slate-600 mb-8">Crowd Conscious - Concientizaciones</p>

            <div className="my-12">
              <p className="text-slate-600 mb-4">Este certificado se otorga a</p>
              <h2 className="text-5xl font-bold bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent mb-6">
                {userData.name}
              </h2>
              <p className="text-slate-600 mb-4">por completar exitosamente el módulo</p>
              <h3 className="text-3xl font-bold text-slate-900 mb-8">
                {module.icon} {module.title}
              </h3>
            </div>

            {/* Module Details */}
            <div className="bg-gradient-to-r from-teal-50 to-purple-50 rounded-xl p-6 mb-8 max-w-2xl mx-auto">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-teal-700">{module.totalLessons}</div>
                  <div className="text-sm text-slate-600">Lecciones</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-700">{module.totalXP} XP</div>
                  <div className="text-sm text-slate-600">Ganados</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-pink-700">{module.duration}</div>
                  <div className="text-sm text-slate-600">Completados</div>
                </div>
              </div>
            </div>

            {/* Certification Badge */}
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-full font-bold text-lg mb-8">
              <Award className="w-6 h-6" />
              {module.certificationTitle}
            </div>

            {/* Date and ID */}
            <div className="text-sm text-slate-600 space-y-1">
              <p>Fecha de finalización: {userData.completedAt}</p>
              <p>ID del certificado: {userData.certificateId}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform">
            <Download className="w-5 h-5" />
            Descargar PDF
          </button>
          <button className="flex items-center gap-2 bg-white text-slate-700 border-2 border-slate-300 px-8 py-4 rounded-xl font-bold hover:border-teal-500 transition-colors">
            <Share2 className="w-5 h-5" />
            Compartir
          </button>
        </div>

        {/* Next Steps */}
        <div className="bg-gradient-to-r from-teal-600 to-purple-600 rounded-2xl p-8 mt-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">🎉 ¡Felicidades por tu logro!</h2>
          <p className="text-white/90 mb-6">
            Has demostrado tu compromiso con crear un impacto positivo. Ahora puedes acceder 
            a la comunidad principal y comenzar a patrocinar necesidades locales.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/employee-portal/dashboard"
              className="bg-white text-teal-600 px-6 py-3 rounded-lg font-bold hover:scale-105 transition-transform"
            >
              Volver al Portal
            </Link>
            <Link
              href="/dashboard"
              className="bg-white/20 backdrop-blur-sm text-white border-2 border-white px-6 py-3 rounded-lg font-bold hover:bg-white/30 transition-colors"
            >
              Ir a la Comunidad →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

