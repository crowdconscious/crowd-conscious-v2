'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Download, Share2, Award, CheckCircle, Twitter, Linkedin, Facebook, Copy, ArrowLeft, Instagram } from 'lucide-react'
import { cleanAirModule } from '@/app/lib/course-content/clean-air-module'

export default function CertificatePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const router = useRouter()
  const certificateRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [moduleId, setModuleId] = useState<string>('')
  const [certificate, setCertificate] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const module = cleanAirModule

  useEffect(() => {
    params.then((p) => {
      setModuleId(p.moduleId)
      loadCertificate(p.moduleId)
    })
  }, [])

  const loadCertificate = async (modId: string) => {
    try {
      // For now, fetch the latest certificate for this module
      // In production, you'd fetch based on moduleId
      const response = await fetch('/api/certificates/latest')
      if (response.ok) {
        const data = await response.json()
        setCertificate(data)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading certificate:', error)
      setLoading(false)
    }
  }

  const downloadCertificate = async () => {
    if (!certificateRef.current) return

    try {
      // Dynamically import html2canvas (client-side only)
      const html2canvas = (await import('html2canvas')).default
      
      // Capture the certificate div as canvas
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2, // Higher quality
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      })

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `certificado-${module.title.toLowerCase().replace(/\s+/g, '-')}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }
      })
    } catch (error) {
      console.error('Error downloading certificate:', error)
      // Fallback to print dialog
      window.print()
    }
  }

  const shareCertificate = async (platform: string) => {
    const text = `¡Acabo de completar el módulo "${module.title}" en Crowd Conscious! 🎓🌱`
    const url = window.location.origin + `/certificates/${certificate?.verificationCode}`

    if (platform === 'instagram') {
      // For Instagram Stories, generate and download the certificate image
      // Users can then manually upload to Instagram Stories
      await downloadCertificateForIG()
      alert('📸 Imagen guardada! Ahora puedes subirla a tu Historia de Instagram.\n\nTip: Abre Instagram → Tu Historia → Selecciona la imagen descargada')
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

  const downloadCertificateForIG = async () => {
    if (!certificateRef.current) return

    try {
      const html2canvas = (await import('html2canvas')).default
      
      // Create Instagram Story sized image (1080x1920)
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        width: 1080,
        height: 1920
      })

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `certificado-ig-story-${Date.now()}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }
      })
    } catch (error) {
      console.error('Error generating IG image:', error)
    }
  }

  const copyLink = () => {
    const url = window.location.origin + `/certificates/${certificate?.verificationCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-600 text-white py-8 px-4 shadow-xl print:hidden">
        <div className="max-w-4xl mx-auto">
          <Link 
            href="/employee-portal/dashboard"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Portal
          </Link>

          <div className="text-center">
            <Award className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-2">¡Felicidades! 🎉</h1>
            <p className="text-xl text-white/90">
              Has completado exitosamente el módulo
            </p>
          </div>
        </div>
      </div>

      {/* Certificate */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 sm:gap-4 justify-center mb-8 print:hidden">
          <button
            onClick={downloadCertificate}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Descargar</span>
            <span className="sm:hidden">PDF</span>
          </button>

          <button
            onClick={copyLink}
            className="flex items-center gap-2 bg-slate-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
          >
            {copied ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>Copiar Link</span>
              </>
            )}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => shareCertificate('twitter')}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
              title="Compartir en Twitter"
            >
              <Twitter className="w-5 h-5" />
            </button>
            <button
              onClick={() => shareCertificate('linkedin')}
              className="flex items-center gap-2 bg-blue-700 text-white px-4 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
              title="Compartir en LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </button>
            <button
              onClick={() => shareCertificate('facebook')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
              title="Compartir en Facebook"
            >
              <Facebook className="w-5 h-5" />
            </button>
            <button
              onClick={() => shareCertificate('instagram')}
              className="flex items-center gap-2 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white px-4 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
              title="Compartir en Instagram Stories"
            >
              <Instagram className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Card */}
        <div
          ref={certificateRef}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden border-8 border-gradient-to-r from-yellow-400 to-orange-500"
          style={{ borderImage: 'linear-gradient(to right, #facc15, #f97316) 1' }}
        >
          {/* Certificate Content */}
          <div className="p-8 sm:p-12 md:p-16 bg-gradient-to-br from-white via-yellow-50 to-orange-50">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                  <Image
                    src="/images/logo.png"
                    alt="Crowd Conscious Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="text-left">
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Crowd Conscious</h2>
                  <p className="text-sm sm:text-base text-slate-600">Plataforma de Impacto Social</p>
                </div>
              </div>
              <div className="h-1 w-32 bg-gradient-to-r from-teal-600 to-purple-600 mx-auto rounded-full"></div>
            </div>

            {/* Certificate Text */}
            <div className="text-center mb-8">
              <p className="text-lg sm:text-xl text-slate-700 mb-6">
                Este certificado es otorgado a
              </p>
              <h1 className="text-3xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-purple-600 mb-6">
                {certificate?.employeeName || 'Cargando...'}
              </h1>
              <p className="text-base sm:text-lg text-slate-700 mb-4">
                de la empresa
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8">
                {certificate?.companyName || 'Cargando...'}
              </h2>
              <p className="text-base sm:text-lg text-slate-700 mb-4">
                por completar exitosamente el módulo
              </p>
              <h3 className="text-2xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-purple-600 mb-6">
                {module.title}
              </h3>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
              <div className="text-center p-3 sm:p-4 bg-white rounded-xl shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-teal-600">{module.lessons.length}</div>
                <div className="text-xs sm:text-sm text-slate-600">Lecciones</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-white rounded-xl shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600">{certificate?.xpEarned || 750}</div>
                <div className="text-xs sm:text-sm text-slate-600">XP Ganados</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-white rounded-xl shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-orange-600">{module.duration}</div>
                <div className="text-xs sm:text-sm text-slate-600">Duración</div>
              </div>
            </div>

            {/* Signature Line */}
            <div className="border-t-2 border-slate-300 pt-6 mt-8">
              <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 max-w-xl mx-auto">
                <div className="text-center">
                  <div className="h-px bg-slate-400 mb-2"></div>
                  <p className="text-sm font-semibold text-slate-700">Francisco Blockstrand</p>
                  <p className="text-xs text-slate-500">Fundador, Crowd Conscious</p>
                </div>
                <div className="text-center">
                  <div className="h-px bg-slate-400 mb-2"></div>
                  <p className="text-sm font-semibold text-slate-700">{new Date(certificate?.issuedAt || Date.now()).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-xs text-slate-500">Fecha de Emisión</p>
                </div>
              </div>
            </div>

            {/* Verification Code */}
            <div className="text-center mt-8 pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Código de Verificación</p>
              <p className="text-sm font-mono font-bold text-slate-700 tracking-wider">
                {certificate?.verificationCode || 'XXXXXX'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Verifica en: crowdconscious.app/verify
              </p>
            </div>
          </div>

          {/* Decorative Border */}
          <div className="h-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-600"></div>
        </div>

        {/* Next Steps */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6 sm:p-8 print:hidden">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">🎯 Próximos Pasos</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Comparte tu logro</p>
                <p className="text-sm text-slate-600">Usa los botones de arriba para compartir tu certificado en redes sociales</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Continúa aprendiendo</p>
                <p className="text-sm text-slate-600">Explora más módulos disponibles en tu programa</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Aplica lo aprendido</p>
                <p className="text-sm text-slate-600">Implementa los proyectos y herramientas en tu lugar de trabajo</p>
              </div>
            </li>
          </ul>

          <Link
            href="/employee-portal/dashboard"
            className="mt-6 w-full block text-center bg-gradient-to-r from-teal-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
          >
            Volver al Portal
          </Link>
        </div>
      </div>
    </div>
  )
}
