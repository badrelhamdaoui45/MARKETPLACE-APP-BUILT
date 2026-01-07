-- DIAGNOSTIC & FORCE FIX
-- Run this and check the output in Supabase

-- 1. Aggressively ensure columns exist
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.transactions ADD COLUMN payment_proof_url TEXT;
        RAISE NOTICE 'Column payment_proof_url added successfully.';
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Column payment_proof_url already exists.';
    END;

    BEGIN
        ALTER TABLE public.transactions ADD COLUMN photographer_message TEXT;
        RAISE NOTICE 'Column photographer_message added successfully.';
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'Column photographer_message already exists.';
    END;
END $$;

-- 2. Force Cache Refresh (Dummy RLS update)
-- This usually triggers PostgREST to reload the schema
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. Check current columns (for user to verify in output)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('payment_proof_url', 'photographer_message');
