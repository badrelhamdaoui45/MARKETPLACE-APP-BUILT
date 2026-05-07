-- 1. Add bank_accounts JSONB column to photographer_private_data
ALTER TABLE public.photographer_private_data ADD COLUMN IF NOT EXISTS bank_accounts JSONB DEFAULT '[]'::jsonb;

-- 2. Create bank-logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-logos', 'bank-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies for bank-logos bucket

-- Allow public read access to bank logos
DROP POLICY IF EXISTS "Public Access to Bank Logos" ON storage.objects;
CREATE POLICY "Public Access to Bank Logos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'bank-logos');

-- Allow authenticated users (photographers) to upload their own logos
DROP POLICY IF EXISTS "Photographers can upload bank logos" ON storage.objects;
CREATE POLICY "Photographers can upload bank logos" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'bank-logos' AND 
    auth.role() = 'authenticated'
);

-- Allow users to update/delete their own uploaded logos
DROP POLICY IF EXISTS "Photographers can update own bank logos" ON storage.objects;
CREATE POLICY "Photographers can update own bank logos" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'bank-logos' AND 
    auth.uid() = owner
);

DROP POLICY IF EXISTS "Photographers can delete own bank logos" ON storage.objects;
CREATE POLICY "Photographers can delete own bank logos" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'bank-logos' AND 
    auth.uid() = owner
);
