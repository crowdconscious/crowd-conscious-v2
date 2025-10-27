import { createClient } from '@/lib/supabase-server'

export default async function EmployeesPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Empleados</h1>
        <p className="text-slate-600 mt-1">
          Gestiona y monitorea a tus empleados
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <p className="text-slate-600">
          🚧 Sección en desarrollo. Aquí podrás invitar y gestionar empleados.
        </p>
      </div>
    </div>
  )
}

