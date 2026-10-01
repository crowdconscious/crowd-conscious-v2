-- 272: Fix location place placeholders, Instagram handles, benefits copy,
--       and civic-reputation alcaldía derivation for '-' neighborhoods.
--
-- Idempotent / safe to re-run:
--   - CREATE OR REPLACE functions
--   - UPDATEs guarded by WHERE predicates
--   - Scores rebuilt from the events ledger (no re-award / no double-count)
--
-- Francisco: apply this file in the Supabase SQL editor (shared project).
-- Do NOT apply from CI. Mobile app continues to read the same tables/RPCs;
-- slug/label cleanup is backward compatible (locality:- → cdmx).

-- ---------------------------------------------------------------------------
-- 1. Place-text normalizer ( '-', 'S/N', punctuation-only → NULL )
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_reputation_normalize_place_text(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v text := nullif(trim(both from coalesce(p_text, '')), '');
  v_lower text;
BEGIN
  IF v IS NULL THEN
    RETURN NULL;
  END IF;

  v_lower := lower(v);

  IF v_lower IN (
    '-', '—', '–', '.', '..', '...',
    's/n', 'sn', 's.n.', 's.n',
    'n/a', 'na', 'none', 'null', 'undefined',
    'sin colonia', 'sin dirección', 'sin direccion', 'sin barrio'
  ) THEN
    RETURN NULL;
  END IF;

  -- Only punctuation / dashes / whitespace
  IF v ~ '^[[:space:][:punct:]]+$' THEN
    RETURN NULL;
  END IF;

  RETURN v;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Slugify — never emit locality:- for placeholders
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_reputation_slugify(p_label text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v text := public.civic_reputation_normalize_place_text(p_label);
  v_slug text;
BEGIN
  IF v IS NULL THEN
    RETURN 'cdmx';
  END IF;

  v_slug := lower(regexp_replace(v, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);

  IF v_slug IS NULL OR v_slug = '' OR v_slug = '-' THEN
    RETURN 'cdmx';
  END IF;

  RETURN 'locality:' || v_slug;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Resolve alcaldía for a conscious_location (slug + label)
--    Order: cdmx-* row → normalized neighborhood (alcaldía / colonia map)
--           → nearest known colonia centroid from lat/lng → cdmx / NULL label
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_reputation_resolve_location_geo(
  p_loc_id uuid
)
RETURNS TABLE(alcaldia_slug text, alcaldia_label text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slug text;
  v_name text;
  v_neighborhood text;
  v_lat double precision;
  v_lng double precision;
  v_nb text;
  v_nb_key text;
  v_out_slug text;
  v_out_label text;
  v_dist double precision;
BEGIN
  SELECT cl.slug, cl.name, cl.neighborhood, cl.latitude, cl.longitude
    INTO v_slug, v_name, v_neighborhood, v_lat, v_lng
    FROM public.conscious_locations cl
   WHERE cl.id = p_loc_id;

  IF NOT FOUND THEN
    alcaldia_slug := 'cdmx';
    alcaldia_label := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Broad-bucket alcaldía rows seeded as cdmx-*
  IF v_slug LIKE 'cdmx-%' THEN
    alcaldia_slug := v_slug;
    alcaldia_label := v_name;
    RETURN NEXT;
    RETURN;
  END IF;

  v_nb := public.civic_reputation_normalize_place_text(v_neighborhood);

  IF v_nb IS NOT NULL THEN
    v_nb_key := lower(translate(
      v_nb,
      'áàäâÁÀÄÂéèëêÉÈËÊíìïîÍÌÏÎóòöôÓÒÖÔúùüûÚÙÜÛñÑ',
      'aaaaAAAAeeeeEEEEiiiiIIIIooooOOOOuuuuUUUUnN'
    ));
    v_nb_key := regexp_replace(v_nb_key, '\s+', ' ', 'g');

    -- Direct alcaldía name match
    SELECT m.slug, m.label INTO v_out_slug, v_out_label
    FROM (VALUES
      ('alvaro obregon', 'cdmx-alvaro-obregon', 'Álvaro Obregón'),
      ('azcapotzalco', 'cdmx-azcapotzalco', 'Azcapotzalco'),
      ('benito juarez', 'cdmx-benito-juarez', 'Benito Juárez'),
      ('coyoacan', 'cdmx-coyoacan', 'Coyoacán'),
      ('cuajimalpa', 'cdmx-cuajimalpa', 'Cuajimalpa de Morelos'),
      ('cuajimalpa de morelos', 'cdmx-cuajimalpa', 'Cuajimalpa de Morelos'),
      ('cuauhtemoc', 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
      ('gustavo a madero', 'cdmx-gustavo-a-madero', 'Gustavo A. Madero'),
      ('iztacalco', 'cdmx-iztacalco', 'Iztacalco'),
      ('iztapalapa', 'cdmx-iztapalapa', 'Iztapalapa'),
      ('la magdalena contreras', 'cdmx-magdalena-contreras', 'La Magdalena Contreras'),
      ('magdalena contreras', 'cdmx-magdalena-contreras', 'La Magdalena Contreras'),
      ('miguel hidalgo', 'cdmx-miguel-hidalgo', 'Miguel Hidalgo'),
      ('milpa alta', 'cdmx-milpa-alta', 'Milpa Alta'),
      ('tlahuac', 'cdmx-tlahuac', 'Tláhuac'),
      ('tlalpan', 'cdmx-tlalpan', 'Tlalpan'),
      ('venustiano carranza', 'cdmx-venustiano-carranza', 'Venustiano Carranza'),
      ('xochimilco', 'cdmx-xochimilco', 'Xochimilco')
    ) AS m(key, slug, label)
    WHERE m.key = v_nb_key
    LIMIT 1;

    IF v_out_slug IS NOT NULL THEN
      alcaldia_slug := v_out_slug;
      alcaldia_label := v_out_label;
      RETURN NEXT;
      RETURN;
    END IF;

    -- Common colonia → alcaldía (pilot + frequent imports)
    SELECT m.slug, m.label INTO v_out_slug, v_out_label
    FROM (VALUES
      ('roma', 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
      ('roma norte', 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
      ('roma sur', 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
      ('condesa', 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
      ('hipodromo', 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
      ('hipodromo condesa', 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
      ('juarez', 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
      ('doctores', 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
      ('centro', 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
      ('polanco', 'cdmx-miguel-hidalgo', 'Miguel Hidalgo'),
      ('anahuac', 'cdmx-miguel-hidalgo', 'Miguel Hidalgo'),
      ('escandon', 'cdmx-miguel-hidalgo', 'Miguel Hidalgo'),
      ('san miguel chapultepec', 'cdmx-miguel-hidalgo', 'Miguel Hidalgo'),
      ('santa maria la ribera', 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
      ('san rafael', 'cdmx-cuauhtemoc', 'Cuauhtémoc')
    ) AS m(key, slug, label)
    WHERE m.key = v_nb_key
    LIMIT 1;

    IF v_out_slug IS NOT NULL THEN
      alcaldia_slug := v_out_slug;
      alcaldia_label := v_out_label;
      RETURN NEXT;
      RETURN;
    END IF;

    -- Unknown but real neighborhood text → locality bucket (not placeholder)
    alcaldia_slug := public.civic_reputation_slugify(v_nb);
    alcaldia_label := v_nb;
    RETURN NEXT;
    RETURN;
  END IF;

  -- No usable neighborhood: try lat/lng vs known colonia centroids (~3.5 km)
  IF v_lat IS NOT NULL AND v_lng IS NOT NULL THEN
    SELECT c.slug, c.label, c.dist
      INTO v_out_slug, v_out_label, v_dist
    FROM (
      SELECT
        x.slug,
        x.label,
        sqrt(power(v_lat - x.lat, 2) + power(v_lng - x.lng, 2)) AS dist
      FROM (VALUES
        -- Cuauhtémoc / Miguel Hidalgo colonia centroids (sim-viewer fallbacks)
        (19.414727::float8, -99.176356::float8, 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
        (19.409286::float8, -99.179474::float8, 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
        (19.418323::float8, -99.162626::float8, 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
        (19.416978::float8, -99.148975::float8, 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
        (19.405445::float8, -99.149796::float8, 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
        (19.438016::float8, -99.162486::float8, 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
        (19.448365::float8, -99.158788::float8, 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
        (19.446847::float8, -99.129974::float8, 'cdmx-cuauhtemoc', 'Cuauhtémoc'),
        (19.43297::float8,  -99.14816::float8,  'cdmx-cuauhtemoc', 'Cuauhtémoc'),
        (19.433534::float8, -99.198716::float8, 'cdmx-miguel-hidalgo', 'Miguel Hidalgo'),
        (19.444192::float8, -99.176457::float8, 'cdmx-miguel-hidalgo', 'Miguel Hidalgo'),
        (19.401656::float8, -99.178942::float8, 'cdmx-miguel-hidalgo', 'Miguel Hidalgo'),
        (19.411526::float8, -99.185274::float8, 'cdmx-miguel-hidalgo', 'Miguel Hidalgo'),
        (19.42966::float8,  -99.19867::float8,  'cdmx-miguel-hidalgo', 'Miguel Hidalgo')
      ) AS x(lat, lng, slug, label)
    ) c
    ORDER BY c.dist
    LIMIT 1;

    -- ~0.03 deg ≈ 3.3 km at CDMX latitude — only accept close matches
    IF v_out_slug IS NOT NULL AND v_dist IS NOT NULL AND v_dist <= 0.03 THEN
      alcaldia_slug := v_out_slug;
      alcaldia_label := v_out_label;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  -- Unresolved → city-wide slug with NULL label (UI: Sin alcaldía / No alcaldía)
  alcaldia_slug := 'cdmx';
  alcaldia_label := NULL;
  RETURN NEXT;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Location-vote trigger — use resolver; ignore placeholders
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_civic_rep_on_location_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_pulse boolean;
  v_loc_id uuid;
  v_loc_category text;
  v_domain text;
  v_slug text;
  v_label text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT pm.is_pulse INTO v_is_pulse
    FROM public.prediction_markets pm
   WHERE pm.id = NEW.market_id;

  IF coalesce(v_is_pulse, true) THEN
    RETURN NEW;
  END IF;

  SELECT cl.id, cl.category
    INTO v_loc_id, v_loc_category
    FROM public.conscious_locations cl
   WHERE cl.current_market_id = NEW.market_id
   LIMIT 1;

  IF v_loc_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_domain := public.civic_reputation_map_domain(v_loc_category);

  SELECT g.alcaldia_slug, g.alcaldia_label
    INTO v_slug, v_label
    FROM public.civic_reputation_resolve_location_geo(v_loc_id) AS g;

  PERFORM public.award_civic_reputation(
    NEW.user_id,
    'location_evaluation',
    NEW.id::text,
    8,
    v_domain,
    coalesce(v_slug, 'cdmx'),
    v_label,
    v_loc_id,
    jsonb_build_object('market_id', NEW.market_id)
  );

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Signal geo resolver — normalize locality / neighborhood placeholders
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.civic_reputation_resolve_signal_geo(p_signal_id uuid)
RETURNS TABLE(alcaldia_slug text, alcaldia_label text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slug text;
  v_label text;
  v_locality text;
  v_target_location_id uuid;
  v_conscious_location_id uuid;
  v_citizen_target_id uuid;
  v_target_slug text;
  v_target_name text;
  v_loc_nb text;
BEGIN
  SELECT
    s.locality,
    s.target_location_id,
    s.conscious_location_id,
    s.citizen_target_id
  INTO
    v_locality,
    v_target_location_id,
    v_conscious_location_id,
    v_citizen_target_id
  FROM public.citizen_signals s
  WHERE s.id = p_signal_id;

  IF NOT FOUND THEN
    alcaldia_slug := 'cdmx';
    alcaldia_label := 'Ciudad de México';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_target_location_id IS NOT NULL THEN
    SELECT g.alcaldia_slug, g.alcaldia_label
      INTO v_slug, v_label
      FROM public.civic_reputation_resolve_location_geo(v_target_location_id) AS g;
  END IF;

  IF v_slug IS NULL AND v_conscious_location_id IS NOT NULL THEN
    SELECT g.alcaldia_slug, g.alcaldia_label
      INTO v_slug, v_label
      FROM public.civic_reputation_resolve_location_geo(v_conscious_location_id) AS g;

    -- Prefer neighborhood when it is a real place and resolver fell back to cdmx
    IF v_slug = 'cdmx' AND v_label IS NULL THEN
      SELECT public.civic_reputation_normalize_place_text(cl.neighborhood)
        INTO v_loc_nb
        FROM public.conscious_locations cl
       WHERE cl.id = v_conscious_location_id;
      IF v_loc_nb IS NOT NULL THEN
        v_label := v_loc_nb;
        v_slug := public.civic_reputation_slugify(v_loc_nb);
      END IF;
    END IF;
  END IF;

  IF v_slug IS NULL AND v_citizen_target_id IS NOT NULL THEN
    SELECT ct.slug, ct.display_name
      INTO v_target_slug, v_target_name
      FROM public.citizen_targets ct
     WHERE ct.id = v_citizen_target_id;

    IF v_target_slug IS NOT NULL THEN
      v_slug := v_target_slug;
      v_label := v_target_name;
    END IF;
  END IF;

  IF v_slug IS NULL THEN
    v_locality := public.civic_reputation_normalize_place_text(v_locality);
    IF v_locality IS NOT NULL THEN
      v_label := v_locality;
      v_slug := public.civic_reputation_slugify(v_locality);
    END IF;
  END IF;

  IF v_slug IS NULL THEN
    v_slug := 'cdmx';
    v_label := 'Ciudad de México';
  END IF;

  -- Sanitize legacy bad locality slugs
  IF v_slug IN ('locality:-', 'locality:', '-') THEN
    v_slug := 'cdmx';
    v_label := NULL;
  END IF;

  alcaldia_slug := v_slug;
  alcaldia_label := v_label;
  RETURN NEXT;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6. award_civic_reputation — reject placeholder / locality:- slugs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_civic_reputation(
  p_user_id uuid,
  p_action_type text,
  p_action_id text,
  p_points integer,
  p_domain text,
  p_alcaldia_slug text,
  p_alcaldia_label text DEFAULT NULL::text,
  p_object_id uuid DEFAULT NULL::uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_slug text;
  v_label text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_action_type NOT IN (
    'signal_stage_cosign',
    'signal_author_cosigned',
    'location_evaluation',
    'neighbor_participation',
    'sustained_presence'
  ) THEN
    RAISE EXCEPTION 'civic_reputation: forbidden action_type %', p_action_type;
  END IF;

  IF p_domain NOT IN ('agua', 'espacio_publico', 'residuos', 'desarrollo_urbano') THEN
    RAISE EXCEPTION 'civic_reputation: invalid domain %', p_domain;
  END IF;

  IF p_points IS NULL OR p_points <= 0 OR p_points > 100 THEN
    RAISE EXCEPTION 'civic_reputation: invalid points %', p_points;
  END IF;

  v_slug := coalesce(nullif(trim(p_alcaldia_slug), ''), 'cdmx');
  IF v_slug IN ('-', 'locality:-', 'locality:')
     OR (
       public.civic_reputation_normalize_place_text(v_slug) IS NULL
       AND v_slug NOT LIKE 'cdmx-%'
       AND v_slug NOT LIKE 'alcaldia-%'
       AND v_slug <> 'cdmx'
       AND v_slug NOT LIKE 'locality:%'
     )
  THEN
    v_slug := 'cdmx';
  END IF;
  IF v_slug IN ('locality:-', 'locality:') THEN
    v_slug := 'cdmx';
  END IF;

  v_label := public.civic_reputation_normalize_place_text(p_alcaldia_label);

  INSERT INTO public.civic_reputation_events (
    user_id, action_type, action_id, points, domain,
    alcaldia_slug, alcaldia_label, object_id, metadata
  ) VALUES (
    p_user_id, p_action_type, p_action_id, p_points, p_domain,
    v_slug, v_label, p_object_id, coalesce(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (user_id, action_type, action_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.civic_reputation_scores AS s (
    user_id, alcaldia_slug, domain, points, event_count, alcaldia_label, updated_at
  ) VALUES (
    p_user_id, v_slug, p_domain, p_points, 1, v_label, now()
  )
  ON CONFLICT (user_id, alcaldia_slug, domain) DO UPDATE
    SET points = s.points + excluded.points,
        event_count = s.event_count + 1,
        alcaldia_label = coalesce(excluded.alcaldia_label, s.alcaldia_label),
        updated_at = now();

  RETURN true;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. Data fixes: conscious_locations placeholders, Instagram, benefits
-- ---------------------------------------------------------------------------

-- Null out placeholder neighborhood / address
UPDATE public.conscious_locations
SET neighborhood = NULL,
    updated_at = now()
WHERE public.civic_reputation_normalize_place_text(neighborhood) IS NULL
  AND neighborhood IS NOT NULL;

UPDATE public.conscious_locations
SET address = NULL,
    updated_at = now()
WHERE public.civic_reputation_normalize_place_text(address) IS NULL
  AND address IS NOT NULL;

-- Strip leading @ (and repeated @) from Instagram handles; also strip URLs
UPDATE public.conscious_locations
SET instagram_handle = nullif(
      regexp_replace(
        regexp_replace(
          trim(both from instagram_handle),
          '^(https?://)?(www\.)?(instagram\.com|instagr\.am)/+',
          '',
          'i'
        ),
        '^@+',
        ''
      ),
      ''
    ),
    updated_at = now()
WHERE instagram_handle IS NOT NULL
  AND (
    instagram_handle ~ '^@'
    OR instagram_handle ~* 'instagram\.com/'
    OR instagram_handle ~* 'instagr\.am/'
  );

-- Spanish benefits (ES field had English)
UPDATE public.conscious_locations
SET user_benefits = 'Eventos especiales e invitaciones',
    updated_at = now()
WHERE slug = 'second-life-of-solar'
  AND user_benefits IS NOT DISTINCT FROM 'special events and invitations';

UPDATE public.conscious_locations
SET user_benefits = 'Eventos especiales',
    updated_at = now()
WHERE slug = 'cabra-de-monte'
  AND lower(trim(user_benefits)) = 'special events';

UPDATE public.conscious_locations
SET user_benefits = 'Descuentos especiales',
    updated_at = now()
WHERE slug = 'son-de-sal'
  AND lower(trim(user_benefits)) = 'special discounts';

-- EN typo: missing space around &
UPDATE public.conscious_locations
SET user_benefits_en = 'Discounts & special events',
    updated_at = now()
WHERE slug = 'acapulco-vintage-store'
  AND user_benefits_en IS NOT DISTINCT FROM 'discounts& special events';

-- ---------------------------------------------------------------------------
-- 8. Backfill civic_reputation_events alcaldía from location resolver
--    Then rebuild scores from the ledger (merge keys without double-count).
-- ---------------------------------------------------------------------------

-- Location-evaluation events: re-resolve from object_id → conscious_locations
UPDATE public.civic_reputation_events e
SET
  alcaldia_slug = coalesce(g.alcaldia_slug, 'cdmx'),
  alcaldia_label = g.alcaldia_label
FROM public.civic_reputation_resolve_location_geo(e.object_id) AS g
WHERE e.action_type = 'location_evaluation'
  AND e.object_id IS NOT NULL
  AND (
    e.alcaldia_slug IN ('locality:-', 'locality:', '-')
    OR public.civic_reputation_normalize_place_text(e.alcaldia_label) IS NULL
    OR e.alcaldia_label IS NULL
  );

-- Any remaining bad locality slugs / placeholder labels → cdmx + NULL
UPDATE public.civic_reputation_events
SET
  alcaldia_slug = 'cdmx',
  alcaldia_label = NULL
WHERE alcaldia_slug IN ('locality:-', 'locality:', '-')
   OR (
     public.civic_reputation_normalize_place_text(alcaldia_label) IS NULL
     AND alcaldia_label IS NOT NULL
   );

-- Rebuild aggregates from ledger (idempotent full refresh of scores table)
DELETE FROM public.civic_reputation_scores;

INSERT INTO public.civic_reputation_scores (
  user_id, alcaldia_slug, domain, points, event_count, alcaldia_label, updated_at
)
SELECT
  user_id,
  alcaldia_slug,
  domain,
  sum(points)::integer,
  count(*)::integer,
  max(alcaldia_label),
  max(created_at)
FROM public.civic_reputation_events
GROUP BY user_id, alcaldia_slug, domain;
