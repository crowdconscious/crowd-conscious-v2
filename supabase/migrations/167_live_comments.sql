-- Real-time chat for Conscious Live (inserts via API with service role; public read)

CREATE TABLE IF NOT EXISTS public.live_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_event_id uuid NOT NULL REFERENCES public.live_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  anonymous_participant_id uuid REFERENCES public.anonymous_participants(id) ON DELETE SET NULL,
  content text NOT NULL CHECK (char_length(content) <= 500 AND char_length(content) >= 1),
  author_display_name text NOT NULL,
  author_avatar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_comments_one_actor CHECK (
    (user_id IS NOT NULL AND anonymous_participant_id IS NULL)
    OR (user_id IS NULL AND anonymous_participant_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_live_comments_event_created
  ON public.live_comments (live_event_id, created_at DESC);

ALTER TABLE public.live_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read live comments"
  ON public.live_comments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Direct client inserts not used; API uses service role. No INSERT policy for anon/authenticated.

COMMENT ON TABLE public.live_comments IS 'Conscious Live chat; prefer POST /api/live/comments for validated inserts.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'live_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_comments;
  END IF;
END $$;
