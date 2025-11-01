'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Award, Download, Share2, Twitter, Linkedin, Facebook, Instagram, CheckCircle, Users, TrendingUp, Calendar } from 'lucide-react'

export default function CorporateCertificatesPage() {
  const [loading, setLoading] = useState(true)
  const [certificates, setCertificates] = useState<any[]>([])
  const [selectedCert, setSelectedCert] = useState<any>(null)
  const certificateRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadCertificates()
  }, [])

  const loadCertificates = async () => {
    try {
      const response = await fetch('/api/corporate/certificates')
      if (response.ok) {
        const data = await response.json()
        setCertificates(data.certificates || [])
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading certificates:', error)
      setLoading(false)
    }
  }

  const downloadCertificate = async (cert: any) => {
    if (!certificateRef.current) return

    try {
      const html2canvas = (await import('html2canvas')).default
      
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      })

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `conscious-company-${cert.moduleName?.toLowerCase().replace(/\s+/g, '-')}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }
      })
    } catch (error) {
      console.error('Error downloading certificate:', error)
    }
  }

  const shareCertificate = async (cert: any, platform: string) => {
    const text = `🏆 ¡${cert.companyName} es ahora una Empresa Consciente certificada! Nuestro equipo completó el módulo "${cert.moduleName}" con Crowd Conscious. #EmpresaConsciente #ImpactoSocial 🌱`
    const url = window.location.origin + `/verify/corporate/${cert.verificationCode}`

    if (platform === 'instagram') {
      await downloadCertificate(cert)
      alert('📸 Imagen guardada! Súbela a tu Historia de Instagram para mostrar tu certificación.')
      return
    }

    let shareUrl = ''
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-600 text-white py-12 px-4 shadow-xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Award className="w-12 h-12" />
            <div>
              <h1 className="text-4xl font-bold mb-2">Certificados de Empresa Consciente</h1>
              <p className="text-xl text-white/90">
                Comparte tus logros y demuestra tu compromiso con el impacto social
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {certificates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Sin Certificados Aún</h2>
            <p className="text-slate-600 mb-6">
              Los certificados se generan automáticamente cuando tus empleados completan módulos.
            </p>
            <Link
              href="/corporate/employees"
              className="inline-block bg-gradient-to-r from-teal-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
            >
              Ver Empleados
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedCert(cert)}
              >
                {/* Certificate Preview */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 border-b-4 border-gradient-to-r from-yellow-400 to-orange-500">
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
                  <h3 className="text-center font-bold text-slate-900 text-lg mb-2">
                    Empresa Consciente
                  </h3>
                  <p className="text-center text-sm text-slate-600">
                    {cert.moduleName}
                  </p>
                </div>

                {/* Stats */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-teal-600">{cert.employeesCompleted || 0}</div>
                      <div className="text-xs text-slate-600">Empleados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{cert.totalXP || 0}</div>
                      <div className="text-xs text-slate-600">XP Total</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 text-center mb-4">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {new Date(cert.issuedAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCert(cert)
                        setTimeout(() => downloadCertificate(cert), 100)
                      }}
                      className="flex-1 flex items-center justify-center gap-1 bg-teal-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        shareCertificate(cert, 'linkedin')
                      }}
                      className="flex items-center justify-center bg-blue-700 text-white px-3 py-2 rounded-lg hover:bg-blue-800 transition-colors"
                      title="Compartir"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Certificate Modal/Detail View */}
        {selectedCert && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedCert(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Action Buttons */}
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex flex-wrap gap-2 z-10">
                <button
                  onClick={() => downloadCertificate(selectedCert)}
                  className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-4 py-2 rounded-lg font-bold hover:scale-105 transition-transform shadow-lg text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar</span>
                </button>

                <button
                  onClick={() => shareCertificate(selectedCert, 'twitter')}
                  className="flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-lg font-bold hover:scale-105 transition-transform"
                  title="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => shareCertificate(selectedCert, 'linkedin')}
                  className="flex items-center gap-2 bg-blue-700 text-white px-3 py-2 rounded-lg font-bold hover:scale-105 transition-transform"
                  title="LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => shareCertificate(selectedCert, 'facebook')}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg font-bold hover:scale-105 transition-transform"
                  title="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </button>
                <button
                  onClick={() => shareCertificate(selectedCert, 'instagram')}
                  className="flex items-center gap-2 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white px-3 py-2 rounded-lg font-bold hover:scale-105 transition-transform"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSelectedCert(null)}
                  className="ml-auto bg-slate-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700 transition-colors text-sm"
                >
                  Cerrar
                </button>
              </div>

              {/* Certificate */}
              <div
                ref={certificateRef}
                className="p-8 sm:p-12 bg-gradient-to-br from-white via-yellow-50 to-orange-50"
              >
                {/* Header */}
                <div className="mb-8">
                  <div className="flex justify-center mb-6">
                    <div className="relative w-40 h-40 sm:w-48 sm:h-48">
                      <Image
                        src="/images/logo.png"
                        alt="Crowd Conscious"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="h-1 w-full bg-gradient-to-r from-teal-600 to-purple-600 rounded-full"></div>
                </div>

                {/* Certificate Content */}
                <div className="text-center mb-8">
                  <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full font-bold text-lg mb-6">
                    🏆 Empresa Consciente Certificada
                  </div>

                  <p className="text-xl text-slate-700 mb-6">
                    Este certificado es otorgado a
                  </p>

                  <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-purple-600 mb-8">
                    {selectedCert.companyName}
                  </h1>

                  <p className="text-lg text-slate-700 mb-4">
                    por su compromiso con el impacto social al completar el módulo
                  </p>

                  <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-purple-600 mb-6">
                    {selectedCert.moduleName}
                  </h3>

                  <p className="text-base text-slate-600 mb-8">
                    Demostrando liderazgo en sustentabilidad y responsabilidad social corporativa
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-6 mb-8 max-w-2xl mx-auto">
                  <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                    <Users className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-teal-600">{selectedCert.employeesCompleted}</div>
                    <div className="text-sm text-slate-600">Empleados Capacitados</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                    <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-purple-600">{selectedCert.totalXP}</div>
                    <div className="text-sm text-slate-600">Puntos de Impacto</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                    <Award className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-orange-600">100%</div>
                    <div className="text-sm text-slate-600">Completado</div>
                  </div>
                </div>

                {/* Signature */}
                <div className="border-t-2 border-slate-300 pt-6 mt-8">
                  <div className="grid sm:grid-cols-2 gap-8 max-w-xl mx-auto">
                    <div className="text-center">
                      <div className="h-px bg-slate-400 mb-2"></div>
                      <p className="text-sm font-semibold text-slate-700">Francisco Blockstrand</p>
                      <p className="text-xs text-slate-500">Fundador, Crowd Conscious</p>
                    </div>
                    <div className="text-center">
                      <div className="h-px bg-slate-400 mb-2"></div>
                      <p className="text-sm font-semibold text-slate-700">
                        {new Date(selectedCert.issuedAt).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-slate-500">Fecha de Certificación</p>
                    </div>
                  </div>
                </div>

                {/* Verification */}
                <div className="text-center mt-8 pt-6 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Código de Verificación</p>
                  <p className="text-sm font-mono font-bold text-slate-700 tracking-wider">
                    {selectedCert.verificationCode}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Verifica en: crowdconscious.app/verify/corporate
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

