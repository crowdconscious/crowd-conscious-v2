-- Seed English translations for existing prediction markets
-- Run this in Supabase SQL Editor after applying migration 139_add_market_translations.sql

UPDATE prediction_markets SET translations = jsonb_build_object(
  'en', jsonb_build_object(
    'title', 'Will the peso trade below 19 MXN/USD at any point in 2026?',
    'description', 'The Mexican peso has shown volatility against the dollar. Will it break through the 19 barrier?',
    'resolution_criteria', 'Official Banxico or Bloomberg exchange rate data showing MXN/USD < 19.00'
  )
) WHERE title LIKE '%cotizará el peso%';

UPDATE prediction_markets SET translations = jsonb_build_object(
  'en', jsonb_build_object(
    'title', 'Will Banxico lower the reference rate below 8% before December 2026?',
    'description', 'Banxico has maintained restrictive monetary policy. Analysts debate the rate reduction cycle.',
    'resolution_criteria', 'Official Banxico statement with target rate < 8.00%'
  )
) WHERE title LIKE '%Bajará Banxico%';

UPDATE prediction_markets SET translations = jsonb_build_object(
  'en', jsonb_build_object(
    'title', 'Will CDMX complete 80% of Cablebús Line 3 by December 2026?',
    'description', 'The third cable car line in Mexico City has faced construction delays.',
    'resolution_criteria', 'Official CDMX government progress report showing 80%+ completion'
  )
) WHERE title LIKE '%Completará CDMX%';

UPDATE prediction_markets SET translations = jsonb_build_object(
  'en', jsonb_build_object(
    'title', 'Who will win World Cup Group A?',
    'description', 'Group A of the 2026 FIFA World Cup includes Mexico, South Korea, South Africa, and a UEFA playoff winner.',
    'resolution_criteria', 'Official FIFA group stage results'
  )
) WHERE title LIKE '%win World Cup Group A%' OR title ~ 'ganará.*Grupo A';

UPDATE prediction_markets SET translations = jsonb_build_object(
  'en', jsonb_build_object(
    'title', 'Will there be more than 2.5 goals in Mexico vs South Africa?',
    'description', 'The opening match of the 2026 World Cup at Estadio Azteca.',
    'resolution_criteria', 'Official FIFA match result: over or under 2.5 total goals'
  )
) WHERE title LIKE '%2.5 goles%' AND title LIKE '%México%' AND title LIKE '%Sudáfrica%';

UPDATE prediction_markets SET translations = jsonb_build_object(
  'en', jsonb_build_object(
    'title', 'Which will be the best Fan Fest of the World Cup?',
    'description', 'Multiple cities will host official and unofficial fan zones during the tournament.',
    'resolution_criteria', 'Community vote based on attendance, experience, and social media engagement'
  )
) WHERE title LIKE '%mejor Fan Fest%';

UPDATE prediction_markets SET translations = jsonb_build_object(
  'en', jsonb_build_object(
    'title', 'Will Colombia reach the semifinals?',
    'description', 'Colombia qualified for the 2026 World Cup. Can they reach the final four?',
    'resolution_criteria', 'Official FIFA tournament bracket results'
  )
) WHERE title LIKE '%Colombia%' AND title LIKE '%semifinales%';

UPDATE prediction_markets SET translations = jsonb_build_object(
  'en', jsonb_build_object(
    'title', 'Who will win the Golden Boot at the 2026 World Cup?',
    'description', 'The top scorer of the tournament receives the Golden Boot award.',
    'resolution_criteria', 'Official FIFA Golden Boot award announcement'
  )
) WHERE title LIKE '%Bota de Oro%';

UPDATE prediction_markets SET translations = jsonb_build_object(
  'en', jsonb_build_object(
    'title', 'Will the federal budget 2027 allocate more than 5% to environmental programs?',
    'description', 'Mexico''s environmental spending has historically been below 5% of the federal budget.',
    'resolution_criteria', 'Published federal budget for 2027 showing environmental allocation percentage'
  )
) WHERE title LIKE '%presupuesto federal 2027%';

UPDATE prediction_markets SET translations = jsonb_build_object(
  'en', jsonb_build_object(
    'title', 'Will air quality in CDMX improve during the World Cup?',
    'description', 'Mexico City implements special environmental measures during major events.',
    'resolution_criteria', 'Official CDMX air quality index comparison: pre-tournament vs during tournament'
  )
) WHERE title LIKE '%calidad del aire%' AND title LIKE '%durante el Mundial%';

UPDATE prediction_markets SET translations = jsonb_build_object(
  'en', jsonb_build_object(
    'title', 'Will FEMSA reduce single-use plastics at OXXO by 25% by 2026?',
    'description', 'FEMSA has pledged sustainability goals for its OXXO convenience store chain.',
    'resolution_criteria', 'Official FEMSA sustainability report showing plastic reduction metrics'
  )
) WHERE title LIKE '%FEMSA%' AND title LIKE '%plásticos%';

UPDATE prediction_markets SET translations = jsonb_build_object(
  'en', jsonb_build_object(
    'title', 'Will there be a new gambling law in Mexico before the World Cup?',
    'description', 'SEGOB has been working on gambling reform legislation.',
    'resolution_criteria', 'New legislation published in the Diario Oficial de la Federación before June 11, 2026'
  )
) WHERE title LIKE '%ley de apuestas%';

-- Verify translations were applied:
-- SELECT title, translations->'en'->>'title' as english_title 
-- FROM prediction_markets 
-- WHERE translations != '{}' 
-- ORDER BY created_at;
