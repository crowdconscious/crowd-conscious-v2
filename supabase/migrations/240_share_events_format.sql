-- Migration 240 — share_events.format
--
-- Adds the artifact dimension to share analytics per
-- docs/SHARE-CARDS-STRATEGY-2026-06-09.md §8: 'link' (tappable URL —
-- WhatsApp, X, clipboard, native sheet) vs 'png' (story/card image).
-- Together with the existing `channel` column and inbound UTM attribution
-- this measures share→click conversion per artifact type.
--
-- Nullable on purpose: existing rows and older clients that don't send
-- `format` are unaffected.

ALTER TABLE public.share_events
  ADD COLUMN IF NOT EXISTS format text
    CHECK (format IS NULL OR format IN ('link', 'png'));

COMMENT ON COLUMN public.share_events.format IS
  'Artifact that left the device: ''link'' (tappable URL) or ''png'' (story/card image). Null for legacy rows and clients that predate the column.';
