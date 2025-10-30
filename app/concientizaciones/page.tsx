import Link from 'next/link'
import { CheckCircle2, Users, TrendingUp, Award, ArrowRight, Sparkles } from 'lucide-react'

export default function ConcientizacionesLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                Crowd Conscious
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link 
                href="/assessment" 
                className="text-gray-600 hover:text-gray-900 transition"
              >
                Evaluación Gratuita
              </Link>
              <Link 
                href="/login" 
                className="text-gray-600 hover:text-gray-900 transition"
              >
                Iniciar Sesión
              </Link>
              <Link 
                href="/assessment"
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
              >
                Comenzar Ahora
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-transparent to-blue-100 opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Capacitación que Financia Comunidades</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Transforma tu Empresa
              <span className="block bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                Impacta tu Comunidad
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Capacitación en sostenibilidad creada por comunidades reales, para empresas reales. 
              Cada peso que inviertes financia proyectos comunitarios verificables.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/assessment"
                className="bg-emerald-600 text-white px-8 py-4 rounded-xl hover:bg-emerald-700 transition shadow-xl shadow-emerald-200 font-semibold text-lg flex items-center justify-center gap-2"
              >
                Evaluación Gratuita
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a 
                href="#pricing"
                className="bg-white text-gray-700 px-8 py-4 rounded-xl hover:bg-gray-50 transition shadow-xl font-semibold text-lg border-2 border-gray-200"
              >
                Ver Precios
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-16 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-600 mb-2">50%</div>
              <div className="text-gray-600">de cada compra va a comunidades</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-600 mb-2">$18k</div>
              <div className="text-gray-600">por módulo (50 empleados)</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-600 mb-2">6+</div>
              <div className="text-gray-600">módulos disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-600 mb-2">75%+</div>
              <div className="text-gray-600">tasa de completación</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Cómo Funciona
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Un modelo revolucionario que conecta empresas, empleados y comunidades
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-emerald-100 hover:border-emerald-300 transition">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                1. Elige Módulos
              </h3>
              <p className="text-gray-600">
                Selecciona módulos creados por comunidades que resolvieron problemas reales. 
                Compra individual o en paquetes con descuento.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-blue-100 hover:border-blue-300 transition">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                2. Capacita Empleados
              </h3>
              <p className="text-gray-600">
                Tus empleados aprenden con historias auténticas, actividades interactivas y 
                proyectos aplicables. Rastrea progreso y obtén métricas ESG.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-purple-100 hover:border-purple-300 transition">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                3. Impacto Verificable
              </h3>
              <p className="text-gray-600">
                50% de tu inversión financia proyectos comunitarios directamente. 
                Ve dónde fue tu dinero con transparencia total.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Precios Transparentes
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Paga solo por lo que necesitas. Ahorra hasta 40% con paquetes.
            </p>
          </div>

          {/* Individual Module Pricing */}
          <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-200 mb-8">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Módulos Individuales</h3>
                <p className="text-gray-600">Compra módulos específicos según tus necesidades</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-emerald-600">$18,000 <span className="text-xl text-gray-500">MXN</span></div>
                <div className="text-sm text-gray-500">~$900 USD por módulo</div>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Hasta 50 empleados incluidos</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">+$8,000 MXN por cada 50 empleados adicionales</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">3-4 semanas de contenido</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Dashboard básico de progreso</span>
              </li>
            </ul>
          </div>

          {/* Bundle Packages */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter Bundle */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-200 hover:border-emerald-300 transition">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">🌱 Starter</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  $45,000 <span className="text-lg text-gray-500">MXN</span>
                </div>
                <div className="text-sm text-gray-500 mb-2">~$2,250 USD</div>
                <div className="inline-block bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                  Ahorra $9,000
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700"><strong>3 módulos</strong> a elegir</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">50 empleados incluidos</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">3 meses de acceso</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Dashboard básico</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Acceso a comunidad</span>
                </li>
              </ul>
              <Link 
                href="/assessment"
                className="block w-full text-center bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition font-semibold"
              >
                Comenzar
              </Link>
            </div>

            {/* Impact Bundle (Recommended) */}
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-8 shadow-2xl border-2 border-emerald-400 relative transform md:scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                ⭐ Recomendado
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">🌍 Impact</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  $85,000 <span className="text-lg text-gray-500">MXN</span>
                </div>
                <div className="text-sm text-gray-500 mb-2">~$4,250 USD</div>
                <div className="inline-block bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Ahorra $23,000
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700"><strong>6 módulos</strong> completos</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">100 empleados incluidos</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">6 meses de acceso</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Dashboard avanzado + ESG</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Creación de comunidad</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700"><strong>$10,000 MXN</strong> en créditos</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Soporte prioritario</span>
                </li>
              </ul>
              <Link 
                href="/assessment"
                className="block w-full text-center bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition font-semibold shadow-lg shadow-emerald-200"
              >
                Comenzar Ahora
              </Link>
            </div>

            {/* Enterprise Bundle */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-200 hover:border-blue-300 transition">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">🚀 Enterprise</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  Custom
                </div>
                <div className="text-sm text-gray-500 mb-2">Desde $150,000 MXN</div>
                <div className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                  Personalizado
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700"><strong>Módulos ilimitados</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Empleados ilimitados</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">12 meses de acceso</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Módulos personalizados</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">White-label disponible</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Integraciones API</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700"><strong>$50,000 MXN</strong> en créditos</span>
                </li>
              </ul>
              <Link 
                href="/assessment"
                className="block w-full text-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Contactar Ventas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Available Modules */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Módulos Disponibles
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Contenido creado por comunidades que resolvieron estos desafíos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🌬️', name: 'Aire Limpio', desc: 'Calidad del aire, emisiones, huella de carbono' },
              { icon: '💧', name: 'Agua Limpia', desc: 'Conservación, filtración, protección de cuencas' },
              { icon: '🏙️', name: 'Ciudades Seguras', desc: 'Seguridad urbana, espacios públicos, diseño inclusivo' },
              { icon: '♻️', name: 'Basura Cero', desc: 'Economía circular, reciclaje, compostaje' },
              { icon: '🤝', name: 'Comercio Justo', desc: 'Abastecimiento local, salarios justos, cadenas éticas' },
              { icon: '🌱', name: 'Biodiversidad', desc: 'Jardines urbanos, espacios verdes, restauración' },
            ].map((module, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-100 hover:border-emerald-300 transition">
                <div className="text-4xl mb-3">{module.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{module.name}</h3>
                <p className="text-gray-600 text-sm">{module.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-emerald-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            ¿Listo para Transformar tu Empresa?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Comienza con una evaluación gratuita. Te recomendaremos los módulos perfectos para tu industria.
          </p>
          <Link 
            href="/assessment"
            className="inline-flex items-center gap-2 bg-white text-emerald-600 px-8 py-4 rounded-xl hover:bg-gray-100 transition shadow-2xl font-semibold text-lg"
          >
            Comenzar Evaluación Gratuita
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Crowd Conscious</h3>
              <p className="text-gray-400 text-sm">
                Capacitación corporativa que financia comunidades.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/assessment" className="hover:text-white transition">Evaluación</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition">Precios</Link></li>
                <li><Link href="/concientizaciones" className="hover:text-white transition">Módulos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/" className="hover:text-white transition">Inicio</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition">Comunidad</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition">Privacidad</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Términos</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2025 Crowd Conscious. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
