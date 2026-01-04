-- Fix for error 42P10 when upserting popups by album_id
-- Adds a unique constraint to ensure only one popup exists per album
-- and allows Supabase to resolve conflicts during upsert.

ALTER TABLE public.popups 
ADD CONSTRAINT unique_album_popup UNIQUE (album_id);
