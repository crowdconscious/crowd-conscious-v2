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
        story_content,
        learning_objectives,
        key_points,
        did_you_know,
        real_world_example,
        activity_type,
        activity_config,
        activity_required,
        tools_used,
        resources,
        next_steps
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
      
      // Story section - transform enriched story_content to frontend format
      story: lesson.story_content ? {
        introduction: lesson.story_content.opening || lesson.description || '',
        mainContent: lesson.story_content.dialogue || lesson.key_points || ['Contenido del curso disponible próximamente'],
        conclusion: lesson.story_content.resolution_preview || 'Completa esta lección para continuar tu aprendizaje',
        characterInsight: lesson.story_content.cliffhanger || 'Reflexiona sobre cómo aplicar estos conceptos en tu organización'
      } : {
        introduction: lesson.description || '',
        mainContent: lesson.key_points || ['Contenido del curso disponible próximamente'],
        conclusion: 'Completa esta lección para continuar tu aprendizaje',
        characterInsight: 'Reflexiona sobre cómo aplicar estos conceptos en tu organización'
      },
      
      // Learning section
      learning: {
        objectives: lesson.learning_objectives || [],
        keyPoints: lesson.key_points || [],
        didYouKnow: lesson.did_you_know || [
          'Este módulo ha sido desarrollado por expertos en la materia',
          'Incluye casos de estudio reales de empresas mexicanas'
        ],
        realWorldExample: lesson.real_world_example || 'Empresas líderes han implementado estos principios con resultados medibles'
      },
      
      // Activity section - transform activity_config to match frontend expectations
      activity: lesson.activity_config ? {
        ...lesson.activity_config,
        // Map 'steps' to 'instructions' for frontend compatibility
        instructions: lesson.activity_config.steps || lesson.activity_config.instructions || [],
        // Ensure reflectionPrompts exists
        reflectionPrompts: lesson.activity_config.reflection_prompts || lesson.activity_config.reflectionPrompts || []
      } : {
        title: 'Actividad Práctica',
        type: lesson.activity_type || 'reflection',
        description: 'Completa esta actividad para aplicar lo aprendido',
        required: lesson.activity_required || false,
        instructions: [],
        reflectionPrompts: [
          '¿Cómo puedes aplicar estos conceptos en tu organización?',
          '¿Qué obstáculos podrías enfrentar y cómo los superarías?',
          '¿Qué recursos necesitarías para implementar estos cambios?'
        ]
      },
      
      // Tools used in this lesson
      tools: lesson.tools_used || [],
      
      // Resources
      resources: lesson.resources || [],
      
      // Next steps
      nextSteps: lesson.next_steps || [
        'Revisa los recursos adicionales proporcionados',
        'Discute estos conceptos con tu equipo',
        'Identifica una acción concreta que puedas tomar esta semana'
      ],
      
      // Quiz - removed as column doesn't exist
      quiz: null
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

