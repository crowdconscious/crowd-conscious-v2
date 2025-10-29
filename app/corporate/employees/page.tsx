'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Mail, Users, UserPlus, CheckCircle, Clock, XCircle, Loader, Download, Trash2 } from 'lucide-react'

interface Employee {
  id: string
  full_name: string
  email: string
  created_at: string
  status: 'active'
}

interface Invitation {
  id: string
  email: string
  full_name: string | null
  status: 'pending' | 'accepted' | 'expired'
  sent_at: string
  expires_at: string
}

export default function EmployeesPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [corporateAccountId, setCorporateAccountId] = useState('')
  const [userId, setUserId] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteResult, setInviteResult] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('corporate_account_id, corporate_role')
        .eq('id', user.id)
        .single()

      const profile = profileData as any

      if (!profile?.corporate_account_id || profile.corporate_role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setCorporateAccountId(profile.corporate_account_id)

      // Load employees
      const { data: employeesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('corporate_account_id', profile.corporate_account_id)
        .eq('is_corporate_user', true)
        .order('created_at', { ascending: false })

      const employees = (employeesData as any) || []
      setEmployees(employees.map((e: any) => ({ ...e, status: 'active' as const })))

      // Load invitations
      await loadInvitations(profile.corporate_account_id)

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const loadInvitations = async (corpAccountId: string) => {
    try {
      const response = await fetch(`/api/corporate/invite?corporate_account_id=${corpAccountId}`)
      const data = await response.json()
      
      if (data.invitations) {
        // Check for expired invitations
        const now = new Date()
        const processedInvitations = data.invitations.map((inv: any) => {
          const expiresAt = new Date(inv.expires_at)
          if (inv.status === 'pending' && now > expiresAt) {
            return { ...inv, status: 'expired' }
          }
          return inv
        })
        
        setInvitations(processedInvitations)
      }
    } catch (error) {
      console.error('Error loading invitations:', error)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmails.trim()) return

    setInviting(true)
    setInviteResult(null)

    try {
      // Parse emails (comma or newline separated)
      const emailList = inviteEmails
        .split(/[,\n]/)
        .map(e => e.trim())
        .filter(e => e.length > 0)

      const response = await fetch('/api/corporate/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: emailList,
          corporate_account_id: corporateAccountId,
          invited_by_id: userId
        })
      })

      const data = await response.json()

      setInviteResult(data)
      
      if (data.success) {
        setInviteEmails('')
        // Reload invitations
        await loadInvitations(corporateAccountId)
      }

      setInviting(false)
    } catch (error: any) {
      setInviteResult({ error: error.message })
      setInviting(false)
    }
  }

  const downloadCSVTemplate = () => {
    const csv = 'email\nexample1@company.com\nexample2@company.com'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'invitaciones-template.csv'
    a.click()
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Activo' },
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'Pendiente' },
      accepted: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Aceptado' },
      expired: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Expirado' }
    }

    const badge = badges[status as keyof typeof badges] || badges.pending
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  const totalSlots = employees.length + invitations.filter(i => i.status === 'pending').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Empleados</h1>
          <p className="text-slate-600 mt-1">
            Gestiona invitaciones y empleados activos
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-gradient-to-r from-teal-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:scale-105 transition-transform flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Invitar Empleados
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-600">Empleados Activos</div>
              <div className="text-3xl font-bold text-slate-900 mt-1">{employees.length}</div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-600">Invitaciones Pendientes</div>
              <div className="text-3xl font-bold text-slate-900 mt-1">
                {invitations.filter(i => i.status === 'pending').length}
              </div>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-600">Espacios Usados</div>
              <div className="text-3xl font-bold text-slate-900 mt-1">{totalSlots} / 100</div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
            <div 
              className="bg-gradient-to-r from-teal-600 to-purple-600 h-2 rounded-full"
              style={{ width: `${(totalSlots / 100) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Empleados Activos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase">Nombre</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase">Fecha de Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {employees.length > 0 ? employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{employee.full_name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{employee.email}</td>
                  <td className="px-6 py-4">{getStatusBadge(employee.status)}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(employee.created_at).toLocaleDateString('es-MX')}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No hay empleados activos aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Invitaciones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase">Enviado</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase">Expira</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invitations.length > 0 ? invitations.map((invitation) => (
                <tr key={invitation.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{invitation.email}</div>
                    {invitation.full_name && (
                      <div className="text-sm text-slate-500">{invitation.full_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(invitation.status)}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(invitation.sent_at).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(invitation.expires_at).toLocaleDateString('es-MX')}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No hay invitaciones enviadas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900">Invitar Empleados</h3>
              <p className="text-slate-600 mt-1">Envía invitaciones por email a tus empleados</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Emails (uno por línea o separados por comas)
                </label>
                <textarea
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-teal-500 focus:outline-none font-mono text-sm"
                  placeholder="email1@ejemplo.com&#10;email2@ejemplo.com&#10;email3@ejemplo.com"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <button
                  onClick={downloadCSVTemplate}
                  className="flex items-center gap-1 text-teal-600 hover:text-teal-700"
                >
                  <Download className="w-4 h-4" />
                  Descargar plantilla CSV
                </button>
              </div>

              {inviteResult && (
                <div className={`p-4 rounded-lg ${
                  inviteResult.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
                }`}>
                  {inviteResult.success ? (
                    <div>
                      <p className="font-medium text-green-900">
                        ✓ {inviteResult.invited} invitaciones enviadas exitosamente
                      </p>
                      {inviteResult.errors > 0 && (
                        <p className="text-sm text-green-700 mt-1">
                          {inviteResult.errors} errores
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-900">{inviteResult.error}</p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteResult(null)
                }}
                className="px-6 py-2 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmails.trim()}
                className="px-6 py-2 bg-gradient-to-r from-teal-600 to-purple-600 text-white rounded-lg font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
              >
                {inviting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Enviar Invitaciones
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
