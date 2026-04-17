-- ============================================================================
-- 195 · Pre-stage 10 Mundial 2026 markets (Phase 4 · Step 4.1)
-- ============================================================================
-- Goal: seed the platform with 10 World-Cup-themed markets so there's
-- social proof and engagement before traffic arrives in June 2026.
--
-- Design notes:
--   • Idempotent — each market is inserted only if the exact title does
--     not already exist. Re-running is safe.
--   • `created_by` is resolved to the oldest auth.users entry
--     (platform owner) to satisfy the NOT NULL FK.
--   • `category` values are drawn from the CHECK in migration 164
--     (`world_cup`, `sustainability`, `pulse`, `economy`, `entertainment`).
--     There is no `is_featured` column on `prediction_markets`, so we set
--     `metadata.featured = true` on the first five instead.
--   • Bilingual copy is stored in `translations` JSONB (see migration 139).
--   • Outcomes get matching English labels via `market_outcomes.translations`.
-- ============================================================================

DO $$
DECLARE
  v_owner uuid;
  v_market_id uuid;
  v_total integer;
BEGIN
  -- Prefer an explicit admin account if the email is seeded; fall back
  -- to the oldest registered user (the platform owner on a fresh DB).
  SELECT id INTO v_owner
  FROM auth.users
  WHERE email = 'francisco@crowdconscious.app'
  LIMIT 1;

  IF v_owner IS NULL THEN
    SELECT id INTO v_owner
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_owner IS NULL THEN
    RAISE NOTICE '[195] No auth.users present; skipping Mundial 2026 pre-stage seed.';
    RETURN;
  END IF;

  -- ==========================================================
  -- GROUP STAGE — resolve at the end of the group stage
  -- ==========================================================

  -- 1 · México goals in the group stage (multi)
  IF NOT EXISTS (
    SELECT 1 FROM public.prediction_markets
    WHERE title = '¿Cuántos goles anotará México en la fase de grupos?'
  ) THEN
    INSERT INTO public.prediction_markets (
      title, description, category, created_by, resolution_date,
      resolution_criteria, market_type, status, current_probability,
      translations, metadata
    ) VALUES (
      '¿Cuántos goles anotará México en la fase de grupos?',
      'Total de goles marcados por la Selección Mexicana en sus tres partidos de la fase de grupos del Mundial 2026.',
      'world_cup', v_owner, '2026-06-27T23:59:59-06:00'::timestamptz,
      'Se resuelve con el recuento oficial de FIFA al final de la fase de grupos.',
      'multi', 'active', 25.00,
      jsonb_build_object(
        'en', jsonb_build_object(
          'title', 'How many goals will Mexico score in the group stage?',
          'description', 'Total goals scored by the Mexican national team across its three group-stage matches at the 2026 World Cup.',
          'resolution_criteria', 'Resolved by FIFA''s official goal count at the end of the group stage.'
        )
      ),
      jsonb_build_object('featured', true, 'prestage_batch', '2026-04-16', 'mundial', true)
    ) RETURNING id INTO v_market_id;

    INSERT INTO public.market_outcomes (market_id, label, probability, sort_order, translations) VALUES
      (v_market_id, '0-2 goles', 0.25, 0, jsonb_build_object('en', jsonb_build_object('label', '0-2 goals'))),
      (v_market_id, '3-4 goles', 0.25, 1, jsonb_build_object('en', jsonb_build_object('label', '3-4 goals'))),
      (v_market_id, '5-6 goles', 0.25, 2, jsonb_build_object('en', jsonb_build_object('label', '5-6 goals'))),
      (v_market_id, '7+ goles',  0.25, 3, jsonb_build_object('en', jsonb_build_object('label', '7+ goals')));
  END IF;

  -- 2 · México advances to Round of 16 (binary)
  IF NOT EXISTS (
    SELECT 1 FROM public.prediction_markets
    WHERE title = '¿Pasará México a octavos de final?'
  ) THEN
    INSERT INTO public.prediction_markets (
      title, description, category, created_by, resolution_date,
      resolution_criteria, market_type, status, current_probability,
      translations, metadata
    ) VALUES (
      '¿Pasará México a octavos de final?',
      'La Selección Mexicana se clasifica a la ronda de octavos de final del Mundial 2026.',
      'world_cup', v_owner, '2026-06-27T23:59:59-06:00'::timestamptz,
      'Se resuelve cuando FIFA confirme oficialmente la lista de clasificados a octavos de final.',
      'binary', 'active', 50.00,
      jsonb_build_object(
        'en', jsonb_build_object(
          'title', 'Will Mexico advance to the Round of 16?',
          'description', 'The Mexican national team qualifies for the Round of 16 at the 2026 World Cup.',
          'resolution_criteria', 'Resolved when FIFA officially confirms the list of teams advancing to the Round of 16.'
        )
      ),
      jsonb_build_object('featured', true, 'prestage_batch', '2026-04-16', 'mundial', true)
    ) RETURNING id INTO v_market_id;

    INSERT INTO public.market_outcomes (market_id, label, probability, sort_order, translations) VALUES
      (v_market_id, 'Sí', 0.5, 0, jsonb_build_object('en', jsonb_build_object('label', 'Yes'))),
      (v_market_id, 'No', 0.5, 1, jsonb_build_object('en', jsonb_build_object('label', 'No')));
  END IF;

  -- 3 · Tournament dark horse (multi)
  IF NOT EXISTS (
    SELECT 1 FROM public.prediction_markets
    WHERE title = '¿Cuál será la sorpresa del Mundial 2026?'
  ) THEN
    INSERT INTO public.prediction_markets (
      title, description, category, created_by, resolution_date,
      resolution_criteria, market_type, status, current_probability,
      translations, metadata
    ) VALUES (
      '¿Cuál será la sorpresa del Mundial 2026?',
      'Equipo considerado "outsider" que avance más lejos de lo esperado en el torneo.',
      'world_cup', v_owner, '2026-07-19T23:59:59-06:00'::timestamptz,
      'Se resuelve a favor del equipo entre los listados que alcance la ronda más avanzada. En caso de empate, el de mejor diferencia de goles.',
      'multi', 'active', 20.00,
      jsonb_build_object(
        'en', jsonb_build_object(
          'title', 'Who will be the surprise team of the 2026 World Cup?',
          'description', 'An "outsider" team that advances further than expected in the tournament.',
          'resolution_criteria', 'Resolved in favor of the team from the list that reaches the furthest round; ties broken by goal difference.'
        )
      ),
      jsonb_build_object('featured', true, 'prestage_batch', '2026-04-16', 'mundial', true)
    ) RETURNING id INTO v_market_id;

    INSERT INTO public.market_outcomes (market_id, label, probability, sort_order, translations) VALUES
      (v_market_id, 'Marruecos',  0.20, 0, jsonb_build_object('en', jsonb_build_object('label', 'Morocco'))),
      (v_market_id, 'Canadá',     0.20, 1, jsonb_build_object('en', jsonb_build_object('label', 'Canada'))),
      (v_market_id, 'Japón',      0.20, 2, jsonb_build_object('en', jsonb_build_object('label', 'Japan'))),
      (v_market_id, 'Senegal',    0.20, 3, jsonb_build_object('en', jsonb_build_object('label', 'Senegal'))),
      (v_market_id, 'Ecuador',    0.20, 4, jsonb_build_object('en', jsonb_build_object('label', 'Ecuador')));
  END IF;

  -- ==========================================================
  -- CDMX IMPACT — resolve at the end of the tournament
  -- ==========================================================

  -- 4 · Public transport during the Mundial (multi)
  IF NOT EXISTS (
    SELECT 1 FROM public.prediction_markets
    WHERE title = '¿Será el transporte público suficiente durante el Mundial?'
  ) THEN
    INSERT INTO public.prediction_markets (
      title, description, category, created_by, resolution_date,
      resolution_criteria, market_type, status, current_probability,
      translations, metadata
    ) VALUES (
      '¿Será el transporte público suficiente durante el Mundial?',
      'Percepción colectiva sobre la capacidad del transporte público de CDMX (Metro, Metrobús, Cablebús) para cubrir la demanda durante el Mundial 2026.',
      'world_cup', v_owner, '2026-07-20T23:59:59-06:00'::timestamptz,
      'Se resuelve con encuesta pública y reportes oficiales de movilidad publicados tras la final del torneo.',
      'multi', 'active', 25.00,
      jsonb_build_object(
        'en', jsonb_build_object(
          'title', 'Will CDMX public transport hold up during the 2026 World Cup?',
          'description', 'Collective perception of whether Mexico City''s public-transport system (Metro, Metrobús, Cablebús) can absorb demand during the 2026 World Cup.',
          'resolution_criteria', 'Resolved via a public survey and official mobility reports published after the tournament final.'
        )
      ),
      jsonb_build_object('featured', true, 'prestage_batch', '2026-04-16', 'mundial', true)
    ) RETURNING id INTO v_market_id;

    INSERT INTO public.market_outcomes (market_id, label, probability, sort_order, translations) VALUES
      (v_market_id, 'Sí, sin problemas',      0.25, 0, jsonb_build_object('en', jsonb_build_object('label', 'Yes, no problems'))),
      (v_market_id, 'Funcional pero saturado',0.25, 1, jsonb_build_object('en', jsonb_build_object('label', 'Functional but overcrowded'))),
      (v_market_id, 'Insuficiente',           0.25, 2, jsonb_build_object('en', jsonb_build_object('label', 'Insufficient'))),
      (v_market_id, 'Caótico',                0.25, 3, jsonb_build_object('en', jsonb_build_object('label', 'Chaotic')));
  END IF;

  -- 5 · CDMX sustainability commitments for the Mundial (multi)
  IF NOT EXISTS (
    SELECT 1 FROM public.prediction_markets
    WHERE title = '¿Cumplirá CDMX sus compromisos de sustentabilidad para el Mundial?'
  ) THEN
    INSERT INTO public.prediction_markets (
      title, description, category, created_by, resolution_date,
      resolution_criteria, market_type, status, current_probability,
      translations, metadata
    ) VALUES (
      '¿Cumplirá CDMX sus compromisos de sustentabilidad para el Mundial?',
      'Percepción sobre el cumplimiento de los compromisos ambientales publicados por el gobierno de la CDMX para la sede del Mundial 2026.',
      'sustainability', v_owner, '2026-07-20T23:59:59-06:00'::timestamptz,
      'Se resuelve comparando los compromisos publicados (documento oficial) vs entregables verificables al cierre del torneo.',
      'multi', 'active', 33.00,
      jsonb_build_object(
        'en', jsonb_build_object(
          'title', 'Will CDMX deliver on its 2026 World Cup sustainability commitments?',
          'description', 'Collective perception of whether Mexico City will deliver on the environmental commitments published for its role as a 2026 World Cup host.',
          'resolution_criteria', 'Resolved by comparing published commitments (official document) with verifiable deliverables at tournament close.'
        )
      ),
      jsonb_build_object('featured', true, 'prestage_batch', '2026-04-16', 'mundial', true)
    ) RETURNING id INTO v_market_id;

    INSERT INTO public.market_outcomes (market_id, label, probability, sort_order, translations) VALUES
      (v_market_id, 'Sí',          0.33, 0, jsonb_build_object('en', jsonb_build_object('label', 'Yes'))),
      (v_market_id, 'Parcialmente',0.33, 1, jsonb_build_object('en', jsonb_build_object('label', 'Partially'))),
      (v_market_id, 'No',          0.34, 2, jsonb_build_object('en', jsonb_build_object('label', 'No')));
  END IF;

  -- 6 · Conscious Locations count at Mundial kickoff (multi)
  IF NOT EXISTS (
    SELECT 1 FROM public.prediction_markets
    WHERE title = '¿Cuántos Lugares Conscientes tendrá CDMX para el Mundial?'
  ) THEN
    INSERT INTO public.prediction_markets (
      title, description, category, created_by, resolution_date,
      resolution_criteria, market_type, status, current_probability,
      translations, metadata
    ) VALUES (
      '¿Cuántos Lugares Conscientes tendrá CDMX para el Mundial?',
      'Número total de Lugares Conscientes certificados en CDMX al momento del partido inaugural del Mundial 2026 (11 de junio).',
      'world_cup', v_owner, '2026-06-11T16:00:00-06:00'::timestamptz,
      'Se resuelve con el conteo de la tabla `conscious_locations` donde status=active al inicio del partido inaugural.',
      'multi', 'active', 25.00,
      jsonb_build_object(
        'en', jsonb_build_object(
          'title', 'How many Conscious Locations will CDMX have by kickoff?',
          'description', 'Total number of certified Conscious Locations in Mexico City at the kickoff of the 2026 World Cup opening match (June 11).',
          'resolution_criteria', 'Resolved by counting rows in `conscious_locations` with status=active at the kickoff of the opening match.'
        )
      ),
      jsonb_build_object('prestage_batch', '2026-04-16', 'mundial', true)
    ) RETURNING id INTO v_market_id;

    INSERT INTO public.market_outcomes (market_id, label, probability, sort_order, translations) VALUES
      (v_market_id, 'Menos de 10', 0.25, 0, jsonb_build_object('en', jsonb_build_object('label', 'Fewer than 10'))),
      (v_market_id, '10 a 25',     0.25, 1, jsonb_build_object('en', jsonb_build_object('label', '10 to 25'))),
      (v_market_id, '25 a 50',     0.25, 2, jsonb_build_object('en', jsonb_build_object('label', '25 to 50'))),
      (v_market_id, 'Más de 50',   0.25, 3, jsonb_build_object('en', jsonb_build_object('label', 'More than 50')));
  END IF;

  -- ==========================================================
  -- SPONSOR-READY — designed for brand activations
  -- ==========================================================

  -- 7 · CDMX 60-day priority (multi) — template for the municipality pilot
  IF NOT EXISTS (
    SELECT 1 FROM public.prediction_markets
    WHERE title = '¿Qué debería priorizar CDMX en los próximos 60 días?'
  ) THEN
    INSERT INTO public.prediction_markets (
      title, description, category, created_by, resolution_date,
      resolution_criteria, market_type, status, current_probability,
      translations, metadata
    ) VALUES (
      '¿Qué debería priorizar CDMX en los próximos 60 días?',
      'Prioridad que los habitantes de CDMX consideran más urgente antes del partido inaugural del Mundial 2026.',
      'pulse', v_owner, '2026-06-11T16:00:00-06:00'::timestamptz,
      'Pregunta de opinión. Se resuelve a favor del outcome con la probabilidad final más alta tras el cierre del mercado.',
      'multi', 'active', 25.00,
      jsonb_build_object(
        'en', jsonb_build_object(
          'title', 'What should CDMX prioritize in the next 60 days?',
          'description', 'Priority that CDMX residents consider most urgent before the kickoff of the 2026 World Cup opening match.',
          'resolution_criteria', 'Opinion question. Resolved in favor of the outcome with the highest final probability at market close.'
        )
      ),
      jsonb_build_object('prestage_batch', '2026-04-16', 'sponsor_template', 'cdmx_municipality', 'mundial', true)
    ) RETURNING id INTO v_market_id;

    INSERT INTO public.market_outcomes (market_id, label, probability, sort_order, translations) VALUES
      (v_market_id, 'Seguridad',    0.25, 0, jsonb_build_object('en', jsonb_build_object('label', 'Security'))),
      (v_market_id, 'Transporte',   0.25, 1, jsonb_build_object('en', jsonb_build_object('label', 'Transport'))),
      (v_market_id, 'Hospitalidad', 0.25, 2, jsonb_build_object('en', jsonb_build_object('label', 'Hospitality'))),
      (v_market_id, 'Limpieza',     0.25, 3, jsonb_build_object('en', jsonb_build_object('label', 'Cleanliness')));
  END IF;

  -- 8 · 2026 gasoline subsidies (binary) — news-monitor signal
  IF NOT EXISTS (
    SELECT 1 FROM public.prediction_markets
    WHERE title = '¿Superarán $250,000 MDP los subsidios a gasolina durante 2026?'
  ) THEN
    INSERT INTO public.prediction_markets (
      title, description, category, created_by, resolution_date,
      resolution_criteria, market_type, status, current_probability,
      translations, metadata
    ) VALUES (
      '¿Superarán $250,000 MDP los subsidios a gasolina durante 2026?',
      'El gasto total en subsidios al IEPS a gasolinas y diésel durante el año 2026 excederá los $250,000 millones de pesos.',
      'economy', v_owner, '2027-02-28T23:59:59-06:00'::timestamptz,
      'Se resuelve con la Cuenta Pública 2026 publicada por la SHCP o con el último informe trimestral disponible.',
      'binary', 'active', 50.00,
      jsonb_build_object(
        'en', jsonb_build_object(
          'title', 'Will 2026 gasoline subsidies in Mexico exceed MXN 250B?',
          'description', 'Total spending on IEPS gasoline and diesel subsidies during calendar year 2026 will exceed MXN 250 billion.',
          'resolution_criteria', 'Resolved by the 2026 Cuenta Pública report from SHCP or the latest available quarterly report.'
        )
      ),
      jsonb_build_object('prestage_batch', '2026-04-16', 'sponsor_target', 'energy', 'mundial', false)
    ) RETURNING id INTO v_market_id;

    INSERT INTO public.market_outcomes (market_id, label, probability, sort_order, translations) VALUES
      (v_market_id, 'Sí', 0.5, 0, jsonb_build_object('en', jsonb_build_object('label', 'Yes'))),
      (v_market_id, 'No', 0.5, 1, jsonb_build_object('en', jsonb_build_object('label', 'No')));
  END IF;

  -- 9 · Afores crisis impact on World Cup attendance (multi)
  IF NOT EXISTS (
    SELECT 1 FROM public.prediction_markets
    WHERE title = '¿Afectará la crisis de Afores la asistencia al Mundial?'
  ) THEN
    INSERT INTO public.prediction_markets (
      title, description, category, created_by, resolution_date,
      resolution_criteria, market_type, status, current_probability,
      translations, metadata
    ) VALUES (
      '¿Afectará la crisis de Afores la asistencia al Mundial?',
      'Impacto estimado de la crisis de Afores y pensiones sobre el gasto discrecional y, por tanto, la asistencia de mexicanos a los partidos del Mundial 2026.',
      'economy', v_owner, '2026-07-20T23:59:59-06:00'::timestamptz,
      'Se resuelve con datos oficiales de asistencia de FIFA y reportes de CONSAR sobre flujos de las Afores durante 2026.',
      'multi', 'active', 33.00,
      jsonb_build_object(
        'en', jsonb_build_object(
          'title', 'Will the Afores crisis dampen 2026 World Cup attendance?',
          'description', 'Estimated impact of the Afores / pensions crisis on discretionary spending and therefore on Mexican attendance at 2026 World Cup matches.',
          'resolution_criteria', 'Resolved using official FIFA attendance data and CONSAR reports on Afores flows during 2026.'
        )
      ),
      jsonb_build_object('prestage_batch', '2026-04-16', 'sponsor_target', 'fintech', 'mundial', true)
    ) RETURNING id INTO v_market_id;

    INSERT INTO public.market_outcomes (market_id, label, probability, sort_order, translations) VALUES
      (v_market_id, 'Sí, significativamente', 0.33, 0, jsonb_build_object('en', jsonb_build_object('label', 'Yes, significantly'))),
      (v_market_id, 'Poco impacto',           0.33, 1, jsonb_build_object('en', jsonb_build_object('label', 'Minor impact'))),
      (v_market_id, 'Ningún impacto',         0.34, 2, jsonb_build_object('en', jsonb_build_object('label', 'No impact')));
  END IF;

  -- 10 · Best fan fest in CDMX (multi)
  IF NOT EXISTS (
    SELECT 1 FROM public.prediction_markets
    WHERE title = '¿Cuál será el mejor fan fest de CDMX?'
  ) THEN
    INSERT INTO public.prediction_markets (
      title, description, category, created_by, resolution_date,
      resolution_criteria, market_type, status, current_probability,
      translations, metadata
    ) VALUES (
      '¿Cuál será el mejor fan fest de CDMX?',
      'Fan fest oficial o no oficial más valorado por los asistentes durante el Mundial 2026 en la Ciudad de México.',
      'entertainment', v_owner, '2026-07-20T23:59:59-06:00'::timestamptz,
      'Se resuelve con una encuesta pública tras la final del torneo combinada con conteo de asistentes reportado por cada sede.',
      'multi', 'active', 20.00,
      jsonb_build_object(
        'en', jsonb_build_object(
          'title', 'Which will be CDMX''s best fan fest?',
          'description', 'Most-loved fan fest — official or unofficial — during the 2026 World Cup in Mexico City.',
          'resolution_criteria', 'Resolved via a post-tournament public survey combined with attendance counts reported by each venue.'
        )
      ),
      jsonb_build_object('prestage_batch', '2026-04-16', 'mundial', true)
    ) RETURNING id INTO v_market_id;

    INSERT INTO public.market_outcomes (market_id, label, probability, sort_order, translations) VALUES
      (v_market_id, 'Zócalo',   0.20, 0, jsonb_build_object('en', jsonb_build_object('label', 'Zócalo'))),
      (v_market_id, 'Reforma',  0.20, 1, jsonb_build_object('en', jsonb_build_object('label', 'Reforma'))),
      (v_market_id, 'Polanco',  0.20, 2, jsonb_build_object('en', jsonb_build_object('label', 'Polanco'))),
      (v_market_id, 'Condesa',  0.20, 3, jsonb_build_object('en', jsonb_build_object('label', 'Condesa'))),
      (v_market_id, 'Otro',     0.20, 4, jsonb_build_object('en', jsonb_build_object('label', 'Other')));
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.prediction_markets
  WHERE metadata->>'prestage_batch' = '2026-04-16';

  RAISE NOTICE '[195] Mundial 2026 pre-stage complete. Batch size: %', v_total;
END $$;
