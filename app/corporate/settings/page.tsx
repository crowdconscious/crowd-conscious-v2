import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Building2, Users, CreditCard, Bell, Shield, FileText, ExternalLink } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  // Get profile and corporate account
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: corporateAccount } = await supabase
    .from('corporate_accounts')
    .select('*')
    .eq('id', profile?.corporate_account_id)
    .single()

  // Get employee count
  const { count: employeeCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('corporate_account_id', profile?.corporate_account_id)
    .eq('is_corporate_user', true)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configuración</h1>
        <p className="text-slate-600 mt-1">Administra tu cuenta corporativa y preferencias</p>
      </div>

      {/* Company Information */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Información de la Empresa</h2>
            <p className="text-sm text-slate-600">Datos básicos de tu cuenta corporativa</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Nombre de la Empresa</label>
            <input
              type="text"
              defaultValue={corporateAccount?.company_name || ''}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              disabled
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Industria</label>
            <input
              type="text"
              defaultValue={corporateAccount?.industry || 'No especificada'}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              disabled
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Email de Contacto</label>
            <input
              type="email"
              defaultValue={corporateAccount?.contact_email || profile?.email}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              disabled
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Teléfono</label>
            <input
              type="tel"
              defaultValue={corporateAccount?.contact_phone || 'No especificado'}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              disabled
            />
          </div>
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600">
            <strong>Nota:</strong> Para actualizar la información de tu empresa, contacta a nuestro equipo de soporte en{' '}
            <a href="mailto:comunidad@crowdconscious.app" className="text-teal-600 hover:text-teal-700">
              comunidad@crowdconscious.app
            </a>
          </p>
        </div>
      </div>

      {/* Program Details */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Detalles del Programa</h2>
            <p className="text-sm text-slate-600">Tu plan actual y límites</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-600 mb-1">Plan Actual</div>
            <div className="text-2xl font-bold text-slate-900 capitalize mb-2">
              {corporateAccount?.program_tier || 'impact'}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-green-700 font-medium">Activo</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-600 mb-1">Empleados</div>
            <div className="text-2xl font-bold text-slate-900 mb-2">
              {employeeCount} / {corporateAccount?.employee_limit || 100}
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-teal-500 h-2 rounded-full transition-all"
                style={{ width: `${((employeeCount || 0) / (corporateAccount?.employee_limit || 100)) * 100}%` }}
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-600 mb-1">Módulos Incluidos</div>
            <div className="text-2xl font-bold text-slate-900 mb-2">
              {corporateAccount?.modules_included?.length || 6}
            </div>
            <Link href="/concientizaciones" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
              Explorar más →
            </Link>
          </div>
        </div>

        {corporateAccount?.program_start_date && (
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Inicio del Programa:</span>
              <span className="font-medium text-slate-900">
                {formatDate(corporateAccount.program_start_date)}
              </span>
            </div>
            {corporateAccount.program_end_date && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Finaliza:</span>
                <span className="font-medium text-slate-900">
                  {formatDate(corporateAccount.program_end_date)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modules Included */}
      {corporateAccount?.modules_included && corporateAccount.modules_included.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Módulos Incluidos</h2>
              <p className="text-sm text-slate-600">Contenido disponible para tus empleados</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {corporateAccount.modules_included.map((moduleId: string, index: number) => {
              const moduleNames: Record<string, { name: string; icon: string }> = {
                'clean_air': { name: 'Aire Limpio', icon: '🌬️' },
                'clean_water': { name: 'Agua Limpia', icon: '💧' },
                'safe_cities': { name: 'Ciudades Seguras', icon: '🏙️' },
                'zero_waste': { name: 'Cero Residuos', icon: '♻️' },
                'fair_trade': { name: 'Comercio Justo', icon: '🤝' },
                'integration': { name: 'Integración & Impacto', icon: '🎉' },
              }

              const module = moduleNames[moduleId] || { name: moduleId, icon: '📚' }

              return (
                <div key={index} className="border border-slate-200 rounded-lg p-4 hover:border-teal-300 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{module.icon}</span>
                    <div>
                      <div className="font-medium text-slate-900">{module.name}</div>
                      <div className="text-xs text-green-600 font-medium">✓ Incluido</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6">
            <Link
              href="/concientizaciones"
              className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Explorar módulos adicionales en el marketplace
            </Link>
          </div>
        </div>
      )}

      {/* Account Management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Administradores</h2>
            <p className="text-sm text-slate-600">Usuarios con acceso al panel corporativo</p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">{profile?.full_name || 'Admin'}</div>
              <div className="text-sm text-slate-600">{profile?.email}</div>
              <div className="text-xs text-teal-600 font-medium mt-1">Administrador Principal</div>
            </div>
            <div className="text-sm text-slate-500">Activo</div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600">
            Para agregar más administradores o transferir la propiedad de la cuenta, contacta a soporte.
          </p>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Bell className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Notificaciones</h2>
            <p className="text-sm text-slate-600">Configura cómo recibes actualizaciones</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <div className="font-medium text-slate-900">Progreso de Empleados</div>
              <div className="text-sm text-slate-600">Notificaciones cuando un empleado completa un módulo</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <div className="font-medium text-slate-900">Resumen Semanal</div>
              <div className="text-sm text-slate-600">Reporte semanal con métricas de impacto</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium text-slate-900">Nuevos Módulos</div>
              <div className="text-sm text-slate-600">Alertas sobre nuevo contenido disponible</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Seguridad</h2>
            <p className="text-sm text-slate-600">Protege tu cuenta corporativa</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div>
              <div className="font-medium text-slate-900">Cambiar Contraseña</div>
              <div className="text-sm text-slate-600">Actualiza tu contraseña regularmente</div>
            </div>
            <button className="text-teal-600 hover:text-teal-700 font-medium text-sm">
              Cambiar →
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div>
              <div className="font-medium text-slate-900">Autenticación de Dos Factores</div>
              <div className="text-sm text-slate-600">Añade una capa extra de seguridad</div>
            </div>
            <button className="text-teal-600 hover:text-teal-700 font-medium text-sm">
              Activar →
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div>
              <div className="font-medium text-slate-900">Historial de Sesiones</div>
              <div className="text-sm text-slate-600">Ver dispositivos activos</div>
            </div>
            <button className="text-teal-600 hover:text-teal-700 font-medium text-sm">
              Ver →
            </button>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="bg-gradient-to-br from-teal-50 to-purple-50 rounded-xl p-6 border border-teal-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">¿Necesitas Ayuda?</h3>
        <p className="text-slate-700 mb-4">
          Nuestro equipo está aquí para apoyarte. Contacta a soporte para cualquier pregunta sobre tu cuenta.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="mailto:comunidad@crowdconscious.app"
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition font-medium"
          >
            📧 Enviar Email
          </a>
          <button className="inline-flex items-center gap-2 bg-white text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-50 transition font-medium border border-slate-200">
            💬 Chat en Vivo
          </button>
          <Link
            href="/corporate/help"
            className="inline-flex items-center gap-2 bg-white text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-50 transition font-medium border border-slate-200"
          >
            📚 Centro de Ayuda
          </Link>
        </div>
      </div>
    </div>
  )
}
