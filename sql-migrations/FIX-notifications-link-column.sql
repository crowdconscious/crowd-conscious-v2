-- Fix: column notifications.link does not exist (42703)
-- Run this in Supabase SQL Editor if /api/notifications returns this error.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
