import Link from 'next/link'
import { 
  ArrowLeft, Star, Users, Clock, TrendingUp, CheckCircle, 
  Award, BookOpen, Target, Sparkles, ShoppingCart, Download 
} from 'lucide-react'
import CartButton from '../../components/cart/CartButton'
import ModuleDetailClient from './ModuleDetailClient'

// Server-side fetch module data from API
const getModuleById = async (id: string) => {
  try {
    console.log('🔍 Server: Fetching module:', id)
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://crowdconscious.app'
    const response = await fetch(`${baseUrl}/api/marketplace/modules/${id}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📡 Server: Response status:', response.status)
    
    if (!response.ok) {
      console.error('❌ Server: Failed to fetch module:', response.status)
      const errorText = await response.text()
      console.error('Server: Error details:', errorText)
      return null
    }
    
    const data = await response.json()
    console.log('✅ Server: Module fetched:', data.module?.title)
    return data.module
  } catch (error) {
    console.error('💥 Server: Error fetching module:', error)
    return null
  }
}

// Old mock data - keeping for reference
const OLD_getModuleById = (id: string) => {
  const modules: any = {
    '1': {
      id: '1',
      title: 'Estrategias Avanzadas de Calidad del Aire',
      description: 'Aprende a medir, analizar y mejorar la calidad del aire en espacios de trabajo. Este módulo combina ciencia, tecnología y casos de éxito reales para transformar tu entorno laboral.',
      longDescription: 'Este módulo fue creado por Colonia Verde CDMX, una comunidad que redujo la contaminación del aire en un 40% en solo 18 meses. A través de su experiencia, aprenderás técnicas probadas para mejorar la calidad del aire, reducir enfermedades respiratorias y aumentar la productividad de tus empleados.',
      coreValue: 'clean_air',
      coreValueIcon: '🌬️',
      coreValueName: 'Aire Limpio',
      difficulty: 'intermediate',
      creator: 'Colonia Verde CDMX',
      creatorAvatar: '🌳',
      creatorBio: 'Comunidad pionera en calidad del aire en Ciudad de México. Implementaron soluciones innovadoras que redujeron PM2.5 en 40% y mejoraron la salud de 5,000 residentes.',
      rating: 4.8,
      reviewCount: 142,
      enrollments: 1250,
      duration: 8,
      lessonCount: 3,
      price: 18000,
      pricePerEmployee: 360,
      featured: true,
      whatYouLearn: [
        'Medir y monitorear la calidad del aire con herramientas profesionales',
        'Identificar fuentes de contaminación en espacios cerrados',
        'Implementar soluciones de ventilación natural y mecánica',
        'Usar plantas purificadoras estratégicamente',
        'Calcular ROI de mejoras en calidad del aire',
        'Presentar resultados a directivos con datos concretos'
      ],
      curriculum: [
        {
          title: 'Lección 1: El Problema Invisible',
          duration: '30 min',
          topics: ['Introducción a PM2.5', 'Impacto en salud', 'Medición básica'],
          xp: 250
        },
        {
          title: 'Lección 2: Estrategias de Mejora',
          duration: '45 min',
          topics: ['Ventilación', 'Purificación', 'Plantas', 'Filtros HEPA'],
          xp: 300
        },
        {
          title: 'Lección 3: Implementación y ROI',
          duration: '60 min',
          topics: ['Presupuesto', 'Implementación paso a paso', 'Medición de impacto'],
          xp: 350
        }
      ],
      toolsIncluded: [
        'Evaluación de Calidad del Aire',
        'Calculadora ROI de Calidad de Aire',
        'Calculadora de Impacto',
        'Subidor de Evidencia de Proyecto'
      ],
      outcomes: [
        'Reducción de ausentismo por enfermedades respiratorias',
        'Aumento de productividad (estudios muestran +10-15%)',
        'Mejora en satisfacción de empleados',
        'Cumplimiento con normas de salud ocupacional',
        'Datos concretos para reportes ESG'
      ],
      testimonials: [
        {
          name: 'Carlos Mendoza',
          role: 'Gerente de Operaciones',
          company: 'TechCorp México',
          avatar: '👨',
          rating: 5,
          text: 'Implementamos las estrategias y en 3 meses redujimos el ausentismo en 25%. El ROI fue increíble.'
        },
        {
          name: 'Ana Gutiérrez',
          role: 'Directora de RH',
          company: 'Manufactura del Norte',
          avatar: '👩',
          rating: 5,
          text: 'Los empleados notaron la diferencia inmediatamente. La satisfacción aumentó y tenemos datos para nuestro reporte ESG.'
        }
      ]
    }
  }
  
  return modules[id] || null
}

// Server Component - no hydration issues!
export default async function ModuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const module = await getModuleById(id)

  if (!module) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Módulo no encontrado</h1>
          <Link href="/marketplace" className="text-purple-600 hover:text-purple-700 font-medium">
            ← Volver al marketplace
          </Link>
        </div>
      </div>
    )
  }

  // Pass data to client component for interactive features
  return <ModuleDetailClient module={module} />
}

