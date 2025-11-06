'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, Star, Users, Clock, TrendingUp, CheckCircle, 
  Award, BookOpen, Target, Sparkles, ShoppingCart 
} from 'lucide-react'
import CartButton from '../../components/cart/CartButton'
import { createClient } from '@/lib/supabase-client'

interface ModuleDetailClientProps {
  module: any
}

export default function ModuleDetailClient({ module }: ModuleDetailClientProps) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Fetch user and profile data
  useEffect(() => {
    async function fetchUserData() {
      const supabase = createClient()
      
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
      
      if (currentUser) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('corporate_account_id, corporate_role')
          .eq('id', currentUser.id)
          .single()
        
        setProfile(userProfile)
      }
      
      setLoading(false)
    }
    
    fetchUserData()
  }, [])
  
  // Determine if user is corporate admin
  const isCorporate = profile?.corporate_role === 'admin' && profile?.corporate_account_id
  
  // Set initial employee count based on user type - ALWAYS DEFAULT TO 1
  const [employeeCount, setEmployeeCount] = useState(1)
  
  // Update employee count when user type is determined
  useEffect(() => {
    if (!loading) {
      setEmployeeCount(1) // Always start at 1
    }
  }, [isCorporate, loading])
  const [showAddToCart, setShowAddToCart] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)

  // Calculate price using Phase 1 pricing logic
  const calculatePrice = () => {
    // Individual pricing (1 person)
    if (employeeCount === 1) {
      return module.individual_price_mxn || Math.round(module.base_price_mxn / 50)
    }
    
    // Team pricing (2-20 people)
    if (employeeCount <= 20) {
      const pricePerPerson = Math.round(module.base_price_mxn / 50)
      const discount = module.team_discount_percent || 10
      return Math.round(pricePerPerson * employeeCount * (100 - discount) / 100)
    }
    
    // Corporate pricing (50+ people, pack-based)
    const packs = Math.ceil(employeeCount / 50)
    return module.base_price_mxn + ((packs - 1) * module.price_per_50_employees)
  }

  const calculatePricePerEmployee = () => {
    return Math.round(calculatePrice() / employeeCount)
  }

  const handleAddToCart = async () => {
    setAddingToCart(true)

    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: module.id,
          employeeCount: employeeCount
        })
      })

      const data = await response.json()

      if (response.ok) {
        setShowAddToCart(true)
        setTimeout(() => setShowAddToCart(false), 3000)
        console.log('✅ Added to cart:', data)
        
        // Trigger cart update event for CartButton to refresh
        window.dispatchEvent(new Event('cartUpdated'))
      } else {
        if (response.status === 401) {
          alert('Por favor inicia sesión para agregar al carrito.')
        } else if (data.error?.includes('already owned') || data.error?.includes('You already own')) {
          alert('Ya posees este módulo.')
        } else {
          alert(data.error || 'Error al agregar al carrito')
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      alert('Error de conexión. Por favor intenta de nuevo.')
    } finally {
      setAddingToCart(false)
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: module.title,
      text: `${module.description}\n\n💰 Desde $${(module.price / 1000).toFixed(0)}k MXN\n⭐ ${module.rating} estrellas\n👥 ${module.enrollments} inscritos`,
      url: window.location.href
    }

    try {
      // Try native share API first (mobile)
      if (navigator.share) {
        await navigator.share(shareData)
        console.log('✅ Shared successfully')
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(window.location.href)
        alert('✅ Link copiado al portapapeles! Compártelo con tu equipo.')
      }
    } catch (error) {
      console.error('Error sharing:', error)
      // Final fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('✅ Link copiado al portapapeles! Compártelo con tu equipo.')
      } catch (clipboardError) {
        console.error('Clipboard error:', clipboardError)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/marketplace"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-purple-600 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Marketplace
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Module Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{module.coreValueIcon || '🌟'}</span>
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                  {module.coreValueName || 'Sostenibilidad'}
                </span>
                {module.featured && (
                  <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    DESTACADO
                  </span>
                )}
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">{module.title}</h1>
              <p className="text-xl text-white/90 mb-6">{module.description}</p>

              {/* Stats */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-current text-yellow-300" />
                  <span className="font-bold">{module.rating || 4.8}</span>
                  <span className="text-white/80">({module.reviewCount || 0} reseñas)</span>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <Users className="w-5 h-5" />
                  <span>{(module.enrollments || 0).toLocaleString()} inscritos</span>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <Clock className="w-5 h-5" />
                  <span>{module.duration || 0} horas</span>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <BookOpen className="w-5 h-5" />
                  <span>{module.lessonCount || 0} lecciones</span>
                </div>
              </div>

              {/* Creator */}
              <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{module.creatorAvatar || '🏢'}</span>
                  <div>
                    <div className="font-medium">Creado por</div>
                    <div className="text-lg font-bold">{module.creator || 'Crowd Conscious'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Purchase Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-2xl p-6 sticky top-24">
                <div className="text-center mb-6">
                  {employeeCount === 1 ? (
                    <>
                      <div className="text-4xl font-bold text-slate-900 mb-1">
                        ${calculatePrice().toLocaleString()} MXN
                      </div>
                      <div className="text-sm text-slate-600">
                        Acceso personal
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl font-bold text-slate-900 mb-1">
                        ${(calculatePrice() / 1000).toFixed(0)}k MXN
                      </div>
                      <div className="text-sm text-slate-600">
                        ${calculatePricePerEmployee()} MXN por empleado
                      </div>
                    </>
                  )}
                </div>

                {/* Employee Count Selector - Only for corporate users */}
                {isCorporate && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Número de Empleados
                    </label>
                    <input
                      type="number"
                      value={employeeCount}
                      onChange={(e) => setEmployeeCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-600 focus:outline-none text-center text-lg font-bold"
                      min="1"
                      step="1"
                    />
                    <div className="text-xs text-slate-500 mt-2 text-center">
                      {Math.ceil(employeeCount / 50)} paquete(s) de 50 empleados
                    </div>
                  </div>
                )}

                {/* CTA Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingToCart ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        Agregar al Carrito
                      </>
                    )}
                  </button>
                  <Link
                    href="/assessment"
                    className="block w-full bg-white border-2 border-purple-600 text-purple-600 py-4 rounded-xl font-bold text-center hover:bg-purple-50 transition-colors"
                  >
                    Solicitar Cotización
                  </Link>
                </div>

                {/* Success Message */}
                {showAddToCart && (
                  <div className="mt-4 bg-green-100 border-2 border-green-600 text-green-900 px-4 py-3 rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">¡Agregado al carrito!</span>
                  </div>
                )}

                {/* Includes */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-3">Incluye:</h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Acceso de por vida</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Certificado al completar</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Herramientas interactivas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Dashboard de progreso</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Soporte prioritario</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Sobre este módulo</h2>
              <p className="text-slate-700 leading-relaxed">{module.longDescription}</p>
            </div>

            {/* What You'll Learn */}
            {module.whatYouLearn && module.whatYouLearn.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">¿Qué aprenderás?</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {module.whatYouLearn.map((item: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Curriculum */}
            {module.curriculum && module.curriculum.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Contenido del curso</h2>
                <div className="space-y-4">
                  {module.curriculum.map((lesson: any, index: number) => (
                    <div key={index} className="border-2 border-slate-200 rounded-xl p-6 hover:border-purple-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{lesson.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {lesson.duration}
                              </span>
                              <span className="flex items-center gap-1">
                                <Award className="w-4 h-4" />
                                {lesson.xp} XP
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {lesson.topics && lesson.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {lesson.topics.map((topic: string, topicIndex: number) => (
                            <span key={topicIndex} className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outcomes */}
            {module.outcomes && module.outcomes.length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Resultados esperados</h2>
                <div className="space-y-3">
                  {module.outcomes.map((outcome: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <Target className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 font-medium">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Testimonials */}
            {module.testimonials && module.testimonials.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Lo que dicen nuestros clientes</h2>
                <div className="space-y-6">
                  {module.testimonials.map((testimonial: any, index: number) => (
                    <div key={index} className="bg-slate-50 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{testimonial.avatar}</span>
                        <div>
                          <div className="font-bold text-slate-900">{testimonial.name}</div>
                          <div className="text-sm text-slate-600">{testimonial.role} - {testimonial.company}</div>
                        </div>
                      </div>
                      <div className="flex gap-1 mb-3">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current text-yellow-500" />
                        ))}
                      </div>
                      <p className="text-slate-700 italic">"{testimonial.text}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Tools Included */}
              {module.toolsIncluded && module.toolsIncluded.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Herramientas Incluidas
                  </h3>
                  <ul className="space-y-2">
                    {module.toolsIncluded.map((tool: string, index: number) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle className="w-4 h-4 text-purple-600" />
                        <span>{tool}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Creator Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-4">Sobre el creador</h3>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{module.creatorAvatar || '🏢'}</span>
                  <div>
                    <div className="font-bold text-slate-900">{module.creator || 'Crowd Conscious'}</div>
                    <div className="text-sm text-slate-600">Comunidad verificada</div>
                  </div>
                </div>
                <p className="text-sm text-slate-700">{module.creatorBio || 'Comunidad comprometida con la sostenibilidad'}</p>
              </div>

              {/* Share */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 text-center">
                <h3 className="font-bold text-slate-900 mb-2">¿Te gusta este módulo?</h3>
                <p className="text-sm text-slate-600 mb-4">Compártelo con tu equipo</p>
                <button 
                  onClick={handleShare}
                  className="w-full bg-white border-2 border-purple-600 text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                >
                  <span>📤</span>
                  Compartir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Cart Button */}
      <CartButton />
    </div>
  )
}

