import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen, TrendingUp, DollarSign, Edit, Trash2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CommunityModulesPage({ params }: PageProps) {
  const { id: communityId } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is community admin/founder
  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .single()

  if (!membership || (membership.role !== 'founder' && membership.role !== 'admin')) {
    redirect(`/communities/${communityId}`)
  }

  // Fetch community details
  const { data: community } = await supabase
    .from('communities')
    .select('name, slug')
    .eq('id', communityId)
    .single()

  // Fetch modules created by this community
  const { data: modules } = await supabase
    .from('marketplace_modules')
    .select(`
      id,
      title,
      description,
      slug,
      status,
      core_value,
      difficulty_level,
      base_price_mxn,
      purchase_count,
      enrollment_count,
      avg_rating,
      review_count,
      created_at
    `)
    .eq('creator_community_id', communityId)
    .order('created_at', { ascending: false })

  // Fetch wallet data for earnings
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('owner_type', 'community')
    .eq('owner_id', communityId)
    .single()

  // Calculate total earnings from module sales
  const { data: sales } = await supabase
    .from('module_sales')
    .select('community_share')
    .in('module_id', modules?.map(m => m.id) || [])

  const totalEarnings = sales?.reduce((sum, sale) => 
    sum + parseFloat(sale.community_share || '0'), 0
  ) || 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-purple-600" />
                Módulos de {community?.name}
              </h1>
              <p className="text-slate-600 mt-1">Administra los cursos creados por tu comunidad</p>
            </div>
            <Link
              href={`/communities/${communityId}/modules/create`}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:scale-105 transition-transform flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Crear Nuevo Módulo
            </Link>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Módulos</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{modules?.length || 0}</p>
              <p className="text-xs text-purple-600 mt-1">Creados por tu comunidad</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Ganancias</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(totalEarnings)}</p>
              <p className="text-xs text-green-600 mt-1">50% de ventas</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Ventas</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {modules?.reduce((sum, m) => sum + (m.purchase_count || 0), 0) || 0}
              </p>
              <p className="text-xs text-blue-600 mt-1">Total de compras</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">👥</span>
                <span className="text-sm font-medium text-orange-700">Estudiantes</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {modules?.reduce((sum, m) => sum + (m.enrollment_count || 0), 0) || 0}
              </p>
              <p className="text-xs text-orange-600 mt-1">Inscritos totales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!modules || modules.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No hay módulos aún</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Crea tu primer módulo de capacitación para compartir el conocimiento de tu comunidad con empresas.
            </p>
            <Link
              href={`/communities/${communityId}/modules/create`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5" />
              Crear Primer Módulo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {modules.map((module) => (
              <div
                key={module.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  {/* Status Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      module.status === 'published' ? 'bg-green-100 text-green-800' :
                      module.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {module.status === 'published' ? '✓ Publicado' :
                       module.status === 'review' ? '⏳ En Revisión' :
                       '📝 Borrador'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/communities/${communityId}/modules/${module.id}/edit`}
                        className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Module Info */}
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{module.title}</h3>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">{module.description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded">
                      {module.core_value}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                      {module.difficulty_level}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                      {formatCurrency(module.base_price_mxn || 0)}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Ventas</p>
                      <p className="text-lg font-bold text-slate-900">{module.purchase_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Estudiantes</p>
                      <p className="text-lg font-bold text-slate-900">{module.enrollment_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Rating</p>
                      <p className="text-lg font-bold text-slate-900">
                        {module.avg_rating ? `⭐ ${module.avg_rating.toFixed(1)}` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {module.status === 'published' && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <Link
                        href={`/marketplace/${module.slug}`}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Ver en Marketplace →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <Link
            href={`/communities/${communityId}`}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium"
          >
            ← Volver a la Comunidad
          </Link>
        </div>
      </div>
    </div>
  )
}

