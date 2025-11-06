import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Disable caching - always fetch fresh lesson data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ moduleId: string; lessonId: string }> }
) {
  try {
    const { moduleId, lessonId } = await context.params
    
    // Use admin client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log(`🔍 API: Fetching lesson: module=${moduleId}, lesson=${lessonId}`)

    // Fetch the lesson from database
    const { data: lesson, error } = await supabase
      .from('module_lessons')
      .select(`
        id,
        module_id,
        lesson_order,
        title,
        description,
        estimated_minutes,
        xp_reward,
        key_points,
        quiz_questions,
        resources
      `)
      .eq('module_id', moduleId)
      .eq('id', lessonId)
      .single()

    if (error || !lesson) {
      console.error('❌ API: Lesson not found:', error)
      console.error('❌ API: Searched for moduleId:', moduleId, 'lessonId:', lessonId)
      return NextResponse.json({ 
        error: 'Lesson not found',
        details: error?.message,
        searched: { moduleId, lessonId }
      }, { status: 404 })
    }

    // Get module info
    const { data: module } = await supabase
      .from('marketplace_modules')
      .select('id, title, slug, lesson_count')
      .eq('id', moduleId)
      .single()

    // Transform to match frontend format
    const transformedLesson = {
      id: lesson.id,
      lessonNumber: lesson.lesson_order,
      totalLessons: module?.lesson_count || 0,
      title: lesson.title,
      description: lesson.description,
      duration: `${lesson.estimated_minutes} min`,
      xpReward: lesson.xp_reward,
      
      // Story section (simplified for now)
      story: {
        introduction: lesson.description || '',
        mainContent: lesson.key_points || ['Contenido del curso disponible próximamente'],
        conclusion: 'Completa esta lección para continuar tu aprendizaje',
        characterInsight: 'Reflexiona sobre cómo aplicar estos conceptos en tu organización'
      },
      
      // Learning section
      learning: {
        keyPoints: lesson.key_points || [],
        didYouKnow: [
          'Este módulo ha sido desarrollado por expertos en la materia',
          'Incluye casos de estudio reales de empresas mexicanas'
        ],
        realWorldExample: 'Empresas líderes han implementado estos principios con resultados medibles'
      },
      
      // Activity section
      activity: {
        title: 'Actividad Práctica',
        description: 'Completa esta actividad para aplicar lo aprendido',
        reflectionPrompts: [
          '¿Cómo puedes aplicar estos conceptos en tu organización?',
          '¿Qué obstáculos podrías enfrentar y cómo los superarías?',
          '¿Qué recursos necesitarías para implementar estos cambios?'
        ]
      },
      
      // Resources
      resources: lesson.resources || [],
      
      // Next steps
      nextSteps: [
        'Revisa los recursos adicionales proporcionados',
        'Discute estos conceptos con tu equipo',
        'Identifica una acción concreta que puedas tomar esta semana'
      ],
      
      // Quiz if available
      quiz: lesson.quiz_questions || null
    }

    console.log('✅ API: Lesson fetched successfully:', lesson.title)
    return NextResponse.json({ lesson: transformedLesson, module })

  } catch (error) {
    console.error('❌ API: Critical error in lesson fetch:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch lesson',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

