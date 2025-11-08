'use client'

import { useState } from 'react'
import { Ticket, Plus, Copy, Check, Trash2, Edit, TrendingUp, DollarSign, Users, AlertCircle } from 'lucide-react'

type PromoCode = {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed_amount' | 'free'
  discount_value: number
  max_uses: number | null
  max_uses_per_user: number
  current_uses: number
  valid_from: string
  valid_until: string | null
  active: boolean
  partner_name: string | null
  campaign_name: string | null
  minimum_purchase_amount: number
  created_at: string
}

type UsageStat = {
  promo_code_id: string
  discount_amount: number
}

export default function PromoCodesClient({
  initialPromoCodes,
  usageStats,
  currentUserId
}: {
  initialPromoCodes: PromoCode[]
  usageStats: UsageStat[]
  currentUserId: string
}) {
  const [promoCodes, setPromoCodes] = useState(initialPromoCodes)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount' | 'free',
    discount_value: '',
    max_uses: '',
    max_uses_per_user: '1',
    valid_until: '',
    partner_name: '',
    campaign_name: '',
    minimum_purchase_amount: '0',
    notes: ''
  })

  const calculateStats = () => {
    const totalCodes = promoCodes.length
    const activeCodes = promoCodes.filter(c => c.active).length
    const totalUses = promoCodes.reduce((sum, c) => sum + c.current_uses, 0)
    const totalSavings = usageStats.reduce((sum, s) => sum + Number(s.discount_amount), 0)

    return { totalCodes, activeCodes, totalUses, totalSavings }
  }

  const stats = calculateStats()

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      code: formData.code.toUpperCase().trim(),
      description: formData.description || null,
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      max_uses_per_user: parseInt(formData.max_uses_per_user),
      valid_until: formData.valid_until || null,
      partner_name: formData.partner_name || null,
      campaign_name: formData.campaign_name || null,
      minimum_purchase_amount: parseFloat(formData.minimum_purchase_amount) || 0,
      notes: formData.notes || null,
      created_by: currentUserId
    }

    try {
      const response = await fetch('/api/admin/promo-codes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const { promoCode } = await response.json()
        setPromoCodes([promoCode, ...promoCodes])
        setShowCreateForm(false)
        // Reset form
        setFormData({
          code: '',
          description: '',
          discount_type: 'percentage',
          discount_value: '',
          max_uses: '',
          max_uses_per_user: '1',
          valid_until: '',
          partner_name: '',
          campaign_name: '',
          minimum_purchase_amount: '0',
          notes: ''
        })
        alert('✅ Código promocional creado exitosamente')
      } else {
        const error = await response.json()
        alert(`❌ Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating promo code:', error)
      alert('❌ Error al crear el código')
    }
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch('/api/admin/promo-codes/toggle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !currentActive })
      })

      if (response.ok) {
        setPromoCodes(promoCodes.map(code => 
          code.id === id ? { ...code, active: !currentActive } : code
        ))
      }
    } catch (error) {
      console.error('Error toggling code:', error)
    }
  }

  const getDiscountDisplay = (code: PromoCode) => {
    if (code.discount_type === 'free') return '100% OFF'
    if (code.discount_type === 'percentage') return `${code.discount_value}% OFF`
    return `$${code.discount_value} MXN OFF`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Códigos Promocionales</h1>
          <p className="text-slate-600 mt-1">Gestiona descuentos para socios estratégicos y promociones</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:scale-105 transition-transform flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Crear Código
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Ticket className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.totalCodes}</div>
          <div className="text-sm text-slate-600 font-medium">Códigos Totales</div>
          <div className="text-xs text-slate-500 mt-1">{stats.activeCodes} activos</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.totalUses}</div>
          <div className="text-sm text-slate-600 font-medium">Usos Totales</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            ${stats.totalSavings.toLocaleString()}
          </div>
          <div className="text-sm text-slate-600 font-medium">Descuentos Otorgados</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {stats.totalUses > 0 ? Math.round(stats.totalSavings / stats.totalUses) : 0}
          </div>
          <div className="text-sm text-slate-600 font-medium">Descuento Promedio</div>
        </div>
      </div>

      {/* Active Promo Codes Quickview */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1">🎫 Códigos Activos</h3>
            <p className="text-purple-100 text-sm">Comparte estos códigos con tus socios y campañas</p>
          </div>
          <div className="text-3xl font-bold">{stats.activeCodes}</div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {promoCodes.filter(code => code.active).slice(0, 6).map((code) => (
            <div 
              key={code.id}
              className="bg-white/20 backdrop-blur-sm rounded-lg p-4 hover:bg-white/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <code className="text-lg font-mono font-bold">{code.code}</code>
                <button
                  onClick={() => handleCopyCode(code.code)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Copiar código"
                >
                  {copiedCode === code.code ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="text-2xl font-bold mb-1">{getDiscountDisplay(code)}</div>
              {code.partner_name && (
                <div className="text-sm text-purple-100">{code.partner_name}</div>
              )}
              {code.campaign_name && (
                <div className="text-xs text-purple-200">{code.campaign_name}</div>
              )}
              <div className="text-xs text-purple-200 mt-2">
                {code.current_uses} {code.max_uses ? `/ ${code.max_uses}` : '/ ∞'} usos
              </div>
            </div>
          ))}
        </div>
        
        {promoCodes.filter(code => code.active).length === 0 && (
          <div className="text-center py-8 text-purple-100">
            <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay códigos activos. Crea uno arriba ↑</p>
          </div>
        )}
        
        {promoCodes.filter(code => code.active).length > 6 && (
          <p className="text-center text-purple-100 text-sm mt-4">
            + {promoCodes.filter(code => code.active).length - 6} códigos más activos (ver tabla abajo)
          </p>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Crear Nuevo Código</h3>
          <form onSubmit={handleCreateCode} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="PARTNER50"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de Descuento <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed_amount">Monto Fijo (MXN)</option>
                  <option value="free">Gratis (100% OFF)</option>
                </select>
              </div>

              {/* Discount Value */}
              {formData.discount_type !== 'free' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Valor del Descuento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max={formData.discount_type === 'percentage' ? '100' : undefined}
                    step="0.01"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    placeholder={formData.discount_type === 'percentage' ? '50' : '5000'}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Max Uses */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Usos Máximos (Total)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="Ilimitado"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Max Uses Per User */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Usos por Usuario
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_uses_per_user}
                  onChange={(e) => setFormData({ ...formData, max_uses_per_user: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Valid Until */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Válido Hasta
                </label>
                <input
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Partner Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre del Socio
                </label>
                <input
                  type="text"
                  value={formData.partner_name}
                  onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                  placeholder="EcoTech Solutions"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de Campaña
                </label>
                <input
                  type="text"
                  value={formData.campaign_name}
                  onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                  placeholder="Launch Week 2025"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Minimum Purchase */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Compra Mínima (MXN)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minimum_purchase_amount}
                  onChange={(e) => setFormData({ ...formData, minimum_purchase_amount: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descripción Interna
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descuento para socios estratégicos"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Notas adicionales..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-medium hover:scale-105 transition-transform"
              >
                Crear Código
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="border-2 border-slate-300 text-slate-700 px-6 py-2 rounded-lg font-medium hover:border-slate-400"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Codes List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Códigos Activos</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Descuento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Socio/Campaña</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {promoCodes.map((code) => (
                <tr key={code.id} className={!code.active ? 'bg-slate-50 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        {code.code}
                      </code>
                      <button
                        onClick={() => handleCopyCode(code.code)}
                        className="text-slate-400 hover:text-purple-600"
                        title="Copiar código"
                      >
                        {copiedCode === code.code ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {code.description && (
                      <div className="text-xs text-slate-500 mt-1">{code.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-slate-900">
                      {getDiscountDisplay(code)}
                    </span>
                    {code.minimum_purchase_amount > 0 && (
                      <div className="text-xs text-slate-500">
                        Min: ${code.minimum_purchase_amount}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {code.current_uses} 
                    {code.max_uses ? ` / ${code.max_uses}` : ' / ∞'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {code.partner_name && <div className="font-medium">{code.partner_name}</div>}
                    {code.campaign_name && <div className="text-xs text-slate-500">{code.campaign_name}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      code.active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {code.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleToggleActive(code.id, code.active)}
                      className={`px-3 py-1 rounded-lg font-medium ${
                        code.active
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {code.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-bold text-slate-900 mb-2">Cómo usar los códigos:</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>✅ Copia el código y compártelo con socios estratégicos</li>
              <li>✅ Los usuarios pueden aplicar el código en el carrito antes de pagar</li>
              <li>✅ Puedes desactivar códigos en cualquier momento</li>
              <li>✅ Los códigos "free" (100% OFF) son ideales para demos y socios VIP</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

