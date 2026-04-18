-- ============================================================
-- 200: Conscious Live — data cleanup
--   • Strip emojis from event titles + translations (moon, flags,
--     soccer, etc.) so /live renders consistently across platforms.
--   • Deduplicate scheduled live_events with identical (team_a_name,
--     team_b_name, day(match_date)) by cancelling the stale one.
--   • Migrate flag emoji strings to NULL when team_a_flag /
--     team_b_flag still hold an emoji fallback — the UI now falls
--     back to a neutral icon when these are empty.
-- Safe to run multiple times; all ops are idempotent + gated.
-- ============================================================

BEGIN;

-- ----------------------------------------------------------------
-- 1. Strip problematic emojis/pictographs from titles
-- ----------------------------------------------------------------

-- Regex: common pictographic / symbol ranges + flag regional indicators.
-- Intentionally targeted — we only strip the ornamental glyphs the
-- product team flagged, not the full unicode emoji block.
WITH stripped AS (
  SELECT
    id,
    -- Moon, flag sequences, soccer, film, building, megaphone, tag, red circle.
    regexp_replace(
      title,
      -- Single codepoints we explicitly ban in titles:
      E'[\\U0001F311\\U0001F534\\U000026BD\\U0001F3F7\\U0001F3DB\\U0001F3AC\\U0001F4E3]',
      '',
      'g'
    ) AS title_no_symbols
  FROM public.live_events
)
UPDATE public.live_events le
SET title = btrim(regexp_replace(s.title_no_symbols, '\s+', ' ', 'g'))
FROM stripped s
WHERE le.id = s.id
  AND le.title IS DISTINCT FROM btrim(regexp_replace(s.title_no_symbols, '\s+', ' ', 'g'));

-- Same clean-up applied to translations.{es,en,...}.title fields.
DO $$
DECLARE r record;
DECLARE lang text;
DECLARE cur_title text;
DECLARE cleaned text;
DECLARE new_translations jsonb;
BEGIN
  FOR r IN SELECT id, translations FROM public.live_events WHERE translations IS NOT NULL LOOP
    new_translations := r.translations;
    FOR lang IN SELECT jsonb_object_keys(r.translations) LOOP
      cur_title := COALESCE((r.translations -> lang ->> 'title'), '');
      IF cur_title <> '' THEN
        cleaned := btrim(regexp_replace(
          regexp_replace(
            cur_title,
            E'[\\U0001F311\\U0001F534\\U000026BD\\U0001F3F7\\U0001F3DB\\U0001F3AC\\U0001F4E3]',
            '',
            'g'
          ),
          '\s+', ' ', 'g'
        ));
        IF cleaned <> cur_title THEN
          new_translations := jsonb_set(
            new_translations,
            ARRAY[lang, 'title'],
            to_jsonb(cleaned),
            true
          );
        END IF;
      END IF;
    END LOOP;
    IF new_translations IS DISTINCT FROM r.translations THEN
      UPDATE public.live_events SET translations = new_translations WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------
-- 2. Clear flag emoji strings so the UI renders the neutral icon.
--    Keeps image URLs intact; only nukes pure-emoji fallbacks.
-- ----------------------------------------------------------------
UPDATE public.live_events
SET team_a_flag = NULL
WHERE team_a_flag IS NOT NULL
  AND team_a_flag NOT ILIKE 'http%'
  AND length(team_a_flag) <= 12;

UPDATE public.live_events
SET team_b_flag = NULL
WHERE team_b_flag IS NOT NULL
  AND team_b_flag NOT ILIKE 'http%'
  AND length(team_b_flag) <= 12;

-- ----------------------------------------------------------------
-- 3. Deduplicate same-day (team_a, team_b) scheduled events.
--    Strategy: keep the row with the most recent updated_at; cancel
--    the others. Never touches completed/live events.
-- ----------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    team_a_name,
    team_b_name,
    date_trunc('day', match_date) AS match_day,
    status,
    row_number() OVER (
      PARTITION BY
        lower(coalesce(team_a_name, '')),
        lower(coalesce(team_b_name, '')),
        date_trunc('day', match_date)
      ORDER BY updated_at DESC, created_at DESC
    ) AS rn
  FROM public.live_events
  WHERE team_a_name IS NOT NULL
    AND team_b_name IS NOT NULL
    AND status IN ('scheduled', 'cancelled')
)
UPDATE public.live_events le
SET status = 'cancelled', updated_at = now()
FROM ranked r
WHERE le.id = r.id
  AND r.rn > 1
  AND le.status = 'scheduled';

COMMIT;
