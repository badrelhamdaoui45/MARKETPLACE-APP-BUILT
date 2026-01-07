-- FORCE BUCKET CREATION (RECOVERY SCRIPT)
-- Run this if you see "Bucket not found" error

DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'payment-proofs', 
        'payment-proofs', 
        true, 
        5242880, -- 5MB limit
        '{image/jpeg,image/png,image/webp,image/jpg}'
    )
    ON CONFLICT (id) DO UPDATE SET 
        public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
END $$;

-- Drop existing policies to avoid conflicts during re-run
DROP POLICY IF EXISTS "Payment proofs are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload payment proofs" ON storage.objects;

-- 1. Anyone can view (to allow photographer and guest runner to see it)
CREATE POLICY "Payment proofs are publicly viewable" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'payment-proofs');

-- 2. Anyone can upload (to allow guest runners)
CREATE POLICY "Anyone can upload payment proofs" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'payment-proofs');

-- Ensure the objects table has RLS enabled (it usually is by default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
