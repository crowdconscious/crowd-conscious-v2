'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, Users, Calendar, Heart } from 'lucide-react'

interface AirQualityROIProps {
  onCalculate?: (result: ROIResult) => void
  className?: string
}

interface ROIResult {
  totalInvestment: number
  annualSavings: number
  threeYearSavings: number
  paybackMonths: number
  roi: number
  breakdown: {
    sickDaysReduction: number
    productivityGains: number
    energySavings: number
    medicalCostReduction: number
  }
  employeeImpact: {
    sickDaysAvoided: number
    healthierEmployees: number
    productivityIncrease: number
  }
}

export default function AirQualityROI({
  onCalculate,
  className = ''
}: AirQualityROIProps) {
  const [inputs, setInputs] = useState({
    employees: '',
    currentSickDays: '',
    averageSalaryPerDay: '',
    plantCost: '',
    filterCost: '',
    ventilationUpgrade: ''
  })
  const [result, setResult] = useState<ROIResult | null>(null)
  const [calculated, setCalculated] = useState(false)

  const calculate = () => {
    const employees = parseInt(inputs.employees) || 0
    const currentSickDays = parseFloat(inputs.currentSickDays) || 0
    const salaryPerDay = parseFloat(inputs.averageSalaryPerDay) || 0
    const plantCost = parseFloat(inputs.plantCost) || 0
    const filterCost = parseFloat(inputs.filterCost) || 0
    const ventilationUpgrade = parseFloat(inputs.ventilationUpgrade) || 0

    // Total investment
    const totalInvestment = plantCost + filterCost + ventilationUpgrade

    // Sick days reduction (research shows 25-35% reduction)
    const sickDaysReductionPercent = 30 // Conservative 30%
    const sickDaysAvoided = (currentSickDays * employees * sickDaysReductionPercent) / 100
    const sickDaysReduction = sickDaysAvoided * salaryPerDay

    // Productivity gains (research shows 101% increase in cognitive function)
    // We'll use conservative 8% productivity gain
    const productivityPercent = 8
    const annualWorkDays = 250
    const productivityGains = (employees * annualWorkDays * salaryPerDay * productivityPercent) / 100

    // Energy savings (better ventilation management = 15% less AC usage)
    const energySavingsPercent = 15
    const estimatedAnnualEnergyCost = employees * 500 // $500 per employee/year rough estimate
    const energySavings = (estimatedAnnualEnergyCost * energySavingsPercent) / 100

    // Medical cost reduction (company health insurance)
    const avgMedicalCostPerEmployee = 800 // Annual per employee
    const medicalReductionPercent = 20
    const medicalCostReduction = (employees * avgMedicalCostPerEmployee * medicalReductionPercent) / 100

    // Total annual savings
    const annualSavings = sickDaysReduction + productivityGains + energySavings + medicalCostReduction
    const threeYearSavings = annualSavings * 3

    // ROI calculations
    const paybackMonths = totalInvestment > 0 ? (totalInvestment / annualSavings) * 12 : 0
    const roi = totalInvestment > 0 ? ((threeYearSavings - totalInvestment) / totalInvestment) * 100 : 0

    // Employee impact
    const healthierEmployees = Math.round(employees * 0.85) // 85% of employees benefit
    const productivityIncrease = productivityPercent

    const calculatedResult: ROIResult = {
      totalInvestment,
      annualSavings,
      threeYearSavings,
      paybackMonths,
      roi,
      breakdown: {
        sickDaysReduction,
        productivityGains,
        energySavings,
        medicalCostReduction
      },
      employeeImpact: {
        sickDaysAvoided: Math.round(sickDaysAvoided),
        healthierEmployees,
        productivityIncrease
      }
    }

    setResult(calculatedResult)
    setCalculated(true)

    if (onCalculate) {
      onCalculate(calculatedResult)
    }
  }

  const reset = () => {
    setInputs({
      employees: '',
      currentSickDays: '',
      averageSalaryPerDay: '',
      plantCost: '',
      filterCost: '',
      ventilationUpgrade: ''
    })
    setResult(null)
    setCalculated(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className={`bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-emerald-900">Calculadora ROI de Calidad de Aire</h3>
          <p className="text-xs sm:text-sm text-emerald-700">Calcula el retorno de inversión en aire limpio</p>
        </div>
      </div>

      {!calculated ? (
        <div className="space-y-3 sm:space-y-4">
          {/* Employees */}
          <div>
            <label className="block text-sm font-medium text-emerald-900 mb-2">
              👥 Número de Empleados
            </label>
            <input
              type="number"
              value={inputs.employees}
              onChange={(e) => setInputs({ ...inputs, employees: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-emerald-200 focus:border-emerald-500 focus:outline-none text-sm sm:text-base"
              placeholder="Ej: 50"
            />
          </div>

          {/* Current Sick Days */}
          <div>
            <label className="block text-sm font-medium text-emerald-900 mb-2">
              🤒 Días de enfermedad promedio por empleado/año
            </label>
            <input
              type="number"
              step="0.5"
              value={inputs.currentSickDays}
              onChange={(e) => setInputs({ ...inputs, currentSickDays: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-emerald-200 focus:border-emerald-500 focus:outline-none text-sm sm:text-base"
              placeholder="Ej: 5"
            />
            <p className="text-xs text-emerald-600 mt-1">Promedio en México: 4-7 días/año</p>
          </div>

          {/* Average Salary Per Day */}
          <div>
            <label className="block text-sm font-medium text-emerald-900 mb-2">
              💰 Salario promedio por día (MXN)
            </label>
            <div className="relative">
              <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">
                $
              </span>
              <input
                type="number"
                value={inputs.averageSalaryPerDay}
                onChange={(e) => setInputs({ ...inputs, averageSalaryPerDay: e.target.value })}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 rounded-lg border-2 border-emerald-200 focus:border-emerald-500 focus:outline-none text-sm sm:text-base"
                placeholder="500"
              />
            </div>
            <p className="text-xs text-emerald-600 mt-1">Salario mensual ÷ 22 días laborales</p>
          </div>

          <div className="border-t-2 border-emerald-200 pt-4 mt-4">
            <h4 className="font-bold text-emerald-900 mb-3 text-sm sm:text-base">💵 Inversión en Mejoras:</h4>
          </div>

          {/* Plant Cost */}
          <div>
            <label className="block text-sm font-medium text-emerald-900 mb-2">
              🌱 Costo de plantas y macetas
            </label>
            <div className="relative">
              <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">
                $
              </span>
              <input
                type="number"
                value={inputs.plantCost}
                onChange={(e) => setInputs({ ...inputs, plantCost: e.target.value })}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 rounded-lg border-2 border-emerald-200 focus:border-emerald-500 focus:outline-none text-sm sm:text-base"
                placeholder="5,000"
              />
            </div>
            <p className="text-xs text-emerald-600 mt-1">~$100-150 por planta con maceta</p>
          </div>

          {/* Filter Cost */}
          <div>
            <label className="block text-sm font-medium text-emerald-900 mb-2">
              🔧 Costo de filtros HEPA portátiles
            </label>
            <div className="relative">
              <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">
                $
              </span>
              <input
                type="number"
                value={inputs.filterCost}
                onChange={(e) => setInputs({ ...inputs, filterCost: e.target.value })}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 rounded-lg border-2 border-emerald-200 focus:border-emerald-500 focus:outline-none text-sm sm:text-base"
                placeholder="8,000"
              />
            </div>
            <p className="text-xs text-emerald-600 mt-1">~$2,000-4,000 por filtro portátil</p>
          </div>

          {/* Ventilation Upgrade */}
          <div>
            <label className="block text-sm font-medium text-emerald-900 mb-2">
              💨 Mejoras de ventilación (opcional)
            </label>
            <div className="relative">
              <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">
                $
              </span>
              <input
                type="number"
                value={inputs.ventilationUpgrade}
                onChange={(e) => setInputs({ ...inputs, ventilationUpgrade: e.target.value })}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 rounded-lg border-2 border-emerald-200 focus:border-emerald-500 focus:outline-none text-sm sm:text-base"
                placeholder="0"
              />
            </div>
            <p className="text-xs text-emerald-600 mt-1">Si aplica (ventiladores, ductos, etc.)</p>
          </div>

          <button
            onClick={calculate}
            disabled={!inputs.employees || !inputs.currentSickDays || !inputs.averageSalaryPerDay}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
          >
            Calcular ROI
          </button>
        </div>
      ) : result && (
        <div className="space-y-4">
          {/* ROI Hero */}
          <div className="bg-white rounded-xl p-4 sm:p-6 text-center border-2 border-emerald-300">
            <div className="text-4xl sm:text-5xl font-bold text-emerald-600 mb-2">
              {result.roi.toFixed(0)}%
            </div>
            <div className="text-base sm:text-lg text-emerald-900 font-medium mb-1">
              Retorno de Inversión (3 años)
            </div>
            <div className="text-xs sm:text-sm text-emerald-700">
              Recuperas tu inversión en <strong>{result.paybackMonths.toFixed(1)} meses</strong>
            </div>
          </div>

          {/* Investment vs Savings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 text-center">
              <div className="text-xs sm:text-sm text-orange-700 mb-1">Inversión Total</div>
              <div className="text-xl sm:text-2xl font-bold text-orange-600">
                {formatCurrency(result.totalInvestment)}
              </div>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
              <div className="text-xs sm:text-sm text-green-700 mb-1">Ahorro Anual</div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {formatCurrency(result.annualSavings)}
              </div>
            </div>
          </div>

          {/* Savings Breakdown */}
          <div className="bg-white rounded-xl p-4 sm:p-6">
            <h4 className="font-bold text-emerald-900 mb-3 sm:mb-4 text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              Desglose de Ahorros Anuales
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-slate-700">🤒 Reducción días de enfermedad</span>
                <span className="font-bold text-emerald-600 text-sm sm:text-base">
                  {formatCurrency(result.breakdown.sickDaysReduction)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-slate-700">📈 Aumento productividad</span>
                <span className="font-bold text-emerald-600 text-sm sm:text-base">
                  {formatCurrency(result.breakdown.productivityGains)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-slate-700">⚡ Ahorro energético</span>
                <span className="font-bold text-emerald-600 text-sm sm:text-base">
                  {formatCurrency(result.breakdown.energySavings)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-slate-700">💊 Reducción costos médicos</span>
                <span className="font-bold text-emerald-600 text-sm sm:text-base">
                  {formatCurrency(result.breakdown.medicalCostReduction)}
                </span>
              </div>
              <div className="border-t-2 border-emerald-200 pt-3 flex justify-between items-center">
                <span className="font-bold text-emerald-900 text-sm sm:text-base">Total Anual</span>
                <span className="font-bold text-emerald-600 text-lg sm:text-xl">
                  {formatCurrency(result.annualSavings)}
                </span>
              </div>
            </div>
          </div>

          {/* Employee Impact */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 sm:p-6">
            <h4 className="font-bold text-purple-900 mb-3 text-sm sm:text-base flex items-center gap-2">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              Impacto en Empleados
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                  {result.employeeImpact.sickDaysAvoided}
                </div>
                <div className="text-xs sm:text-sm text-purple-700">Días de enfermedad evitados/año</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                  {result.employeeImpact.healthierEmployees}
                </div>
                <div className="text-xs sm:text-sm text-purple-700">Empleados más saludables</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                  +{result.employeeImpact.productivityIncrease}%
                </div>
                <div className="text-xs sm:text-sm text-purple-700">Aumento productividad</div>
              </div>
            </div>
          </div>

          {/* 3-Year Projection */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-xl p-4 sm:p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base font-medium">Proyección a 3 Años</span>
            </div>
            <div className="text-3xl sm:text-4xl font-bold mb-1">
              {formatCurrency(result.threeYearSavings)}
            </div>
            <div className="text-xs sm:text-sm text-emerald-100">
              en ahorros totales
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full bg-emerald-100 text-emerald-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-emerald-200 transition-colors min-h-[44px]"
          >
            Calcular de Nuevo
          </button>
        </div>
      )}
    </div>
  )
}

