-- SIMPLIFIED SQL (Avoids permission errors on system tables)
-- Run this to create the bucket via SQL

INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Policies on storage.objects should work if you have permissions 
-- to manage your own policies (usually yes in Supabase SQL editor)

CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'payment-proofs' );

CREATE POLICY "Public Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'payment-proofs' );
