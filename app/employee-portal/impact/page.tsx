'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Award, Clock, Target, Leaf, DollarSign, Users, Zap, Trophy, Star } from 'lucide-react'

export default function EmployeeImpactPage() {
  const [loading, setLoading] = useState(true)
  const [impactData, setImpactData] = useState<any>(null)

  useEffect(() => {
    loadImpactData()
  }, [])

  const loadImpactData = async () => {
    try {
      const response = await fetch('/api/employee/impact')
      if (response.ok) {
        const data = await response.json()
        setImpactData(data)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading impact data:', error)
      setLoading(false)
    }
  }

  const calculateLevel = (xp: number) => {
    // Simple level calculation: 1000 XP per level
    return Math.floor(xp / 1000) + 1
  }

  const getXPForNextLevel = (xp: number) => {
    const currentLevel = calculateLevel(xp)
    return currentLevel * 1000
  }

  const getLevelProgress = (xp: number) => {
    const xpInCurrentLevel = xp % 1000
    return (xpInCurrentLevel / 1000) * 100
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse"></div>
      </div>
    )
  }

  const level = calculateLevel(impactData?.totalXP || 0)
  const nextLevelXP = getXPForNextLevel(impactData?.totalXP || 0)
  const levelProgress = getLevelProgress(impactData?.totalXP || 0)
  const xpToNextLevel = nextLevelXP - (impactData?.totalXP || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Mi Impacto</h1>
            <p className="text-white/90 text-lg">Tu contribución personal al cambio</p>
          </div>
        </div>

        {/* Level and XP */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-white/80 mb-1">Nivel Actual</div>
              <div className="text-4xl font-bold flex items-center gap-2">
                <Trophy className="w-8 h-8 text-yellow-300" />
                {level}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/80 mb-1">Total XP</div>
              <div className="text-3xl font-bold">{impactData?.totalXP || 0}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-white/80">
              <span>Progreso al Nivel {level + 1}</span>
              <span>{xpToNextLevel} XP restantes</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-yellow-300 to-orange-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                {impactData?.modulesCompleted || 0}
              </div>
              <div className="text-sm text-slate-600">Módulos Completados</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                {impactData?.timeSpentHours || 0}h
              </div>
              <div className="text-sm text-slate-600">Tiempo de Aprendizaje</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Leaf className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                {impactData?.co2Reduced || 0} kg
              </div>
              <div className="text-sm text-slate-600">CO₂ Equivalente</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                ${impactData?.costSavings || 0}
              </div>
              <div className="text-sm text-slate-600">Ahorros Generados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Impact Comparisons */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          Tu Impacto en Perspectiva
        </h2>

        <div className="space-y-6">
          {/* Trees Equivalent */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🌳</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900">Árboles Plantados (Equivalente)</h3>
                <span className="text-2xl font-bold text-green-600">
                  {Math.floor((impactData?.co2Reduced || 0) / 20)}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Tu reducción de CO₂ equivale a plantar {Math.floor((impactData?.co2Reduced || 0) / 20)} árboles
              </p>
              <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${Math.min(((impactData?.co2Reduced || 0) / 200) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Car Miles */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🚗</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900">Millas de Auto Ahorradas</h3>
                <span className="text-2xl font-bold text-blue-600">
                  {Math.floor((impactData?.co2Reduced || 0) * 2.5)}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Tu impacto equivale a no conducir {Math.floor((impactData?.co2Reduced || 0) * 2.5)} millas
              </p>
              <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(((impactData?.co2Reduced || 0) / 100) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Energy Saved */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">💡</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900">Horas de Bombilla LED</h3>
                <span className="text-2xl font-bold text-yellow-600">
                  {Math.floor((impactData?.co2Reduced || 0) * 100)}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Tu ahorro de energía equivale a {Math.floor((impactData?.co2Reduced || 0) * 100)} horas de luz LED
              </p>
              <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full"
                  style={{ width: `${Math.min(((impactData?.co2Reduced || 0) / 50) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Logros Desbloqueados
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Achievement Badges */}
          {(impactData?.modulesCompleted || 0) >= 1 && (
            <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-teal-50 to-blue-50 border-2 border-teal-200 rounded-xl">
              <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Primer Paso</div>
                <div className="text-sm text-slate-600">Completaste tu primer módulo</div>
              </div>
            </div>
          )}

          {(impactData?.totalXP || 0) >= 500 && (
            <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-900">En Racha</div>
                <div className="text-sm text-slate-600">500+ XP ganados</div>
              </div>
            </div>
          )}

          {(impactData?.timeSpentHours || 0) >= 5 && (
            <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl">
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Dedicado</div>
                <div className="text-sm text-slate-600">5+ horas de aprendizaje</div>
              </div>
            </div>
          )}

          {/* Locked Achievements */}
          {(impactData?.modulesCompleted || 0) < 3 && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl opacity-50">
              <div className="w-12 h-12 bg-slate-300 rounded-full flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-600">Experto</div>
                <div className="text-sm text-slate-500">Completa 3 módulos</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Community Impact */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Impacto Colectivo</h3>
            <p className="text-slate-700 mb-4">
              Tu empresa ha capacitado a <span className="font-bold text-purple-600">{impactData?.companyEmployeeCount || 0} empleados</span>,
              generando un impacto combinado de <span className="font-bold text-purple-600">{impactData?.companyTotalXP || 0} XP</span>.
            </p>
            <div className="text-sm text-slate-600">
              ¡Juntos están creando un cambio real en sus comunidades! 🌍
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

