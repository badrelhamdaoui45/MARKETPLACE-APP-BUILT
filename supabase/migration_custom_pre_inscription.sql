-- Migration: Add custom pre-inscription content
-- Fixed to use standard PostgreSQL syntax

ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS pre_inscription_title TEXT;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS pre_inscription_description TEXT;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS pre_inscription_cover_url TEXT;
