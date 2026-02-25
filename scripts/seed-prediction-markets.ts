/**
 * Seed prediction markets with sample data
 * Run: npm run seed:predictions
 * Or: npx tsx scripts/seed-prediction-markets.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local'), override: true })

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const supabaseKeys = Object.keys(process.env).filter((k) => k.includes('SUPABASE'))
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local')
  console.error('   Add it from Supabase Dashboard → Settings → API → service_role key')
  console.error('   Current SUPABASE_* vars:', supabaseKeys.join(', ') || '(none)')
  process.exit(1)
}

import { createAdminClient } from '../lib/supabase-admin'
import { subDays, format } from 'date-fns'

const CREATED_BY = '2428fa3e-3617-4c4f-b573-29253cb9b5f5'

const MARKETS = [
  {
    title: '¿Avanzará México a octavos de final en el Mundial FIFA 2026?',
    description:
      'México es sede del Mundial 2026. La selección busca romper la maldición del quinto partido.',
    category: 'world' as const,
    subcategory: 'sports',
    status: 'active' as const,
    resolution_date: '2026-07-20T00:00:00Z',
    resolution_criteria:
      'Resultado oficial FIFA. México debe ganar su partido de octavos.',
    verification_sources: ['FIFA.com resultados oficiales', 'TUDN/ESPN cobertura'],
    current_probability: 55.0,
    fee_percentage: 2.5,
    conscious_fund_percentage: 7.5,
    tags: ['deportes', 'fifa', 'mundial', 'mexico'],
  },
  {
    title: '¿Bajará Banxico la tasa de referencia por debajo del 8% antes de diciembre 2026?',
    description:
      'Banxico ha mantenido política restrictiva. Analistas debaten el ciclo de reducción.',
    category: 'world' as const,
    subcategory: 'economics',
    status: 'active' as const,
    resolution_date: '2026-12-31T23:59:59Z',
    resolution_criteria: 'Comunicado oficial Banxico con tasa objetivo < 8.00%',
    verification_sources: ['Banxico comunicados', 'Bloomberg', 'El Financiero'],
    current_probability: 42.0,
    fee_percentage: 2.5,
    conscious_fund_percentage: 7.5,
    tags: ['economia', 'banxico', 'tasas'],
  },
  {
    title: '¿Se cotizará el peso por debajo de 19 MXN/USD en algún momento de 2026?',
    description: 'El tipo de cambio peso-dólar es de los indicadores más seguidos en México.',
    category: 'world' as const,
    subcategory: 'economics',
    status: 'active' as const,
    resolution_date: '2026-12-31T23:59:59Z',
    resolution_criteria:
      'Tipo de cambio interbancario cierra < 19.00 cualquier día hábil 2026',
    verification_sources: ['Banxico tipo de cambio', 'Bloomberg', 'Reuters'],
    current_probability: 25.0,
    fee_percentage: 2.5,
    conscious_fund_percentage: 7.5,
    tags: ['economia', 'tipo-cambio', 'peso', 'dolar'],
  },
  {
    title: '¿Completará CDMX el 80% del Cablebús Línea 3 para diciembre 2026?',
    description:
      'Línea 3 conectará Álvaro Obregón con Magdalena Contreras, beneficiando 75,000+ personas.',
    category: 'government' as const,
    subcategory: 'infrastructure',
    status: 'active' as const,
    resolution_date: '2026-12-31T23:59:59Z',
    resolution_criteria: 'Reporte oficial Gobierno CDMX indicando 80%+ avance físico',
    verification_sources: ['Gobierno CDMX reportes', 'IMCO', 'Reforma'],
    current_probability: 32.0,
    fee_percentage: 2.5,
    conscious_fund_percentage: 9.99,
    tags: ['cdmx', 'infraestructura', 'transporte', 'cablebus'],
  },
  {
    title: '¿Asignará el presupuesto federal 2027 más del 5% a programas ambientales?',
    description: 'México ha enfrentado críticas por reducción del presupuesto ambiental.',
    category: 'government' as const,
    subcategory: 'policy',
    status: 'active' as const,
    resolution_date: '2027-01-15T00:00:00Z',
    resolution_criteria: 'PEF 2027 en DOF muestra >5% a ramos ambientales',
    verification_sources: ['SHCP PEF', 'CIEP análisis', 'Animal Político'],
    current_probability: 28.0,
    fee_percentage: 2.5,
    conscious_fund_percentage: 9.99,
    tags: ['presupuesto', 'medio-ambiente', 'gobierno'],
  },
  {
    title: '¿Reducirá FEMSA plásticos de un solo uso en OXXO un 25% para 2026?',
    description:
      'FEMSA anunció compromisos de sustentabilidad. OXXO tiene 21,000+ tiendas en México.',
    category: 'corporate' as const,
    subcategory: 'sustainability',
    status: 'active' as const,
    resolution_date: '2026-12-31T23:59:59Z',
    resolution_criteria:
      'Informe sustentabilidad FEMSA 2026 muestra reducción ≥25% vs 2024',
    verification_sources: ['FEMSA Informe Sustentabilidad', 'Tec de Monterrey', 'Expansión'],
    current_probability: 40.0,
    fee_percentage: 2.5,
    conscious_fund_percentage: 9.99,
    tags: ['femsa', 'oxxo', 'plasticos', 'sustentabilidad'],
  },
  {
    title: '¿Mejorará la calidad del aire en CDMX (PM2.5) un 10% vs 2025?',
    description: 'La ZMVM registra niveles de PM2.5 que superan normas OMS.',
    category: 'cause' as const,
    subcategory: 'environment',
    status: 'active' as const,
    resolution_date: '2027-03-15T00:00:00Z',
    resolution_criteria:
      'Datos SIMAT/SEMARNAT promedio anual PM2.5 2026 vs 2025 reducción ≥10%',
    verification_sources: ['SEMARNAT SIMAT', 'INECC', 'Greenpeace México'],
    current_probability: 22.0,
    fee_percentage: 2.5,
    conscious_fund_percentage: 9.99,
    tags: ['medio-ambiente', 'calidad-aire', 'cdmx', 'salud'],
  },
  {
    title: '¿Disminuirán los feminicidios en México un 15% en 2026 vs 2025?',
    description: 'México enfrenta crisis de violencia de género.',
    category: 'cause' as const,
    subcategory: 'social_justice',
    status: 'active' as const,
    resolution_date: '2027-02-15T00:00:00Z',
    resolution_criteria: 'Cifras SESNSP 2026 vs 2025 muestran reducción ≥15%',
    verification_sources: ['SESNSP datos oficiales', 'ONU Mujeres', 'OCNF'],
    current_probability: 18.0,
    fee_percentage: 2.5,
    conscious_fund_percentage: 9.99,
    tags: ['feminicidio', 'seguridad', 'justicia', 'derechos-humanos'],
  },
]

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

async function main() {
  console.log('🌱 Seed Prediction Markets\n')

  const supabase = createAdminClient()

  // 1. Idempotent cleanup: delete seeded markets and related data
  console.log('1. Cleaning up previous seeded data...')

  const { data: allMarkets } = await supabase
    .from('prediction_markets')
    .select('id, metadata')
  const seededIds = (allMarkets ?? [])
    .filter((m) => (m.metadata as Record<string, unknown>)?.seeded === true)
    .map((m) => m.id)

  if (seededIds.length > 0) {
    await supabase.from('prediction_trades').delete().in('market_id', seededIds)
    await supabase.from('prediction_positions').delete().in('market_id', seededIds)
    await supabase.from('conscious_fund_transactions').delete().in('market_id', seededIds)
    await supabase.from('prediction_market_history').delete().in('market_id', seededIds)
    await supabase.from('agent_content').delete().in('market_id', seededIds)
    await supabase.from('sentiment_scores').delete().in('market_id', seededIds)
    await supabase.from('prediction_markets').delete().in('id', seededIds)
    console.log(`   Deleted ${seededIds.length} seeded markets and related rows.\n`)
  } else {
    console.log('   No previous seeded markets found.\n')
  }

  // 2. Insert markets
  console.log('2. Inserting markets...')
  const marketIds: string[] = []

  for (let i = 0; i < MARKETS.length; i++) {
    const m = MARKETS[i]
    const { data, error } = await supabase
      .from('prediction_markets')
      .insert({
        title: m.title,
        description: m.description,
        category: m.category,
        subcategory: m.subcategory,
        status: m.status,
        resolution_date: m.resolution_date,
        resolution_criteria: m.resolution_criteria,
        verification_sources: m.verification_sources,
        current_probability: m.current_probability,
        fee_percentage: m.fee_percentage,
        conscious_fund_percentage: m.conscious_fund_percentage,
        min_trade: 10,
        tags: m.tags,
        created_by: CREATED_BY,
        metadata: { seeded: true },
      })
      .select('id')
      .single()

    if (error) {
      console.error(`   ❌ Market ${i + 1}: ${error.message}`)
      throw error
    }
    marketIds.push(data!.id)
    console.log(`   ✅ ${i + 1}/8: ${m.title.slice(0, 50)}...`)
  }
  console.log('')

  // 3. Insert prediction_market_history (30 per market)
  console.log('3. Inserting prediction_market_history (30 entries per market)...')
  let historyCount = 0
  const rng = seededRandom(12345)

  for (let mi = 0; mi < marketIds.length; mi++) {
    const marketId = marketIds[mi]
    const currentProb = MARKETS[mi].current_probability
    let prob = currentProb + (rng() - 0.5) * 30
    prob = Math.max(5, Math.min(95, prob))

    const entries: Array<{
      market_id: string
      probability: number
      volume_24h: number
      trade_count: number
      recorded_at: string
    }> = []

    for (let d = 29; d >= 0; d--) {
      const dayAgo = subDays(new Date(), d)
      const variation = (rng() - 0.5) * 8
      prob = Math.max(5, Math.min(95, prob + variation))
      entries.push({
        market_id: marketId,
        probability: Math.round(prob * 100) / 100,
        volume_24h: Math.round(randomInRange(1000, 15000) * 100) / 100,
        trade_count: randomInt(10, 80),
        recorded_at: format(dayAgo, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      })
    }

    const { error } = await supabase.from('prediction_market_history').insert(entries)
    if (error) throw error
    historyCount += entries.length
  }
  console.log(`   ✅ Inserted ${historyCount} history entries.\n`)

  // 4. Insert agent_content (3 per market)
  console.log('4. Inserting agent_content (3 entries per market)...')
  const AGENT_CONTENT_TEMPLATES: Record<
    string,
    Array<{ agent_type: string; content_type: string; title: string; body: string }>
  > = {
    world_sports: [
      {
        agent_type: 'news_monitor',
        content_type: 'news_summary',
        title: 'Resumen de noticias: Selección Mexicana y Mundial 2026',
        body:
          'Según cobertura de TUDN y ESPN, la Federación Mexicana de Fútbol ha intensificado la preparación para el Mundial 2026. El calendario de amistosos incluye encuentros con selecciones europeas. Analistas de FiveThirtyEight sitúan a México con probabilidad media-alta de avanzar a octavos, considerando el factor local y la reforma del formato FIFA.',
      },
      {
        agent_type: 'content_creator',
        content_type: 'market_insight',
        title: 'Análisis: Factor sede en Mundiales',
        body:
          'Históricamente, los anfitriones mejoran su rendimiento. México 86 y USA 94 son referentes. Con sedes en México, USA y Canadá, la selección tendrá apoyo local en varios partidos. El mercado refleja expectativa moderada de avance.',
      },
      {
        agent_type: 'content_creator',
        content_type: 'weekly_digest',
        title: 'Resumen semanal: Mercados deportivos',
        body:
          'El mercado de avance de México a octavos se mantiene estable. Volumen de operaciones en aumento. Próximos amistosos podrían mover la probabilidad.',
      },
    ],
    world_economics: [
      {
        agent_type: 'news_monitor',
        content_type: 'news_summary',
        title: 'Resumen: Política monetaria Banxico',
        body:
          'El Banco de México mantuvo la tasa en 11.25% en su última decisión. Comunicados oficiales señalan que la reducción será gradual. Bloomberg y El Financiero reportan que analistas esperan inicio del ciclo de bajada en segundo semestre 2025.',
      },
      {
        agent_type: 'content_creator',
        content_type: 'market_insight',
        title: 'Perspectiva: Ciclo de tasas en México',
        body:
          'La inflación core ha mostrado desaceleración. Si Banxico mantiene el ritmo actual de recortes, la probabilidad de alcanzar sub-8% para diciembre 2026 es moderada. Datos de CIEP y Banxico son la referencia.',
      },
      {
        agent_type: 'content_creator',
        content_type: 'weekly_digest',
        title: 'Resumen semanal: Mercados económicos',
        body:
          'Mercados de tasas y tipo de cambio con actividad estable. Banxico en foco. Próxima reunión de política monetaria clave.',
      },
    ],
    government: [
      {
        agent_type: 'news_monitor',
        content_type: 'news_summary',
        title: 'Resumen: Infraestructura y presupuesto CDMX',
        body:
          'Reportes del Gobierno de CDMX indican avance en Cablebús Línea 3. IMCO ha publicado análisis de infraestructura urbana. Reforma y medios locales cubren las obras. El PEF 2026 incluye partidas para transporte.',
      },
      {
        agent_type: 'content_creator',
        content_type: 'market_insight',
        title: 'Análisis: Cumplimiento de megaproyectos',
        body:
          'Proyectos de transporte en CDMX han tenido retrasos históricos. Cablebús L1 y L2 sirven de referencia. La Línea 3 tiene cronograma ambicioso. Datos oficiales serán la verificación.',
      },
      {
        agent_type: 'content_creator',
        content_type: 'weekly_digest',
        title: 'Resumen semanal: Mercados de gobierno',
        body:
          'Mercados de infraestructura y presupuesto con interés creciente. Transparencia presupuestal y reportes oficiales son la base de resolución.',
      },
    ],
    corporate: [
      {
        agent_type: 'news_monitor',
        content_type: 'news_summary',
        title: 'Resumen: Sustentabilidad FEMSA y OXXO',
        body:
          'FEMSA publicó avances en su informe de sustentabilidad. OXXO ha implementado programas de reducción de plásticos. Expansión y Tec de Monterrey han analizado los compromisos. El objetivo del 25% es ambicioso dado el tamaño de la red.',
      },
      {
        agent_type: 'content_creator',
        content_type: 'market_insight',
        title: 'Perspectiva: ESG en retail',
        body:
          'Las cadenas de retail enfrentan presión regulatoria y de consumidores. FEMSA tiene metas claras. El informe 2026 será la verificación oficial. Mercado con probabilidad moderada.',
      },
      {
        agent_type: 'content_creator',
        content_type: 'weekly_digest',
        title: 'Resumen semanal: Mercados corporativos',
        body:
          'Sustentabilidad corporativa en foco. FEMSA y OXXO con alta visibilidad. Informes anuales serán clave para resolución.',
      },
    ],
    cause: [
      {
        agent_type: 'news_monitor',
        content_type: 'news_summary',
        title: 'Resumen: Calidad del aire y violencia de género en México',
        body:
          'SEMARNAT e INECC publican datos de calidad del aire. SESNSP y ONU Mujeres reportan cifras de violencia. Greenpeace y OCNF hacen seguimiento. Las fuentes oficiales son la base para resolución de estos mercados.',
      },
      {
        agent_type: 'content_creator',
        content_type: 'market_insight',
        title: 'Análisis: Mercados de causa social',
        body:
          'Los mercados de causa requieren datos oficiales y verificables. SEMARNAT, SESNSP y organismos internacionales son las fuentes. La probabilidad refleja el desafío de lograr las metas.',
      },
      {
        agent_type: 'content_creator',
        content_type: 'weekly_digest',
        title: 'Resumen semanal: Mercados de causa',
        body:
          'Mercados ambientales y de justicia social con atención creciente. Transparencia y datos oficiales son fundamentales.',
      },
    ],
  }

  const getTemplates = (cat: string, sub: string) => {
    if (cat === 'world') return sub === 'sports' ? AGENT_CONTENT_TEMPLATES.world_sports : AGENT_CONTENT_TEMPLATES.world_economics
    if (cat === 'government') return AGENT_CONTENT_TEMPLATES.government
    if (cat === 'corporate') return AGENT_CONTENT_TEMPLATES.corporate
    return AGENT_CONTENT_TEMPLATES.cause
  }

  let agentCount = 0
  for (let mi = 0; mi < marketIds.length; mi++) {
    const m = MARKETS[mi]
    const templates = getTemplates(m.category, m.subcategory)
    for (const t of templates) {
      const { error } = await supabase.from('agent_content').insert({
        market_id: marketIds[mi],
        agent_type: t.agent_type,
        content_type: t.content_type,
        title: t.title,
        body: t.body,
        language: 'es',
        published: true,
      })
      if (error) throw error
      agentCount++
    }
  }
  console.log(`   ✅ Inserted ${agentCount} agent_content entries.\n`)

  // 5. Insert sentiment_scores (5 per market)
  console.log('5. Inserting sentiment_scores (5 entries per market)...')
  let sentimentCount = 0
  const sources = ['google_trends', 'news_analysis']

  for (const marketId of marketIds) {
    const baseDate = subDays(new Date(), 14)
    for (let s = 0; s < 5; s++) {
      const dayOffset = Math.floor((s / 5) * 14)
      const recordedAt = format(subDays(baseDate, -dayOffset), "yyyy-MM-dd'T'HH:mm:ss'Z'")
      const score = randomInt(-30, 30)
      const { error } = await supabase.from('sentiment_scores').insert({
        market_id: marketId,
        score,
        source: sources[s % 2],
        keywords: [],
        recorded_at: recordedAt,
      })
      if (error) throw error
      sentimentCount++
    }
  }
  console.log(`   ✅ Inserted ${sentimentCount} sentiment_scores entries.\n`)

  // 6. Update conscious_fund and insert transactions
  console.log('6. Updating conscious_fund and inserting transactions...')

  const { data: fundRow } = await supabase
    .from('conscious_fund')
    .select('id')
    .limit(1)
    .single()

  if (fundRow) {
    await supabase
      .from('conscious_fund')
      .update({
        total_collected: 15420.5,
        current_balance: 15420.5,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fundRow.id)
  } else {
    await supabase.from('conscious_fund').insert({
      total_collected: 15420.5,
      total_disbursed: 0,
      current_balance: 15420.5,
    })
  }

  const amounts = [120, 350, 85, 520, 200, 780, 95, 410, 650, 180, 290, 500]
  for (let i = 0; i < 12; i++) {
    const dayAgo = 30 - Math.floor((i / 12) * 30)
    const recordedAt = format(subDays(new Date(), dayAgo), "yyyy-MM-dd'T'HH:mm:ss'Z'")
    const amt = amounts[i] ?? randomInRange(50, 800)
    await supabase.from('conscious_fund_transactions').insert({
      amount: amt,
      source_type: 'trade_fee',
      market_id: marketIds[i % marketIds.length],
      description: 'Trade fee from prediction',
      created_at: recordedAt,
    })
  }
  console.log('   ✅ Updated conscious_fund, inserted 12 transactions.\n')

  // 7. Final counts
  console.log('7. Final counts:')
  const [marketsRes, historyRes, agentRes, sentimentRes, fundRes, txRes] = await Promise.all([
    supabase.from('prediction_markets').select('id', { count: 'exact', head: true }),
    supabase.from('prediction_market_history').select('id', { count: 'exact', head: true }),
    supabase.from('agent_content').select('id', { count: 'exact', head: true }),
    supabase.from('sentiment_scores').select('id', { count: 'exact', head: true }),
    supabase.from('conscious_fund').select('*').limit(1).single(),
    supabase.from('conscious_fund_transactions').select('id', { count: 'exact', head: true }),
  ])

  console.log(`   prediction_markets:        ${marketsRes.count ?? 0}`)
  console.log(`   prediction_market_history: ${historyRes.count ?? 0}`)
  console.log(`   agent_content:             ${agentRes.count ?? 0}`)
  console.log(`   sentiment_scores:          ${sentimentRes.count ?? 0}`)
  console.log(`   conscious_fund:            balance=${fundRes.data?.current_balance ?? 0}`)
  console.log(`   conscious_fund_transactions: ${txRes.count ?? 0}`)
  console.log('\n✅ Seed complete.')
}

main().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
