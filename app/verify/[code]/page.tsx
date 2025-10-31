'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, XCircle, Shield, Calendar, Award, Building2, User, ArrowLeft } from 'lucide-react'

export default function VerificationPage({ params }: { params: Promise<{ code: string }> }) {
  const [loading, setLoading] = useState(true)
  const [verificationCode, setVerificationCode] = useState<string>('')
  const [certificate, setCertificate] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then((p) => {
      setVerificationCode(p.code)
      verifyCertificate(p.code)
    })
  }, [])

  const verifyCertificate = async (code: string) => {
    try {
      const response = await fetch(`/api/certificates/verify/${code}`)
      
      if (response.ok) {
        const data = await response.json()
        setCertificate(data.certificate)
      } else {
        setError('Certificado no encontrado o código inválido')
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error verifying certificate:', error)
      setError('Error al verificar el certificado')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-teal-600 mx-auto mb-4 animate-pulse" />
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Verificando certificado...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image
                src="/images/logo.png"
                alt="Crowd Conscious"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-slate-900">Crowd Conscious</div>
              <div className="text-xs text-slate-500">Verificación de Certificados</div>
            </div>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {error ? (
          // Invalid Certificate
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Certificado No Válido</h1>
            <p className="text-lg text-slate-600 mb-2">{error}</p>
            <p className="text-sm text-slate-500 mb-8">
              Código ingresado: <span className="font-mono font-bold">{verificationCode}</span>
            </p>
            
            <div className="bg-slate-50 rounded-xl p-6 mb-8">
              <h3 className="font-bold text-slate-900 mb-3">Posibles razones:</h3>
              <ul className="text-left text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>El código de verificación fue ingresado incorrectamente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>El certificado ha sido revocado o cancelado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>El certificado no existe en nuestra base de datos</span>
                </li>
              </ul>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver al Inicio
            </Link>
          </div>
        ) : (
          // Valid Certificate
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-8 text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">✓ Certificado Válido</h1>
              <p className="text-xl text-green-100">
                Este certificado ha sido verificado exitosamente
              </p>
            </div>

            {/* Certificate Details */}
            <div className="p-8 sm:p-12">
              <div className="flex items-center justify-center gap-4 mb-8 pb-8 border-b border-slate-200">
                <div className="relative w-16 h-16">
                  <Image
                    src="/images/logo.png"
                    alt="Crowd Conscious"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Crowd Conscious</h2>
                  <p className="text-slate-600">Plataforma de Impacto Social</p>
                </div>
              </div>

              {/* Certificate Information */}
              <div className="space-y-6 mb-8">
                {certificate?.certificationType === 'corporate_module' ? (
                  // Corporate Certificate
                  <>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-500 mb-1">Empresa Certificada</div>
                        <div className="text-xl font-bold text-slate-900">{certificate.companyName}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6 text-teal-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-500 mb-1">Módulo Completado</div>
                        <div className="text-xl font-bold text-slate-900">{certificate.moduleName}</div>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-slate-500 mb-1">Empleados Capacitados</div>
                          <div className="text-2xl font-bold text-slate-900">{certificate.employeesCompleted || 0}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Award className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-slate-500 mb-1">Puntos de Impacto</div>
                          <div className="text-2xl font-bold text-slate-900">{certificate.totalXP || 0} XP</div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // Employee Certificate
                  <>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-500 mb-1">Certificado Otorgado a</div>
                        <div className="text-xl font-bold text-slate-900">{certificate.employeeName}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-500 mb-1">Empresa</div>
                        <div className="text-xl font-bold text-slate-900">{certificate.companyName}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6 text-teal-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-500 mb-1">Módulo Completado</div>
                        <div className="text-xl font-bold text-slate-900">{certificate.moduleName}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-500 mb-1">Puntos Ganados</div>
                        <div className="text-2xl font-bold text-slate-900">{certificate.xpEarned || 0} XP</div>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-500 mb-1">Fecha de Emisión</div>
                    <div className="text-xl font-bold text-slate-900">
                      {new Date(certificate.issuedAt).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Code */}
              <div className="bg-slate-50 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-slate-700">Código de Verificación</div>
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-mono font-bold text-slate-900 tracking-wider">
                  {verificationCode}
                </div>
              </div>

              {/* Trust Badge */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-900 mb-2">Certificado Auténtico</h3>
                    <p className="text-sm text-green-800">
                      Este certificado ha sido emitido oficialmente por Crowd Conscious y está
                      registrado en nuestra base de datos. La información mostrada es precisa y verificable.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-6 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Ir a Crowd Conscious
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

