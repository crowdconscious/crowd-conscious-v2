'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Share2, Award, CheckCircle, Twitter, Linkedin, Facebook, Copy, ArrowLeft, Instagram } from 'lucide-react'
import { cleanAirModule } from '@/app/lib/course-content/clean-air-module'

export default function CertificatePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const router = useRouter()
  const certificateRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [moduleId, setModuleId] = useState<string>('')
  const [certificate, setCertificate] = useState<any>(null)
  const [module, setModule] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    params.then((p) => {
      setModuleId(p.moduleId)
      loadCertificate(p.moduleId)
    })
  }, [])

  const loadCertificate = async (modId: string) => {
    try {
      // Fetch user profile first (always available)
      const profileResponse = await fetch('/api/user/profile')
      let userName = 'Usuario'
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        userName = profileData.full_name || 'Usuario'
      }

      // Fetch the actual module data
      let fetchedModule: any = null
      const moduleResponse = await fetch(`/api/modules/${modId}`)
      if (moduleResponse.ok) {
        const moduleData = await moduleResponse.json()
        fetchedModule = moduleData.module
        setModule(fetchedModule)
      }

      // Fetch the user's enrollment for THIS SPECIFIC MODULE
      const enrollmentResponse = await fetch(`/api/corporate/progress/enrollment?moduleId=${modId}`)
      let enrollmentData: any = null
      if (enrollmentResponse.ok) {
        enrollmentData = await enrollmentResponse.json()
      }

      // Build certificate with all available data
      setCertificate({
        employeeName: userName,
        moduleName: fetchedModule?.title || enrollmentData?.module?.title || 'Módulo Completado',
        xpEarned: enrollmentData?.xp_earned || 250,
        issuedAt: enrollmentData?.completion_date || new Date().toISOString(),
        verificationCode: enrollmentData?.id ? `CC-${enrollmentData.id.slice(0, 8).toUpperCase()}` : 'PENDING'
      })

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
      
      // CRITICAL FIX: Temporarily convert gradient text to solid color for export
      // bg-clip-text with gradients doesn't render in html2canvas
      const gradientElements = certificateRef.current.querySelectorAll('.bg-clip-text')
      const originalStyles: Array<{ element: Element; backgroundColor: string; backgroundImage: string; color: string; webkitTextFillColor: string }> = []
      
      gradientElements.forEach((el) => {
        const htmlEl = el as HTMLElement
        // Save original styles
        originalStyles.push({
          element: el,
          backgroundColor: htmlEl.style.backgroundColor,
          backgroundImage: htmlEl.style.backgroundImage,
          color: htmlEl.style.color,
          webkitTextFillColor: htmlEl.style.webkitTextFillColor
        })
        
        // Replace gradient with solid teal color for export
        htmlEl.style.backgroundColor = 'transparent'
        htmlEl.style.backgroundImage = 'none'
        htmlEl.style.color = '#0d9488' // teal-600
        htmlEl.style.webkitTextFillColor = '#0d9488'
      })
      
      // Wait for all images to load
      const images = certificateRef.current.getElementsByTagName('img')
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete) return Promise.resolve()
          return new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            if (!img.src) {
              reject(new Error('No image src'))
            }
          })
        })
      )
      
      // Capture the certificate div as canvas
      const canvas = await html2canvas(certificateRef.current, {
        scale: 3, // Higher quality
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
      })
      
      // Restore original gradient styles
      originalStyles.forEach(({ element, backgroundColor, backgroundImage, color, webkitTextFillColor }) => {
        const htmlEl = element as HTMLElement
        htmlEl.style.backgroundColor = backgroundColor
        htmlEl.style.backgroundImage = backgroundImage
        htmlEl.style.color = color
        htmlEl.style.webkitTextFillColor = webkitTextFillColor
      })

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `certificado-${module?.title?.toLowerCase().replace(/\s+/g, '-') || 'modulo'}.png`
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
    const text = `¡Acabo de completar el módulo "${module?.title || 'Módulo'}" en Crowd Conscious! 🎓🌱`
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
      
      // Fix gradient text for export
      const gradientElements = certificateRef.current.querySelectorAll('.bg-clip-text')
      const originalStyles: Array<{ element: Element; backgroundColor: string; backgroundImage: string; color: string; webkitTextFillColor: string }> = []
      
      gradientElements.forEach((el) => {
        const htmlEl = el as HTMLElement
        originalStyles.push({
          element: el,
          backgroundColor: htmlEl.style.backgroundColor,
          backgroundImage: htmlEl.style.backgroundImage,
          color: htmlEl.style.color,
          webkitTextFillColor: htmlEl.style.webkitTextFillColor
        })
        htmlEl.style.backgroundColor = 'transparent'
        htmlEl.style.backgroundImage = 'none'
        htmlEl.style.color = '#0d9488'
        htmlEl.style.webkitTextFillColor = '#0d9488'
      })
      
      // Wait for all images to load
      const images = certificateRef.current.getElementsByTagName('img')
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete) return Promise.resolve()
          return new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            if (!img.src) {
              reject(new Error('No image src'))
            }
          })
        })
      )
      
      // Create Instagram Story sized image (1080x1920)
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
        width: 1080,
        height: 1920
      })
      
      // Restore original gradient styles
      originalStyles.forEach(({ element, backgroundColor, backgroundImage, color, webkitTextFillColor }) => {
        const htmlEl = element as HTMLElement
        htmlEl.style.backgroundColor = backgroundColor
        htmlEl.style.backgroundImage = backgroundImage
        htmlEl.style.color = color
        htmlEl.style.webkitTextFillColor = webkitTextFillColor
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
            <div className="mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
                  <img
                    src="/images/logo.png"
                    alt="Crowd Conscious"
                    className="max-w-full max-h-full object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-teal-600 to-purple-600 rounded-full"></div>
            </div>

            {/* Certificate Text */}
            <div className="text-center mb-8">
              <p className="text-lg sm:text-xl text-slate-700 mb-6">
                Este certificado es otorgado a
              </p>
              <h1 className="text-3xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-purple-600 mb-8">
                {certificate?.employeeName || 'Usuario'}
              </h1>
              <p className="text-base sm:text-lg text-slate-700 mb-4">
                por completar exitosamente el módulo
              </p>
              <h3 className="text-2xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-purple-600 mb-6">
                {module?.title || certificate?.moduleName || 'Módulo Completado'}
              </h3>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
              <div className="text-center p-3 sm:p-4 bg-white rounded-xl shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-teal-600">{module?.lesson_count || module?.lessons?.length || 5}</div>
                <div className="text-xs sm:text-sm text-slate-600">Lecciones</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-white rounded-xl shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600">{certificate?.xpEarned || 750}</div>
                <div className="text-xs sm:text-sm text-slate-600">XP Ganados</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-white rounded-xl shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-orange-600">{module?.duration || '45 min'}</div>
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
