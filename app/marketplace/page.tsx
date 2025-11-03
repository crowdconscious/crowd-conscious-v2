'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Filter, Star, Clock, Users, TrendingUp, Sparkles, ChevronDown } from 'lucide-react'

const CORE_VALUES = [
  { id: 'all', name: 'Todos', icon: '🌟', color: 'from-slate-500 to-slate-600' },
  { id: 'clean_air', name: 'Aire Limpio', icon: '🌬️', color: 'from-blue-500 to-cyan-500' },
  { id: 'clean_water', name: 'Agua Limpia', icon: '💧', color: 'from-cyan-500 to-teal-500' },
  { id: 'safe_cities', name: 'Ciudades Seguras', icon: '🏙️', color: 'from-purple-500 to-pink-500' },
  { id: 'zero_waste', name: 'Cero Residuos', icon: '♻️', color: 'from-green-500 to-emerald-500' },
  { id: 'fair_trade', name: 'Comercio Justo', icon: '🤝', color: 'from-orange-500 to-amber-500' },
  { id: 'biodiversity', name: 'Biodiversidad', icon: '🌱', color: 'from-lime-500 to-green-500' },
]

const DIFFICULTY_LEVELS = [
  { id: 'all', name: 'Todos los niveles' },
  { id: 'beginner', name: 'Principiante' },
  { id: 'intermediate', name: 'Intermedio' },
  { id: 'advanced', name: 'Avanzado' },
]

const SORT_OPTIONS = [
  { id: 'newest', name: 'Más recientes' },
  { id: 'popular', name: 'Más populares' },
  { id: 'highest_rated', name: 'Mejor calificados' },
  { id: 'price_low', name: 'Precio: bajo a alto' },
  { id: 'price_high', name: 'Precio: alto a bajo' },
]

// Mock data - will be replaced with API call
const MOCK_MODULES = [
  {
    id: '1',
    title: 'Estrategias Avanzadas de Calidad del Aire',
    description: 'Aprende a medir, analizar y mejorar la calidad del aire en espacios de trabajo. Incluye herramientas prácticas y estudios de caso reales.',
    coreValue: 'clean_air',
    difficulty: 'intermediate',
    creator: 'Colonia Verde CDMX',
    creatorAvatar: '🌳',
    rating: 4.8,
    reviewCount: 142,
    enrollments: 1250,
    duration: 8,
    price: 18000,
    featured: true,
    thumbnailUrl: null
  },
  {
    id: '2',
    title: 'Gestión Sostenible del Agua',
    description: 'De la escasez a la abundancia: técnicas probadas para reducir el consumo de agua en un 40%. Casos de éxito de empresas mexicanas.',
    coreValue: 'clean_water',
    difficulty: 'beginner',
    creator: 'Comunidad Aguascalientes',
    creatorAvatar: '💧',
    rating: 4.9,
    reviewCount: 98,
    enrollments: 890,
    duration: 6,
    price: 18000,
    featured: true,
    thumbnailUrl: null
  },
  {
    id: '3',
    title: 'Seguridad Urbana para Empresas',
    description: 'Construye espacios seguros alrededor de tu empresa. Aprende de comunidades que redujeron el crimen en 35% con iluminación y diseño urbano.',
    coreValue: 'safe_cities',
    difficulty: 'intermediate',
    creator: 'Barrio Seguro Monterrey',
    creatorAvatar: '🏙️',
    rating: 4.7,
    reviewCount: 76,
    enrollments: 650,
    duration: 10,
    price: 18000,
    featured: false,
    thumbnailUrl: null
  },
  {
    id: '4',
    title: 'Economía Circular: De Residuo a Recurso',
    description: 'Transforma tu gestión de residuos en una fuente de ingresos. Incluye calculadora de ROI y directorio de compradores de materiales reciclables.',
    coreValue: 'zero_waste',
    difficulty: 'advanced',
    creator: 'EcoCircular Guadalajara',
    creatorAvatar: '♻️',
    rating: 4.6,
    reviewCount: 52,
    enrollments: 420,
    duration: 12,
    price: 18000,
    featured: false,
    thumbnailUrl: null
  },
  {
    id: '5',
    title: 'Cadenas de Suministro Éticas',
    description: 'Construye relaciones justas con proveedores locales. Ahorra en transporte, fortalece tu comunidad y mejora tu reputación de marca.',
    coreValue: 'fair_trade',
    difficulty: 'beginner',
    creator: 'Red de Productores Querétaro',
    creatorAvatar: '🤝',
    rating: 4.9,
    reviewCount: 63,
    enrollments: 520,
    duration: 7,
    price: 18000,
    featured: false,
    thumbnailUrl: null
  },
  {
    id: '6',
    title: 'Biodiversidad en Espacios Corporativos',
    description: 'Crea jardines polinizadores y espacios verdes que mejoran el bienestar de empleados y apoyan ecosistemas locales.',
    coreValue: 'biodiversity',
    difficulty: 'beginner',
    creator: 'Jardines Urbanos Puebla',
    creatorAvatar: '🌱',
    rating: 4.8,
    reviewCount: 41,
    enrollments: 380,
    duration: 5,
    price: 18000,
    featured: false,
    thumbnailUrl: null
  },
]

export default function MarketplacePage() {
  const [modules, setModules] = useState(MOCK_MODULES)
  const [filteredModules, setFilteredModules] = useState(MOCK_MODULES)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCoreValue, setSelectedCoreValue] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch real modules from database
  useEffect(() => {
    async function fetchModules() {
      try {
        console.log('🔍 Fetching modules from API...')
        const response = await fetch('/api/marketplace/modules')
        console.log('📡 Response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ Modules fetched:', data.modules?.length || 0)
          console.log('📦 First module:', data.modules?.[0])
          setModules(data.modules)
          setFilteredModules(data.modules)
        } else {
          console.error('❌ Failed to fetch modules, status:', response.status)
          console.log('Using fallback mock data')
          // Keep mock data as fallback
        }
      } catch (error) {
        console.error('💥 Error fetching modules:', error)
        console.log('Using fallback mock data')
        // Keep mock data as fallback
      } finally {
        setLoading(false)
      }
    }
    fetchModules()
  }, [])

  // Filter and sort logic
  useEffect(() => {
    let filtered = [...modules]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(module =>
        module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        module.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        module.creator.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Core value filter
    if (selectedCoreValue !== 'all') {
      filtered = filtered.filter(module => module.coreValue === selectedCoreValue)
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(module => module.difficulty === selectedDifficulty)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return 0 // Would use created_at in real implementation
        case 'popular':
          return b.enrollments - a.enrollments
        case 'highest_rated':
          return b.rating - a.rating
        case 'price_low':
          return a.price - b.price
        case 'price_high':
          return b.price - a.price
        default:
          return 0
      }
    })

    setFilteredModules(filtered)
  }, [searchQuery, selectedCoreValue, selectedDifficulty, sortBy, modules])

  const getCoreValueInfo = (coreValueId: string) => {
    return CORE_VALUES.find(cv => cv.id === coreValueId) || CORE_VALUES[0]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Marketplace de Impacto
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Capacitación Creada por <br className="hidden sm:block" />
              <span className="text-yellow-300">Comunidades Reales</span>
            </h1>
            <p className="text-xl sm:text-2xl text-white/90 mb-8">
              Cursos auténticos de comunidades que resolvieron problemas reales. <br className="hidden sm:block" />
              Tu compra financia más proyectos comunitarios.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/assessment"
                className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-xl"
              >
                Descubre qué necesitas →
              </Link>
              <button
                onClick={() => document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white/20 backdrop-blur-sm text-white border-2 border-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/30 transition-colors"
              >
                Explorar Módulos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">50+</div>
              <div className="text-sm text-slate-600 mt-1">Módulos Disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600">30+</div>
              <div className="text-sm text-slate-600 mt-1">Comunidades Creadoras</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">5,000+</div>
              <div className="text-sm text-slate-600 mt-1">Empleados Capacitados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-teal-600">4.8★</div>
              <div className="text-sm text-slate-600 mt-1">Calificación Promedio</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div id="modules" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="sticky top-8">
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden w-full mb-4 flex items-center justify-between bg-white border-2 border-slate-200 rounded-xl px-4 py-3 font-medium"
              >
                <span className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros
                </span>
                <ChevronDown className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {/* Filters */}
              <div className={`space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                {/* Core Values */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Valor Central</h3>
                  <div className="space-y-2">
                    {CORE_VALUES.map(value => (
                      <button
                        key={value.id}
                        onClick={() => setSelectedCoreValue(value.id)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                          selectedCoreValue === value.id
                            ? 'bg-purple-100 text-purple-900 font-medium'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{value.icon}</span>
                          <span>{value.name}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Dificultad</h3>
                  <div className="space-y-2">
                    {DIFFICULTY_LEVELS.map(level => (
                      <button
                        key={level.id}
                        onClick={() => setSelectedDifficulty(level.id)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                          selectedDifficulty === level.id
                            ? 'bg-purple-100 text-purple-900 font-medium'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {level.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset Filters */}
                <button
                  onClick={() => {
                    setSelectedCoreValue('all')
                    setSelectedDifficulty('all')
                    setSearchQuery('')
                  }}
                  className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Search and Sort Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar módulos, temas, comunidades..."
                    className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-600 focus:outline-none"
                  />
                </div>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-600 focus:outline-none font-medium bg-white"
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-6">
              <p className="text-slate-600">
                Mostrando <span className="font-bold text-slate-900">{filteredModules.length}</span> módulos
                {selectedCoreValue !== 'all' && (
                  <span> en <span className="font-bold">{getCoreValueInfo(selectedCoreValue).name}</span></span>
                )}
              </p>
            </div>

            {/* Module Grid */}
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="text-6xl mb-4">⏳</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Cargando módulos...</h3>
                <p className="text-slate-600">
                  Estamos preparando el contenido para ti
                </p>
              </div>
            ) : filteredModules.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No se encontraron módulos</h3>
                <p className="text-slate-600 mb-6">
                  Intenta ajustar tus filtros o búsqueda
                </p>
                <button
                  onClick={() => {
                    setSelectedCoreValue('all')
                    setSelectedDifficulty('all')
                    setSearchQuery('')
                  }}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                >
                  Limpiar Filtros
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredModules.map(module => {
                  const coreValue = getCoreValueInfo(module.coreValue)
                  
                  return (
                    <div
                      key={module.id}
                      className="bg-white rounded-xl shadow-sm border-2 border-slate-200 hover:border-purple-300 hover:shadow-xl transition-all overflow-hidden group"
                    >
                      {/* Featured Badge */}
                      {module.featured && (
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-4 py-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          DESTACADO
                        </div>
                      )}

                      {/* Thumbnail */}
                      <div className={`h-40 bg-gradient-to-br ${coreValue.color} flex items-center justify-center text-6xl`}>
                        {module.thumbnailUrl ? (
                          <img src={module.thumbnailUrl} alt={module.title} className="w-full h-full object-cover" />
                        ) : (
                          <span>{coreValue.icon}</span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        {/* Creator */}
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                          <span className="text-xl">{module.creatorAvatar}</span>
                          <span>{module.creator}</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
                          {module.title}
                        </h3>

                        {/* Description */}
                        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                          {module.description}
                        </p>

                        {/* Meta Info */}
                        <div className="flex flex-wrap gap-3 mb-4 text-sm">
                          <div className="flex items-center gap-1 text-yellow-600">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-bold">{module.rating}</span>
                            <span className="text-slate-500">({module.reviewCount})</span>
                          </div>
                          <div className="flex items-center gap-1 text-teal-600">
                            <Users className="w-4 h-4" />
                            <span>{module.enrollments.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1 text-purple-600">
                            <Clock className="w-4 h-4" />
                            <span>{module.duration}h</span>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${coreValue.color} text-white font-medium`}>
                            {coreValue.name}
                          </span>
                          <span className="text-xs px-3 py-1 rounded-full bg-slate-200 text-slate-700 font-medium capitalize">
                            {module.difficulty === 'beginner' && 'Principiante'}
                            {module.difficulty === 'intermediate' && 'Intermedio'}
                            {module.difficulty === 'advanced' && 'Avanzado'}
                          </span>
                        </div>

                        {/* Price and CTA */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                          <div>
                            <div className="text-sm text-slate-600">Desde</div>
                            <div className="text-2xl font-bold text-slate-900">
                              ${(module.price / 1000).toFixed(0)}k
                              <span className="text-sm text-slate-600 font-normal"> MXN</span>
                            </div>
                            <div className="text-xs text-slate-500">50 empleados</div>
                          </div>
                          <Link
                            href={`/marketplace/${module.id}`}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold hover:scale-105 transition-transform"
                          >
                            Ver Detalles
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            ¿No encuentras lo que buscas?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Solicita una evaluación gratuita y te recomendaremos los módulos perfectos para tu empresa
          </p>
          <Link
            href="/assessment"
            className="inline-block bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-xl"
          >
            Obtener Recomendaciones Personalizadas →
          </Link>
        </div>
      </div>
    </div>
  )
}

