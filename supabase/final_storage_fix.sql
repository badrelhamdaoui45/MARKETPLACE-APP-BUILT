-- FINAL BULLETPROOF RLS FIX 
-- This script tries to apply the policies even if previous ones were messed up.

DO $$
BEGIN
    -- Try to drop policies if they exist (ignore errors if permission denied or missing)
    BEGIN
        DROP POLICY IF EXISTS "Public Access" ON storage.objects;
        DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
        DROP POLICY IF EXISTS "Public Select" ON storage.objects;
        DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
        DROP POLICY IF EXISTS "Allow public select" ON storage.objects;
        DROP POLICY IF EXISTS "Allow public insert" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Could not drop some policies, continuing...';
    END;

    -- Create new broad policies
    BEGIN
        CREATE POLICY "payment_proof_select" 
        ON storage.objects FOR SELECT 
        TO public 
        USING ( bucket_id = 'payment-proofs' );
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Could not create select policy, continuing...';
    END;

    BEGIN
        CREATE POLICY "payment_proof_insert" 
        ON storage.objects FOR INSERT 
        TO public 
        WITH CHECK ( bucket_id = 'payment-proofs' );
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Could not create insert policy, continuing...';
    END;

END $$;
