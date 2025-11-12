'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Award, Calendar, User, BookOpen, Search, Shield } from 'lucide-react'

function VerifyContent() {
  const searchParams = useSearchParams()
  const [code, setCode] = useState(searchParams?.get('code') || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  // Auto-verify if code is in URL
  useEffect(() => {
    const urlCode = searchParams?.get('code')
    if (urlCode && urlCode.length > 0) {
      setCode(urlCode)
      verifyCertificate(urlCode)
    }
  }, [searchParams])

  const verifyCertificate = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code
    
    if (!codeToVerify || codeToVerify.trim().length === 0) {
      setError('Por favor ingresa un código de verificación')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(`/api/certificates/verify/${encodeURIComponent(codeToVerify.trim())}`)
      const responseData = await response.json()

      // ✅ PHASE 4: Handle standardized API response format
      if (response.ok) {
        const data = responseData.success !== undefined ? responseData.data : responseData
        
        if (data && data.valid) {
          setResult(data)
        } else {
          // Extract error message from standardized format
          const errorMsg = responseData.success === false && responseData.error
            ? responseData.error.message
            : responseData.error?.message || responseData.message || 'Certificado no encontrado'
          setError(errorMsg)
        }
      } else {
        // Error response - extract message from standardized format
        const errorMsg = responseData.success === false && responseData.error
          ? responseData.error.message
          : responseData.error?.message || responseData.message || 'Certificado no encontrado'
        setError(errorMsg)
      }
    } catch (err: any) {
      console.error('Error verifying certificate:', err)
      setError(err?.message || 'Error al verificar el certificado. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    verifyCertificate()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white py-12 px-4 shadow-xl">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2">Verificar Certificado</h1>
          <p className="text-xl text-white/90">
            Valida la autenticidad de un certificado de Crowd Conscious
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-xl p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Search className="w-6 h-6 text-teal-600" />
            Ingresa el Código
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-2">
                Código de Verificación
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CC-XXXXXXXX"
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all font-mono text-lg uppercase"
                disabled={loading}
              />
              <p className="text-sm text-slate-500 mt-2">
                El código se encuentra en la parte inferior del certificado
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !code}
              className="w-full bg-gradient-to-r from-teal-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:scale-105 transition-transform shadow-lg disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verificando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Search className="w-5 h-5" />
                  Verificar Certificado
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8 animate-in slide-in-from-top duration-300">
            <div className="flex items-start gap-4">
              <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-red-900 mb-1">Certificado No Válido</h3>
                <p className="text-red-700">{error}</p>
                <p className="text-sm text-red-600 mt-2">
                  Por favor verifica que el código sea correcto e intenta nuevamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Result */}
        {result && result.valid && (
          <div className="bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200 rounded-xl p-6 sm:p-8 animate-in slide-in-from-top duration-300">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-green-900 mb-1">
                  ✅ Certificado Válido
                </h3>
                <p className="text-green-700">
                  Este certificado fue emitido por Crowd Conscious y es auténtico.
                </p>
              </div>
            </div>

            {/* Certificate Details */}
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">Otorgado a</p>
                  <p className="text-lg font-bold text-slate-900">{result.certificateHolder}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">Módulo Completado</p>
                  <p className="text-lg font-bold text-slate-900">{result.moduleName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">Fecha de Emisión</p>
                  <p className="text-lg font-bold text-slate-900">
                    {new Date(result.issuedAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">XP Ganados</p>
                  <p className="text-lg font-bold text-slate-900">{result.xpEarned || 250} XP</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600">Código de Verificación</p>
                <p className="text-lg font-mono font-bold text-teal-600 tracking-wider">
                  {result.verificationCode}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        {!result && !error && (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              ℹ️ ¿Cómo verificar un certificado?
            </h3>
            <ol className="space-y-3 text-slate-700">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <span>Localiza el código de verificación en la parte inferior del certificado</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <span>Ingresa el código completo en el campo de arriba (formato: CC-XXXXXXXX)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <span>Haz clic en "Verificar Certificado" para validar su autenticidad</span>
              </li>
            </ol>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900 font-medium mb-2">
                💡 ¿Por qué es importante verificar?
              </p>
              <p className="text-sm text-blue-800">
                La verificación asegura que el certificado es legítimo y fue emitido por Crowd Conscious. 
                Los empleadores y organizaciones pueden usar este sistema para validar las credenciales de candidatos.
              </p>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 mb-4">
            ¿Quieres obtener tu propia certificación?
          </p>
          <Link
            href="/concientizaciones"
            className="inline-block bg-gradient-to-r from-teal-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
          >
            Explorar Módulos
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}

