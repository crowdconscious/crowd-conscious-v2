'use client'

import { useState, useEffect } from 'react'
import { Droplets, TrendingDown, Trophy, Plus, Target, BarChart3 } from 'lucide-react'

interface WeeklyReading {
  week: number
  date: string
  usage: number // liters
  cost: number // MXN
  vs_baseline: number // percentage
}

interface ConservationGoal {
  targetReduction: number // percentage
  baselineUsage: number // liters per day
  startDate: string
  endDate: string
  waterPrice: number // MXN per m³
}

interface TrackerData {
  goal: ConservationGoal
  readings: WeeklyReading[]
  currentSavings: {
    liters: number
    money: number
    percentage: number
  }
  milestones: {
    name: string
    target: number
    achieved: boolean
    achievedDate?: string
  }[]
}

interface WaterConservationTrackerProps {
  onSave?: (data: TrackerData) => void
  className?: string
}

export default function WaterConservationTracker({
  onSave,
  className = ''
}: WaterConservationTrackerProps) {
  const [step, setStep] = useState<'goal' | 'tracking'>('goal')
  const [goal, setGoal] = useState<ConservationGoal>({
    targetReduction: 20,
    baselineUsage: 1000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    waterPrice: 15
  })
  const [readings, setReadings] = useState<WeeklyReading[]>([])
  const [currentReading, setCurrentReading] = useState({
    usage: '',
    date: new Date().toISOString().split('T')[0]
  })

  const milestones = [
    { name: '5% Reducción', target: 5 },
    { name: '10% Reducción', target: 10 },
    { name: '15% Reducción', target: 15 },
    { name: '20% Reducción', target: 20 },
    { name: '25% Reducción (¡Excelente!)', target: 25 }
  ]

  const calculateSavings = () => {
    if (readings.length === 0) {
      return { liters: 0, money: 0, percentage: 0 }
    }

    const avgUsage = readings.reduce((sum, r) => sum + r.usage, 0) / readings.length
    const savedLiters = goal.baselineUsage - avgUsage
    const percentage = (savedLiters / goal.baselineUsage) * 100
    const savedMoney = (savedLiters / 1000) * goal.waterPrice * readings.length * 7 // weekly * 7 days

    return {
      liters: savedLiters * readings.length * 7,
      money: savedMoney,
      percentage: Math.max(0, percentage)
    }
  }

  const addReading = () => {
    if (currentReading.usage && currentReading.date) {
      const usage = parseInt(currentReading.usage)
      const cost = (usage / 1000) * goal.waterPrice * 7 // weekly cost
      const vs_baseline = ((goal.baselineUsage - usage) / goal.baselineUsage) * 100

      const newReading: WeeklyReading = {
        week: readings.length + 1,
        date: currentReading.date,
        usage,
        cost,
        vs_baseline
      }

      const updatedReadings = [...readings, newReading]
      setReadings(updatedReadings)
      setCurrentReading({
        usage: '',
        date: new Date().toISOString().split('T')[0]
      })

      // Auto-save
      if (onSave) {
        const savings = calculateSavings()
        const milestoneStatus = milestones.map(m => ({
          ...m,
          achieved: savings.percentage >= m.target,
          achievedDate: savings.percentage >= m.target ? new Date().toISOString().split('T')[0] : undefined
        }))

        onSave({
          goal,
          readings: updatedReadings,
          currentSavings: savings,
          milestones: milestoneStatus
        })
      }
    }
  }

  const savings = calculateSavings()

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-MX').format(Math.round(num))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (step === 'goal') {
    return (
      <div className={`bg-gradient-to-br from-teal-50 to-green-50 border-2 border-teal-200 rounded-xl p-4 sm:p-6 ${className}`}>
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-bold text-teal-900">Tracker de Conservación</h3>
            <p className="text-xs sm:text-sm text-teal-700">Establece tu meta de ahorro de agua</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-teal-900 mb-2">
              📊 Consumo Base Diario (Litros)
            </label>
            <input
              type="number"
              value={goal.baselineUsage}
              onChange={(e) => setGoal({ ...goal, baselineUsage: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-lg border-2 border-teal-200 focus:border-teal-500 focus:outline-none text-sm sm:text-base"
              placeholder="1000"
            />
            <p className="text-xs text-teal-600 mt-1">Tu consumo actual diario (referencia)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-teal-900 mb-2">
              🎯 Meta de Reducción (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={goal.targetReduction}
                onChange={(e) => setGoal({ ...goal, targetReduction: parseInt(e.target.value) })}
                className="flex-1"
              />
              <div className="text-2xl font-bold text-teal-900 min-w-[70px] text-center">
                {goal.targetReduction}%
              </div>
            </div>
            <p className="text-xs text-teal-600 mt-1">
              Meta: {formatNumber(goal.baselineUsage * (1 - goal.targetReduction / 100))} L/día
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-teal-900 mb-2">
                📅 Fecha Inicio
              </label>
              <input
                type="date"
                value={goal.startDate}
                onChange={(e) => setGoal({ ...goal, startDate: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-teal-200 focus:border-teal-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-teal-900 mb-2">
                📅 Fecha Meta
              </label>
              <input
                type="date"
                value={goal.endDate}
                onChange={(e) => setGoal({ ...goal, endDate: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-teal-200 focus:border-teal-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-teal-900 mb-2">
              💰 Precio del Agua (MXN/m³)
            </label>
            <input
              type="number"
              step="0.1"
              value={goal.waterPrice}
              onChange={(e) => setGoal({ ...goal, waterPrice: parseFloat(e.target.value) || 15 })}
              className="w-full px-4 py-3 rounded-lg border-2 border-teal-200 focus:border-teal-500 focus:outline-none text-sm sm:text-base"
              placeholder="15"
            />
          </div>

          <div className="bg-teal-100 border-2 border-teal-300 rounded-lg p-4">
            <h4 className="font-bold text-teal-900 mb-2 text-sm sm:text-base">🎯 Resumen de tu Meta:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Consumo actual:</span>
                <span className="font-bold">{formatNumber(goal.baselineUsage)} L/día</span>
              </div>
              <div className="flex justify-between">
                <span>Meta de consumo:</span>
                <span className="font-bold text-green-700">
                  {formatNumber(goal.baselineUsage * (1 - goal.targetReduction / 100))} L/día
                </span>
              </div>
              <div className="flex justify-between">
                <span>Reducción objetivo:</span>
                <span className="font-bold text-teal-700">{goal.targetReduction}%</span>
              </div>
              <div className="flex justify-between">
                <span>Ahorro potencial/mes:</span>
                <span className="font-bold text-green-700">
                  {formatCurrency(((goal.baselineUsage * goal.targetReduction / 100) / 1000) * goal.waterPrice * 22)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep('tracking')}
            disabled={!goal.baselineUsage || !goal.startDate}
            className="w-full bg-gradient-to-r from-teal-600 to-green-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
          >
            Comenzar a Rastrear
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-teal-50 to-green-50 border-2 border-teal-200 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-teal-900">Tracker de Conservación</h3>
          <p className="text-xs sm:text-sm text-teal-700">Meta: -{goal.targetReduction}% consumo</p>
        </div>
      </div>

      {/* Current Progress */}
      {readings.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-teal-200 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-900">
                {savings.percentage.toFixed(1)}%
              </div>
              <div className="text-xs sm:text-sm text-green-700">Reducción</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border-2 border-blue-200 text-center">
              <div className="text-lg sm:text-xl font-bold text-blue-900">
                {formatNumber(savings.liters)}
              </div>
              <div className="text-xs sm:text-sm text-blue-700">L Ahorrados</div>
            </div>

            <div className="bg-green-50 rounded-lg p-3 sm:p-4 border-2 border-green-200 text-center">
              <div className="text-lg sm:text-xl font-bold text-green-900">
                {formatCurrency(savings.money)}
              </div>
              <div className="text-xs sm:text-sm text-green-700">MXN Ahorrados</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4 sm:mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-teal-900">Progreso hacia tu meta:</span>
              <span className="text-sm font-bold text-teal-900">
                {Math.min(100, (savings.percentage / goal.targetReduction) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-teal-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-green-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, (savings.percentage / goal.targetReduction) * 100)}%` }}
              />
            </div>
          </div>

          {/* Milestones */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <h4 className="font-bold text-yellow-900 text-sm sm:text-base">🏆 Logros:</h4>
            </div>
            <div className="space-y-2">
              {milestones.map((milestone) => {
                const achieved = savings.percentage >= milestone.target
                return (
                  <div
                    key={milestone.name}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      achieved ? 'bg-green-100 border border-green-300' : 'bg-white border border-yellow-200'
                    }`}
                  >
                    <div className="text-2xl">
                      {achieved ? '✅' : '⭕'}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-bold ${achieved ? 'text-green-900' : 'text-slate-600'}`}>
                        {milestone.name}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Add Reading Form */}
      <div className="bg-teal-100 rounded-xl p-4 border-2 border-teal-300 mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-teal-700" />
          <h4 className="font-bold text-teal-900 text-sm sm:text-base">
            Registrar Semana {readings.length + 1}
          </h4>
        </div>

        <div>
          <label className="block text-sm font-medium text-teal-900 mb-2">
            Consumo Promedio Diario (Litros)
          </label>
          <input
            type="number"
            value={currentReading.usage}
            onChange={(e) => setCurrentReading(prev => ({ ...prev, usage: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-teal-300 focus:border-teal-500 focus:outline-none text-sm sm:text-base"
            placeholder={goal.baselineUsage.toString()}
          />
          <p className="text-xs text-teal-700 mt-1">Baseline: {formatNumber(goal.baselineUsage)} L/día</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-teal-900 mb-2">Fecha</label>
          <input
            type="date"
            value={currentReading.date}
            onChange={(e) => setCurrentReading(prev => ({ ...prev, date: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-teal-300 focus:border-teal-500 focus:outline-none text-sm"
          />
        </div>

        <button
          onClick={addReading}
          disabled={!currentReading.usage}
          className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:bg-teal-700 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          Agregar Lectura
        </button>
      </div>

      {/* Readings Table */}
      {readings.length > 0 && (
        <div className="bg-white rounded-lg border-2 border-teal-200 overflow-hidden">
          <div className="bg-teal-100 px-4 py-2 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-700" />
            <h4 className="font-bold text-teal-900 text-sm">Historial de Lecturas</h4>
          </div>
          <div className="divide-y divide-teal-100">
            {readings.slice().reverse().map((reading) => (
              <div key={reading.week} className="p-3 flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm">Semana {reading.week}</div>
                  <div className="text-xs text-slate-600">{reading.date}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">{formatNumber(reading.usage)} L/día</div>
                  <div className={`text-xs font-bold ${
                    reading.vs_baseline > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {reading.vs_baseline > 0 ? '↓' : '↑'} {Math.abs(reading.vs_baseline).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {readings.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <TrendingDown className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Agrega tu primera lectura para comenzar a rastrear tu progreso</p>
        </div>
      )}
    </div>
  )
}

