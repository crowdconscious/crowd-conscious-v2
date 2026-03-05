-- ============================================================
-- PHASE 5: SEED WORLD CUP MARKETS
-- ============================================================
-- Goal: Populate the platform with compelling World Cup markets.
-- Run this in Supabase SQL Editor.
--
-- BEFORE RUNNING:
-- 1. Apply migration 127 (adds world_cup, sustainability categories)
-- 2. Replace 'YOUR_EMAIL' below with your admin user email
-- ============================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get admin user ID (replace YOUR_EMAIL with your actual email)
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'YOUR_EMAIL' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Replace YOUR_EMAIL with your admin email (e.g. admin@example.com)';
  END IF;

  -- BINARY MARKETS
  PERFORM create_binary_market(
    '¿Avanzará México a octavos de final en el Mundial FIFA 2026?',
    'Mexico plays in Group A with South Korea, South Africa, and a UEFA playoff team. Will they advance to the Round of 32?',
    'world_cup', v_user_id,
    '2026-06-25T00:00:00Z'::timestamptz, NULL, NULL, NULL
  );
  PERFORM create_binary_market(
    '¿Habrá más de 2.5 goles en México vs Sudáfrica?',
    'The opening match of the World Cup at Estadio Azteca. Over or under 2.5 goals?',
    'world_cup', v_user_id,
    '2026-06-11T23:00:00Z'::timestamptz
  );
  PERFORM create_binary_market(
    '¿Se llenará el Azteca para el partido inaugural?',
    'Will Estadio Azteca reach full capacity (87,000+) for Mexico vs South Africa on June 11?',
    'world_cup', v_user_id,
    '2026-06-12T00:00:00Z'::timestamptz
  );
  PERFORM create_binary_market(
    '¿Colombia llegará a semifinales?',
    'Colombia is in Group B. Can they make it to the Final Four?',
    'world_cup', v_user_id,
    '2026-07-13T00:00:00Z'::timestamptz
  );
  PERFORM create_binary_market(
    '¿Mejorará la calidad del aire en CDMX durante el Mundial?',
    'With restricted traffic and green initiatives for the World Cup, will air quality improve vs. the same period in 2025?',
    'sustainability', v_user_id,
    '2026-07-20T00:00:00Z'::timestamptz
  );
  PERFORM create_binary_market(
    '¿Habrá nueva ley de apuestas en México antes del Mundial?',
    'SEGOB has been working on gambling reform. Will new legislation pass before June 11?',
    'government', v_user_id,
    '2026-06-11T00:00:00Z'::timestamptz
  );

  -- MULTI-OUTCOME MARKETS
  PERFORM create_multi_market(
    '¿Quién ganará el Grupo A del Mundial 2026?',
    'Group A: Mexico, South Korea, South Africa, UEFA Playoff D. Who finishes first?',
    'world_cup', v_user_id,
    '2026-06-25T00:00:00Z'::timestamptz,
    ARRAY['México', 'Corea del Sur', 'Sudáfrica', 'Repechaje UEFA D']
  );
  PERFORM create_multi_market(
    '¿Quién ganará la Bota de Oro del Mundial 2026?',
    'Top scorer of the tournament. Who will win the Golden Boot?',
    'world_cup', v_user_id,
    '2026-07-19T23:00:00Z'::timestamptz,
    ARRAY['Mbappé', 'Haaland', 'Vinicius Jr.', 'Kane', 'Otro jugador']
  );
  PERFORM create_multi_market(
    '¿Quién ganará la Copa del Mundo 2026?',
    'The biggest prediction of them all. 48 teams, one champion.',
    'world_cup', v_user_id,
    '2026-07-19T23:00:00Z'::timestamptz,
    ARRAY['Argentina', 'Francia', 'Brasil', 'Inglaterra', 'España', 'Alemania', 'México', 'Otro']
  );
  PERFORM create_multi_market(
    '¿Cuál será el mejor Fan Fest del Mundial?',
    'FIFA Fan Festivals across 16 cities. Which one will be the most iconic?',
    'world_cup', v_user_id,
    '2026-07-20T00:00:00Z'::timestamptz,
    ARRAY['CDMX (Zócalo)', 'New York/New Jersey', 'Los Angeles', 'Guadalajara', 'Otra ciudad']
  );
  PERFORM create_multi_market(
    '¿Cuántos goles marcará México en la fase de grupos?',
    'Mexico plays 3 group stage matches. Total goals scored.',
    'world_cup', v_user_id,
    '2026-06-25T00:00:00Z'::timestamptz,
    ARRAY['0-2 goles', '3-4 goles', '5-6 goles', '7+ goles']
  );

  RAISE NOTICE 'Phase 5 seed complete: 6 binary + 5 multi-outcome markets created.';
END $$;

-- Verify
SELECT pm.title, pm.market_type, pm.category,
  (SELECT COUNT(*) FROM market_outcomes mo WHERE mo.market_id = pm.id) as outcome_count
FROM prediction_markets pm
ORDER BY pm.created_at DESC;
