/**
 * Quality Control Validation for Module Responses
 * 
 * Ensures users provide substantive answers before earning certificates
 * Prevents empty/minimal responses that undermine platform credibility
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  score: number // 0-100
  minimumMet: boolean
}

export interface ResponseData {
  type: 'text' | 'quiz' | 'activity' | 'reflection' | 'evidence'
  content: any
  required: boolean
}

/**
 * Minimum quality standards
 */
const QUALITY_STANDARDS = {
  // Text responses
  MIN_WORDS_SHORT: 10, // Short answer
  MIN_WORDS_MEDIUM: 25, // Reflection
  MIN_WORDS_LONG: 50, // Essay/analysis
  MIN_WORDS_ACTION_PLAN: 15, // Action items
  
  // Quiz
  MIN_QUIZ_SCORE: 60, // Minimum 60% to pass
  
  // Evidence
  REQUIRE_EVIDENCE_FOR_ACTIVITIES: true,
  MIN_EVIDENCE_FILES: 1,
  
  // Activity
  MIN_ACTIVITY_FIELDS_COMPLETED: 0.7, // 70% of fields
  
  // Overall
  MIN_COMPLETION_SCORE: 70 // Need 70/100 to pass lesson
}

/**
 * Validate Text Response
 */
export function validateTextResponse(
  text: string | undefined | null,
  minimumWords: number,
  label: string = 'respuesta'
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let score = 0

  if (!text || text.trim().length === 0) {
    errors.push(`${label} no puede estar vacía`)
    return {
      isValid: false,
      errors,
      warnings,
      score: 0,
      minimumMet: false
    }
  }

  const trimmed = text.trim()
  const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length

  if (wordCount < minimumWords) {
    errors.push(
      `${label} debe tener al menos ${minimumWords} palabras (actualmente: ${wordCount})`
    )
    score = Math.round((wordCount / minimumWords) * 100)
    return {
      isValid: false,
      errors,
      warnings,
      score,
      minimumMet: false
    }
  }

  // Check for quality indicators
  if (wordCount < minimumWords * 1.5) {
    warnings.push(`Considera ampliar tu ${label} para una mejor reflexión`)
  }

  // Check if response seems like placeholder text
  const placeholderPatterns = [
    /^(test|prueba|n\/a|na|x|xx|xxx|asdf|qwerty)/i,
    /^(\s*\.+\s*|\s*-+\s*)$/,
    /^(1|2|3|4|5|a|b|c|d|e)$/i
  ]

  for (const pattern of placeholderPatterns) {
    if (pattern.test(trimmed)) {
      errors.push(`${label} parece ser texto de prueba. Proporciona una respuesta real.`)
      return {
        isValid: false,
        errors,
        warnings,
        score: 20, // Low score for placeholder
        minimumMet: false
      }
    }
  }

  // All good!
  score = 100
  if (wordCount > minimumWords * 2) {
    score = 100 // Excellent
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    score,
    minimumMet: true
  }
}

/**
 * Validate Quiz Response
 */
export function validateQuizResponse(
  answers: any,
  questions: any[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let score = 0

  if (!answers || Object.keys(answers).length === 0) {
    errors.push('Debes responder el cuestionario antes de continuar')
    return {
      isValid: false,
      errors,
      warnings,
      score: 0,
      minimumMet: false
    }
  }

  // Count answered questions
  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length

  if (answeredCount < totalQuestions) {
    errors.push(
      `Debes responder todas las preguntas (${answeredCount}/${totalQuestions} respondidas)`
    )
    score = Math.round((answeredCount / totalQuestions) * 100)
    return {
      isValid: false,
      errors,
      warnings,
      score,
      minimumMet: false
    }
  }

  // Calculate quiz score if correct answers are provided
  if (questions[0]?.correctAnswer) {
    let correct = 0
    for (const question of questions) {
      const userAnswer = answers[question.id]
      if (userAnswer === question.correctAnswer) {
        correct++
      }
    }
    score = Math.round((correct / totalQuestions) * 100)

    if (score < QUALITY_STANDARDS.MIN_QUIZ_SCORE) {
      errors.push(
        `Puntuación insuficiente: ${score}% (mínimo: ${QUALITY_STANDARDS.MIN_QUIZ_SCORE}%)`
      )
      warnings.push('Revisa el contenido de la lección e intenta nuevamente')
      return {
        isValid: false,
        errors,
        warnings,
        score,
        minimumMet: false
      }
    }
  } else {
    // No correct answers defined, just check completion
    score = 100
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    score,
    minimumMet: true
  }
}

/**
 * Validate Activity Response (tool usage, exercises)
 */
export function validateActivityResponse(
  activityData: any,
  activityType: string
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let score = 0

  if (!activityData || Object.keys(activityData).length === 0) {
    errors.push('Debes completar la actividad antes de continuar')
    return {
      isValid: false,
      errors,
      warnings,
      score: 0,
      minimumMet: false
    }
  }

  // Count completed fields
  const allKeys = Object.keys(activityData)
  const completedKeys = allKeys.filter(key => {
    const value = activityData[key]
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0
    if (typeof value === 'string') return value.trim().length > 0
    if (typeof value === 'number') return value !== 0
    return value !== null && value !== undefined
  })

  const completionRate = completedKeys.length / allKeys.length
  score = Math.round(completionRate * 100)

  if (completionRate < QUALITY_STANDARDS.MIN_ACTIVITY_FIELDS_COMPLETED) {
    errors.push(
      `Completa al menos el ${Math.round(QUALITY_STANDARDS.MIN_ACTIVITY_FIELDS_COMPLETED * 100)}% de la actividad ` +
      `(actualmente: ${Math.round(completionRate * 100)}%)`
    )
    return {
      isValid: false,
      errors,
      warnings,
      score,
      minimumMet: false
    }
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    score,
    minimumMet: true
  }
}

/**
 * Validate Evidence Upload
 */
export function validateEvidence(
  evidence: string[] | undefined | null,
  activityType: string
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let score = 0

  // Only certain activity types require evidence
  const requiresEvidence = [
    'photo_challenge',
    'audit',
    'measurement',
    'implementation',
    'documentation'
  ].includes(activityType)

  if (!requiresEvidence) {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      score: 100,
      minimumMet: true
    }
  }

  if (!evidence || evidence.length === 0) {
    errors.push('Esta actividad requiere evidencia fotográfica o documentación')
    return {
      isValid: false,
      errors,
      warnings,
      score: 0,
      minimumMet: false
    }
  }

  if (evidence.length < QUALITY_STANDARDS.MIN_EVIDENCE_FILES) {
    errors.push(
      `Sube al menos ${QUALITY_STANDARDS.MIN_EVIDENCE_FILES} archivo(s) de evidencia`
    )
    score = Math.round((evidence.length / QUALITY_STANDARDS.MIN_EVIDENCE_FILES) * 100)
    return {
      isValid: false,
      errors,
      warnings,
      score,
      minimumMet: false
    }
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    score: 100,
    minimumMet: true
  }
}

/**
 * Validate Complete Lesson Response
 * 
 * Checks all response components for quality
 */
export function validateLessonResponse(lessonData: {
  responses?: any
  activityData?: any
  activityType?: string
  evidence?: string[]
  reflection?: string
  actionItems?: string[]
  quizAnswers?: any
  quizQuestions?: any[]
}): ValidationResult {
  const allErrors: string[] = []
  const allWarnings: string[] = []
  let totalScore = 0
  let componentCount = 0

  // 1. Validate reflection (if exists)
  if (lessonData.responses?.reflection || lessonData.reflection) {
    const reflectionText = lessonData.responses?.reflection || lessonData.reflection
    const result = validateTextResponse(
      reflectionText,
      QUALITY_STANDARDS.MIN_WORDS_MEDIUM,
      'Reflexión'
    )
    allErrors.push(...result.errors)
    allWarnings.push(...result.warnings)
    totalScore += result.score
    componentCount++
  }

  // 2. Validate action items (if exists)
  if (lessonData.actionItems || lessonData.responses?.actionItems) {
    const items = lessonData.actionItems || lessonData.responses?.actionItems
    if (Array.isArray(items) && items.length > 0) {
      const combined = items.join(' ')
      const result = validateTextResponse(
        combined,
        QUALITY_STANDARDS.MIN_WORDS_ACTION_PLAN,
        'Plan de acción'
      )
      allErrors.push(...result.errors)
      allWarnings.push(...result.warnings)
      totalScore += result.score
      componentCount++
    }
  }

  // 3. Validate quiz (if exists)
  if (lessonData.quizAnswers && lessonData.quizQuestions) {
    const result = validateQuizResponse(lessonData.quizAnswers, lessonData.quizQuestions)
    allErrors.push(...result.errors)
    allWarnings.push(...result.warnings)
    totalScore += result.score
    componentCount++
  }

  // 4. Validate activity (if exists)
  if (lessonData.activityData) {
    const result = validateActivityResponse(
      lessonData.activityData,
      lessonData.activityType || 'general'
    )
    allErrors.push(...result.errors)
    allWarnings.push(...result.warnings)
    totalScore += result.score
    componentCount++
  }

  // 5. Validate evidence (if activity type requires it)
  if (lessonData.activityType) {
    const result = validateEvidence(lessonData.evidence, lessonData.activityType)
    allErrors.push(...result.errors)
    allWarnings.push(...result.warnings)
    totalScore += result.score
    componentCount++
  }

  // Calculate overall score
  const averageScore = componentCount > 0 ? Math.round(totalScore / componentCount) : 0

  // If no components were validated, it means nothing was submitted
  if (componentCount === 0) {
    return {
      isValid: false,
      errors: ['Debes completar al menos una actividad o reflexión para continuar'],
      warnings: [],
      score: 0,
      minimumMet: false
    }
  }

  // Check if minimum score met
  const minimumMet = averageScore >= QUALITY_STANDARDS.MIN_COMPLETION_SCORE

  if (!minimumMet) {
    allErrors.push(
      `Puntuación de calidad insuficiente: ${averageScore}/100 ` +
      `(mínimo: ${QUALITY_STANDARDS.MIN_COMPLETION_SCORE})`
    )
  }

  return {
    isValid: allErrors.length === 0 && minimumMet,
    errors: allErrors,
    warnings: allWarnings,
    score: averageScore,
    minimumMet
  }
}

/**
 * Get user-friendly error message
 */
export function getQualityControlMessage(validation: ValidationResult): string {
  if (validation.isValid) {
    return '✅ Respuesta de calidad aceptable'
  }

  if (validation.errors.length === 0) {
    return 'Por favor completa todos los campos requeridos'
  }

  return validation.errors[0] // Return first error as primary message
}

/**
 * Get quality score badge color
 */
export function getScoreBadgeColor(score: number): string {
  if (score >= 90) return 'bg-green-500 text-white'
  if (score >= 70) return 'bg-yellow-500 text-white'
  if (score >= 50) return 'bg-orange-500 text-white'
  return 'bg-red-500 text-white'
}

