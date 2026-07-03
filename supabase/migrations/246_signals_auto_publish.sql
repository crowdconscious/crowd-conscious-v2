-- Signals auto-publish on submit (2026-07-02)
--
-- New signals go live immediately via POST /api/signals. The
-- pending_review status is retained for post-publish moderation:
-- admin unpublish, report auto-repend trigger, needs_edit, reject.

ALTER TABLE public.citizen_signals
  ALTER COLUMN publication_status SET DEFAULT 'published';

COMMENT ON COLUMN public.citizen_signals.publication_status IS
  'Lifecycle: draft | pending_review (reported/unpublished) | needs_edit | published | rejected | archived | disputed. New submits default to published.';
