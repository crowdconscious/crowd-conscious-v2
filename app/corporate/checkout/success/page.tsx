'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, Download, Users, BookOpen, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function CheckoutSuccessPage() {
  useEffect(() => {
    // Trigger confetti animation
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      })
    }, 250)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 animate-bounce">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            ¡Compra Exitosa! 🎉
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Tu pedido ha sido procesado correctamente
          </p>

          {/* What Happens Next */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8 text-left border-2 border-purple-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4 text-center">
              ¿Qué sigue? 🚀
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Inscripción Automática</h3>
                  <p className="text-sm text-slate-700">
                    Todos tus empleados han sido automáticamente inscritos en los módulos adquiridos
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Acceso Inmediato</h3>
                  <p className="text-sm text-slate-700">
                    Tus empleados ya pueden acceder a su capacitación desde el portal de empleados
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Seguimiento en Tiempo Real</h3>
                  <p className="text-sm text-slate-700">
                    Monitorea el progreso de tu equipo desde tu dashboard corporativo
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/corporate/dashboard"
              className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              Ver Dashboard Corporativo
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <Link
              href="/corporate/progress"
              className="block w-full bg-white border-2 border-purple-600 text-purple-600 py-4 rounded-xl font-bold hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Ver Progreso de Empleados
            </Link>

            <Link
              href="/marketplace"
              className="block w-full text-slate-600 hover:text-purple-600 py-3 font-medium transition-colors"
            >
              Explorar Más Módulos →
            </Link>
          </div>

          {/* Support */}
          <div className="mt-8 pt-8 border-t border-slate-200">
            <p className="text-sm text-slate-600 mb-2">
              ¿Necesitas ayuda o tienes preguntas?
            </p>
            <a
              href="mailto:comunidad@crowdconscious.app"
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Contacta con nuestro equipo de soporte
            </a>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            Recibirás un correo de confirmación con los detalles de tu compra
          </p>
        </div>
      </div>
    </div>
  )
}

