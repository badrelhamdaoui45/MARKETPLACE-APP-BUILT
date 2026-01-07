
-- Migration: Add slug column to albums
-- This migration adds a slug column and populates it based on the title.

-- 1. Add the column
ALTER TABLE albums ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Create a function to slugify text in Postgres (if needed, or just use a simple replace)
-- For a simple one-time update, we can use regexp_replace
UPDATE albums 
SET slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')) 
WHERE slug IS NULL;

-- 3. (Optional) Make slug unique per photographer or globally
-- If titles are unique per photographer, we might want to enforce that here.
-- ALTER TABLE albums ADD CONSTRAINT albums_slug_key UNIQUE (slug);
