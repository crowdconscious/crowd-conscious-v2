'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Filter, Star, Clock, Users, TrendingUp, Sparkles, ChevronDown, Share2, MessageCircle, ArrowLeft } from 'lucide-react'
import CartButton from '../components/cart/CartButton'

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
    individualPrice: 360,
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
    individualPrice: 360,
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
    individualPrice: 360,
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
    individualPrice: 360,
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
    individualPrice: 360,
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
    individualPrice: 360,
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
        console.log('🔍 Fetching modules with stats from API...')
        const response = await fetch('/api/marketplace/modules-with-stats')
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

  const shareModule = (module: any, platform: 'twitter' | 'linkedin' | 'facebook' | 'whatsapp') => {
    const url = `https://crowdconscious.app/marketplace/${module.id}`
    const text = `🌍 ${module.title} - ${module.description.substring(0, 100)}... | Crowd Conscious`
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
    }
    
    window.open(shareUrls[platform], '_blank', 'width=600,height=400')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          {/* Back Button */}
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Volver al Dashboard</span>
            </Link>
          </div>

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
                            <span className="font-bold">{module.rating || 0}</span>
                            <span className="text-slate-500">({module.reviewCount || 0})</span>
                          </div>
                          <div className="flex items-center gap-1 text-teal-600">
                            <Users className="w-4 h-4" />
                            <span>{module.enrollments?.toLocaleString() || 0} inscritos</span>
                          </div>
                          <div className="flex items-center gap-1 text-purple-600">
                            <Clock className="w-4 h-4" />
                            <span>{module.duration}h</span>
                          </div>
                        </div>

                        {/* Share Buttons */}
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-200">
                          <span className="text-xs text-slate-600 font-medium">Compartir:</span>
                          <button
                            onClick={(e) => { e.preventDefault(); shareModule(module, 'twitter'); }}
                            className="p-2 rounded-lg hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                            title="Compartir en Twitter"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); shareModule(module, 'linkedin'); }}
                            className="p-2 rounded-lg hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-colors"
                            title="Compartir en LinkedIn"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); shareModule(module, 'facebook'); }}
                            className="p-2 rounded-lg hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                            title="Compartir en Facebook"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); shareModule(module, 'whatsapp'); }}
                            className="p-2 rounded-lg hover:bg-green-50 text-slate-600 hover:text-green-600 transition-colors"
                            title="Compartir en WhatsApp"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                          </button>
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
                              ${module.individualPrice || 360}
                              <span className="text-sm text-slate-600 font-normal"> MXN</span>
                            </div>
                            <div className="text-xs text-slate-500">por persona</div>
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

      {/* Floating Cart Button */}
      <CartButton />
    </div>
  )
}

