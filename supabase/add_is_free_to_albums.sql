-- Add is_free column to albums table
ALTER TABLE albums ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;

-- Optional: Index for filtering free albums
CREATE INDEX IF NOT EXISTS idx_albums_is_free ON albums(is_free);
