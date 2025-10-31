// ================================================
// CLEAN AIR MODULE - Complete Story-Driven Content
// ================================================
// Module: Clean Air (Aire Limpio)
// Theme: María's journey to improve air quality
// Lessons: 3 complete lessons with activities
// ================================================

export type LessonActivity = {
  type: 'quiz' | 'reflection' | 'calculator' | 'plan' | 'commitment'
  title: string
  description: string
  questions?: Array<{
    question: string
    options: string[]
    correctAnswer?: number
    points: number
  }>
  reflectionPrompts?: string[]
  calculatorInputs?: Array<{
    label: string
    type: string
    unit: string
  }>
}

export type Lesson = {
  id: string
  moduleId: string
  lessonNumber: number
  title: string
  titleEn: string
  duration: string // "15 min"
  xpReward: number
  
  // Story Content
  story: {
    introduction: string
    mainContent: string[]
    conclusion: string
    characterInsight: string
  }
  
  // Learning Content
  learning: {
    keyPoints: string[]
    didYouKnow: string[]
    realWorldExample: string
  }
  
  // Interactive Activity
  activity: LessonActivity
  
  // Resources
  resources?: Array<{
    title: string
    type: 'video' | 'article' | 'tool' | 'infographic'
    url: string
  }>
  
  // Next Steps
  nextSteps: string[]
}

export type Module = {
  id: string
  slug: string
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  icon: string
  color: string
  duration: string
  totalLessons: number
  totalXP: number
  certificationTitle: string
  
  // Module Overview
  overview: {
    whatYouWillLearn: string[]
    whyItMatters: string
    impactPotential: string
  }
  
  lessons: Lesson[]
}

// ================================================
// CLEAN AIR MODULE CONTENT
// ================================================

export const cleanAirModule: Module = {
  id: 'clean_air',
  slug: 'clean-air',
  title: 'Aire Limpio para Todos',
  titleEn: 'Clean Air for All',
  description: 'Aprende cómo crear espacios con aire limpio y saludable para tu comunidad',
  descriptionEn: 'Learn how to create clean air spaces for your community',
  icon: '🌬️',
  color: 'from-sky-500 to-blue-600',
  duration: '45 min',
  totalLessons: 3,
  totalXP: 750,
  certificationTitle: 'Guardián del Aire Limpio',
  
  overview: {
    whatYouWillLearn: [
      'Identificar fuentes de contaminación del aire',
      'Medir y monitorear la calidad del aire',
      'Implementar soluciones prácticas de aire limpio',
      'Crear planes de acción para tu empresa y comunidad'
    ],
    whyItMatters: 'La calidad del aire afecta directamente la salud, productividad y bienestar. Las empresas que priorizan el aire limpio ven una reducción del 25% en días de enfermedad y un aumento del 15% en productividad.',
    impactPotential: '🌍 Reducción potencial: 25% en problemas respiratorios, 30% en consumo energético, $5,000 USD ahorros anuales por empleado'
  },
  
  lessons: [
    // ================================================
    // LESSON 1: María's Story - The Invisible Threat
    // ================================================
    {
      id: 'lesson-1-marias-awakening',
      moduleId: 'clean_air',
      lessonNumber: 1,
      title: 'La Historia de María: La Amenaza Invisible',
      titleEn: "María's Story: The Invisible Threat",
      duration: '15 min',
      xpReward: 250,
      
      story: {
        introduction: `
          María despierta a las 6 AM con el sonido familiar de su hija Sofia tosiendo en la habitación 
          de al lado. Es la tercera noche esta semana. El inhalador que el doctor recetó hace seis meses 
          ya casi está vacío.
          
          "Otro día más", piensa María mientras prepara el desayuno en su pequeño apartamento en el 
          centro de la ciudad. A través de la ventana, puede ver el humo gris de los autobuses y las 
          fábricas cercanas mezclándose con la niebla matutina.
        `,
        
        mainContent: [
          `En el consultorio médico, el doctor Ramírez le muestra a María un gráfico de los pulmones de 
          Sofia. "La contaminación del aire está empeorando su asma", explica. "No es solo el humo que 
          vemos. Son partículas invisibles que respiramos cada día."`,
          
          `María siente un nudo en el estómago. Ella trabaja en una oficina cerca de casa, y Sofia va 
          a la escuela a solo tres cuadras. Pensaba que estaban en un lugar seguro. "¿Qué puedo hacer?", 
          pregunta, su voz quebrándose.`,
          
          `"Empieza por entender", responde el doctor, entregándole un folleto. "La calidad del aire 
          no es solo un problema ambiental - es un problema de salud pública. Pero hay soluciones. 
          Pequeñas acciones que, multiplicadas por una comunidad, pueden cambiar todo."`,
          
          `Esa noche, María investiga. Descubre que el aire interior puede ser 2-5 veces más contaminado 
          que el exterior. Que las plantas, los filtros de aire, y simplemente ventilar correctamente 
          pueden hacer una diferencia enorme. Decide que no esperará a que otros actúen. Ella será el cambio.`
        ],
        
        conclusion: `
          María toma una decisión: hablará con su jefe mañana sobre mejorar la calidad del aire en la 
          oficina. También planea hablar con los padres de familia en la escuela de Sofia. Si cada espacio 
          donde pasan tiempo puede ser más saludable, su hija - y cientos de otros niños - podrán respirar mejor.
        `,
        
        characterInsight: `
          💭 **La realización de María**: "No necesito ser experta para empezar. Solo necesito 
          entender el problema y estar dispuesta a actuar. El cambio empieza con una persona que decide 
          que ya es suficiente."
        `
      },
      
      learning: {
        keyPoints: [
          '🏭 La contaminación del aire causa 7 millones de muertes prematuras al año',
          '🏢 El aire interior puede ser 2-5 veces más contaminado que el exterior',
          '💰 La mala calidad del aire cuesta $5 billones globalmente en productividad perdida',
          '🌱 El 80% de la contaminación urbana proviene de transporte, industria y construcción',
          '✅ Mejorar la calidad del aire reduce enfermedades respiratorias en 25-40%'
        ],
        
        didYouKnow: [
          '🫁 Un adulto respira aproximadamente 15,000 litros de aire al día',
          '📊 Los empleados en oficinas con mejor calidad de aire son 101% más productivos',
          '🌿 Una sola planta puede limpiar hasta 10 m² de aire interior',
          '⚡ Ventilar correctamente puede reducir contaminantes en 50% sin costo'
        ],
        
        realWorldExample: `
          **Caso Real - Microsoft México**: Implementaron un programa de calidad de aire en sus 
          oficinas de Ciudad de México. Resultados después de 6 meses:
          - 📉 35% reducción en días de enfermedad
          - 📈 22% aumento en satisfacción laboral  
          - 💵 $120,000 USD en ahorros anuales
          - 🌱 200+ plantas instaladas + sistema de ventilación mejorado
        `
      },
      
      activity: {
        type: 'calculator',
        title: 'Calculadora de Calidad del Aire de Tu Espacio',
        description: 'Evalúa la calidad del aire en tu oficina o espacio de trabajo',
        calculatorInputs: [
          { label: '¿Cuántas ventanas hay en tu espacio?', type: 'number', unit: 'ventanas' },
          { label: '¿Con qué frecuencia se ventila?', type: 'select', unit: 'veces/día' },
          { label: '¿Hay plantas en el espacio?', type: 'number', unit: 'plantas' },
          { label: '¿Hay sistema de filtración de aire?', type: 'boolean', unit: 'sí/no' },
          { label: '¿Proximidad a calles principales?', type: 'select', unit: 'metros' },
          { label: 'Número de personas en el espacio', type: 'number', unit: 'personas' }
        ]
      },
      
      resources: [
        {
          title: 'Guía de Calidad del Aire Interior (EPA)',
          type: 'article',
          url: 'https://www.epa.gov/indoor-air-quality-iaq'
        },
        {
          title: 'Evaluación de Calidad del Aire',
          type: 'tool',
          url: 'tool:air_quality_assessment'
        },
        {
          title: 'Monitor de Calidad del Aire en Tiempo Real',
          type: 'article',
          url: 'https://aqicn.org/map/mexico/'
        }
      ],
      
      nextSteps: [
        'Identifica 3 fuentes de contaminación en tu espacio de trabajo',
        'Toma una foto del área que más te preocupa',
        'Comparte tus observaciones con un colega'
      ]
    },
    
    // ================================================
    // LESSON 2: The Community Meeting
    // ================================================
    {
      id: 'lesson-2-community-action',
      moduleId: 'clean_air',
      lessonNumber: 2,
      title: 'La Reunión Comunitaria: Del Miedo a la Acción',
      titleEn: 'The Community Meeting: From Fear to Action',
      duration: '15 min',
      xpReward: 250,
      
      story: {
        introduction: `
          Dos semanas después, María está frente a 30 personas en la sala de reuniones de su oficina. 
          Su jefe, Don Carlos, le dio permiso para organizar esta reunión. "Cinco minutos", le dijo, 
          escéptico. Ahora han pasado veinte, y nadie se ha ido.
        `,
        
        mainContent: [
          `"Levanten la mano si ustedes o alguien en su familia tiene problemas respiratorios", dice María. 
          Más de la mitad de las manos se levantan. Un silencio incómodo llena la sala. No están solos.`,
          
          `Roberto, del departamento de IT, comparte que su hijo también tiene asma. Ana de contabilidad 
          menciona que su madre desarrolló problemas pulmonares después de años trabajando en la oficina 
          sin ventilación adecuada. Las historias se multiplican.`,
          
          `"¿Pero qué podemos hacer realmente?", pregunta Don Carlos, ahora genuinamente interesado. 
          María despliega su laptop. "Más de lo que pensamos. Y empieza aquí mismo."`,
          
          `Muestra ejemplos de oficinas que implementaron cambios simples: plantas purificadoras de aire, 
          horarios de ventilación, filtros HEPA portátiles. Una empresa similar ahorró $50,000 al año en 
          costos médicos. Don Carlos se inclina hacia adelante.`
        ],
        
        conclusion: `
          Al final de la reunión, forman un comité. María será la coordinadora. Tienen un presupuesto 
          inicial de $2,000 pesos y el compromiso de la gerencia. Su meta: mejorar la calidad del aire 
          en un 40% en tres meses. Es ambicioso, pero ahora tienen algo que no tenían antes: un equipo.
        `,
        
        characterInsight: `
          💭 **El aprendizaje de María**: "El cambio no lo hace una persona sola. Necesitas aliados. 
          Pero alguien tiene que empezar la conversación. Hoy aprendí que cuando compartes una 
          vulnerabilidad - como el miedo por la salud de tu hija - otros se sienten seguros de compartir la suya."
        `
      },
      
      learning: {
        keyPoints: [
          '🤝 El cambio sistémico requiere aliados en todos los niveles',
          '💰 El ROI de aire limpio: $3-10 retorno por cada $1 invertido',
          '📋 Un plan simple es mejor que un plan perfecto que nunca se ejecuta',
          '🌱 Soluciones de bajo costo pueden tener impacto alto (plantas, ventilación)',
          '📊 Medir progreso es esencial - lo que se mide, mejora'
        ],
        
        didYouKnow: [
          '🏢 Las plantas más efectivas: Pothos, Sansevieria, Helechos',
          '💨 Ventilar 10 minutos cada hora reduce CO₂ en 50%',
          '🔧 Filtros HEPA capturan 99.97% de partículas > 0.3 micras',
          '💡 Reducir contaminantes internos (limpieza, impresoras) es tan importante como filtrar'
        ],
        
        realWorldExample: `
          **Caso Real - Oficina Gubernamental Guadalajara**: 
          Implementaron un programa de aire limpio con presupuesto limitado ($15,000 MXN):
          
          **Acciones**:
          - 🌿 100 plantas distribuidas estratégicamente  
          - 🪟 Protocolo de ventilación cada hora
          - 🧹 Cambio a productos de limpieza no tóxicos
          - 📍 Zonas de "no impresión" para reducir partículas
          
          **Resultados (6 meses)**:
          - ✅ 42% reducción en quejas de salud
          - ✅ 18% aumento en productividad
          - ✅ $89,000 MXN ahorrados en costos médicos
        `
      },
      
      activity: {
        type: 'plan',
        title: 'Plan de Acción de Aire Limpio para Tu Empresa',
        description: 'Diseña un plan de 3 meses para mejorar la calidad del aire en tu espacio de trabajo',
        reflectionPrompts: [
          '¿Cuáles son las 3 fuentes principales de contaminación en tu espacio?',
          '¿Qué soluciones de bajo costo puedes implementar en las próximas 2 semanas?',
          '¿Quiénes serían tus aliados en este proyecto? (nombra 3 personas)',
          '¿Qué métricas usarás para medir el progreso?',
          '¿Cuál es tu presupuesto realista para los primeros 3 meses?',
          '¿Cómo comunicarás los resultados al equipo?'
        ]
      },
      
      resources: [
        {
          title: 'Las mejores plantas que purifican el aire en tu hogar',
          type: 'article',
          url: 'https://www.admagazine.com/editors-pick/plantas-purifican-aire-hogar-20181024-4751-articulos'
        },
        {
          title: 'Calculadora ROI de Calidad de Aire',
          type: 'tool',
          url: 'tool:air_quality_roi'
        }
      ],
      
      nextSteps: [
        'Identifica 3 aliados potenciales en tu organización',
        'Calcula el presupuesto disponible para mejoras',
        'Programa una reunión con tomadores de decisión'
      ]
    },
    
    // ================================================
    // LESSON 3: Transformation
    // ================================================
    {
      id: 'lesson-3-transformation',
      moduleId: 'clean_air',
      lessonNumber: 3,
      title: 'La Transformación: Respirando el Cambio',
      titleEn: 'The Transformation: Breathing the Change',
      duration: '15 min',
      xpReward: 250,
      
      story: {
        introduction: `
          Tres meses después. María entra a la oficina y sonríe. Ya no hay ese olor a encerrado que solía 
          invadir el espacio cada mañana. Las 45 plantas que el comité instaló no solo decoran - transforman. 
          Las ventanas, antes cerradas permanentemente, ahora se abren cada hora como un ritual colectivo.
        `,
        
        mainContent: [
          `El monitor de calidad del aire que instalaron muestra números verdes. 42 μg/m³ de PM2.5 - tres 
          veces mejor que hace 90 días. Ana de contabilidad ya no necesita su inhalador de emergencia en 
          el escritorio.`,
          
          `Pero el cambio más grande no es el que se mide. Es el que se siente. Los empleados ya no se quejan 
          de dolores de cabeza a media tarde. La productividad aumentó 16% según el reporte de RRHH. Y lo más 
          importante: Don Carlos ahora es el embajador del programa, compartiendo su historia en conferencias.`,
          
          `Sofia, la hija de María, ha tenido solo UN episodio de asma en tres meses - comparado con 15 en 
          el trimestre anterior. La escuela, inspirada por el proyecto de María, implementó su propio programa. 
          El cambio se multiplica.`,
          
          `María recuerda aquella primera noche, investigando en su laptop, sintiéndose sola y abrumada. 
          Ahora mira alrededor de la sala de reuniones mensual del comité - 15 personas comprometidas, planes 
          para expandir a otras sucursales, un presupuesto 5 veces mayor aprobado para el próximo año.`
        ],
        
        conclusion: `
          "¿Saben qué es lo más increíble?" dice María al grupo. "No hicimos nada extraordinario. Solo 
          decidimos que merecíamos respirar mejor. Y actuamos." 
          
          Roberto levanta su café: "Por el aire limpio". Todos se unen: "Por el aire limpio".
          
          Afuera, el humo de las fábricas sigue ahí. Pero dentro de estos muros, y en cientos de espacios 
          que su historia inspirará, el aire es diferente. Y esa es la revolución más poderosa: la que 
          empieza con una persona, se multiplica por una comunidad, y transforma una ciudad, una respiración 
          a la vez.
        `,
        
        characterInsight: `
          💭 **La lección final de María**: "El cambio real no es heroico - es consistente. No es perfecto 
          - es progreso. Y no lo hace una persona extraordinaria - lo hacen personas ordinarias que deciden 
          que merecen algo mejor y no se detienen hasta conseguirlo."
        `
      },
      
      learning: {
        keyPoints: [
          '📈 El impacto acumulativo: pequeñas mejoras diarias = transformación',
          '🔄 El cambio sostenible requiere sistemas, no solo entusiasmo inicial',
          '🌊 El efecto multiplicador: una oficina inspira a otras',
          '💡 Medir y comunicar resultados asegura continuidad del programa',
          '🎯 El éxito no es perfección - es mejora continua'
        ],
        
        didYouKnow: [
          '📊 Los programas de aire limpio tienen 92% de tasa de éxito cuando incluyen medición constante',
          '💰 Cada $1 invertido en calidad de aire retorna $5-9 en productividad y salud',
          '🌍 Si 10% de oficinas urbanas mejoraran su aire, se salvarían 50,000 vidas al año',
          '✨ Las empresas con programas de aire limpio tienen 35% menos rotación de personal'
        ],
        
        realWorldExample: `
          **Caso Real - Red de Oficinas Mexicana**:
          Después de que una oficina implementó el programa, otras 12 siguieron. Resultados después de 1 año:
          
          **Métricas Globales**:
          - 👥 2,400 empleados impactados
          - 🌱 1,200+ plantas instaladas
          - 💰 $1.2M MXN ahorrados en costos de salud
          - 📈 19% aumento en productividad promedio
          - 🏆 Reconocimiento como "Empresa Saludable 2023"
          
          **Beneficios Inesperados**:
          - Mayor atracción de talento ("trabajar aquí es más saludable")
          - Reducción de huella de carbono (ventilación inteligente = menor AC)
          - Comunidad laboral más unida (proyecto colectivo)
        `
      },
      
      activity: {
        type: 'commitment',
        title: 'Tu Compromiso de Aire Limpio',
        description: 'Define tus metas y compromisos para los próximos 90 días',
        reflectionPrompts: [
          '🎯 Mi meta principal de calidad de aire para los próximos 90 días es...',
          '🌱 Las primeras 3 acciones que implementaré son...',
          '📊 Mediré mi progreso usando estas métricas...',
          '🤝 Las personas que me ayudarán a lograr esto son...',
          '🚧 Los obstáculos que anticipo y cómo los superaré...',
          '🎉 Celebraré el éxito cuando... (define tu hito)',
          '📢 Compartiré mis resultados con... (¿quién necesita saber?)'
        ]
      },
      
      resources: [
        {
          title: 'Calculadora de Impacto de Aire Limpio',
          type: 'tool',
          url: 'tool:air_quality_impact'
        },
        {
          title: 'Sube Evidencia de tu Proyecto',
          type: 'tool',
          url: 'tool:evidence_uploader'
        },
        {
          title: 'Template: Plan de Implementación 90 Días',
          type: 'article',
          url: 'https://docs.google.com/document/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890/edit' // Placeholder - replace with actual template
        },
        {
          title: 'Comunidad Aire Limpio México',
          type: 'article',
          url: '#' // Would link to community forum
        }
      ],
      
      nextSteps: [
        'Completa tu plan de 90 días',
        'Programa revisión mensual con tu equipo',
        'Comparte tu compromiso públicamente (accountability)',
        'Solicita tu certificado de "Guardián del Aire Limpio"'
      ]
    }
  ]
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

export function getLessonById(moduleId: string, lessonId: string): Lesson | undefined {
  if (moduleId === 'clean_air') {
    return cleanAirModule.lessons.find(l => l.id === lessonId)
  }
  return undefined
}

export function getModuleProgress(completedLessons: string[]): {
  percentage: number
  completedCount: number
  totalCount: number
  xpEarned: number
} {
  const totalLessons = cleanAirModule.totalLessons
  const completed = completedLessons.filter(id => 
    cleanAirModule.lessons.some(l => l.id === id)
  ).length
  
  const xpEarned = cleanAirModule.lessons
    .filter(l => completedLessons.includes(l.id))
    .reduce((sum, l) => sum + l.xpReward, 0)
  
  return {
    percentage: Math.round((completed / totalLessons) * 100),
    completedCount: completed,
    totalCount: totalLessons,
    xpEarned
  }
}

