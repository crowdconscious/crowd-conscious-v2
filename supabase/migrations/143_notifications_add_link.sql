-- Fix: notifications.link column missing (causes 42703 error in /api/notifications)
-- Migration 134 defines it, but some deployments may have created the table without it.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
