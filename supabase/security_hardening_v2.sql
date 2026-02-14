-- ==========================================
-- SECURITY HARDENING: PHASE 2
-- ==========================================

-- 1. CLEANUP PUBLIC PROFILES
-- Even though some code may rely on these, they should be in photographer_private_data.
-- We already moved the data, so let's remove the leakage risk.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS bank_name;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS account_holder;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS bank_code;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS account_number;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS rib;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS bank_details;

-- 2. HARDEN TRANSACTIONS RLS
-- The current policy 'Enable update of payment_proof_url for anyone' is too broad.
DROP POLICY IF EXISTS "Enable update of payment_proof_url for anyone" ON public.transactions;

-- Only the buyer should be able to update their own transaction's proof.
-- If it's a guest purchase, we rely on the stripe_payment_intent_id (session) which the frontend has.
-- Note: Guest updates are harder with standard RLS if they don't have a JWT. 
-- However, we should at least protect authenticated users.
CREATE POLICY "Users can update their own payment proof" ON public.transactions
    FOR UPDATE 
    USING (auth.uid() = buyer_id)
    WITH CHECK (auth.uid() = buyer_id);

-- 3. FIX FUNCTION SEARCH PATHS (PREVENT HIJACKING)
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.sync_profile_to_loops() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 4. RESTRICT PLATFORM SETTINGS
-- Ensure only admins can see/edit settings if they aren't already.
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins manage platform settings" ON public.platform_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
