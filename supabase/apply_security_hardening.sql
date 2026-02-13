-- ==========================================
-- SECURITY HARDENING CONSOLIDATED MIGRATION
-- ==========================================

-- 1. SECURE PLATFORM SETTINGS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins only access settings" ON public.platform_settings;
CREATE POLICY "Admins only access settings" ON public.platform_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 2. SECURE STORAGE BUCKETS
UPDATE storage.buckets SET public = false WHERE id = 'original-photos';

-- Allow individuals to upload to their own folders, but restrict viewing
DROP POLICY IF EXISTS "Original Photos Owner and Admin View" ON storage.objects;
CREATE POLICY "Original Photos Owner and Admin View" 
ON storage.objects FOR SELECT 
USING ( 
    bucket_id = 'original-photos' 
    AND (
        auth.uid() = owner 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
);

-- 3. PRIVATE PHOTOGRAPHER DATA TABLE
CREATE TABLE IF NOT EXISTS public.photographer_private_data (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    stripe_account_id TEXT,
    bank_details TEXT,
    bank_transfer_enabled BOOLEAN DEFAULT false,
    bank_name TEXT,
    account_holder TEXT,
    bank_code TEXT,
    account_number TEXT,
    rib TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.photographer_private_data ENABLE ROW LEVEL SECURITY;

-- Only owner can read/write
DROP POLICY IF EXISTS "Private data owner access" ON public.photographer_private_data;
CREATE POLICY "Private data owner access" ON public.photographer_private_data
    FOR ALL USING (auth.uid() = id);

-- Admin can read
DROP POLICY IF EXISTS "Admin view private data" ON public.photographer_private_data;
CREATE POLICY "Admin view private data" ON public.photographer_private_data
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. MIGRATE DATA (RUN ONCE)
INSERT INTO public.photographer_private_data (
    id, stripe_account_id, bank_details, bank_transfer_enabled, 
    bank_name, account_holder, bank_code, account_number, rib
)
SELECT 
    id, stripe_account_id, bank_details, bank_transfer_enabled, 
    bank_name, account_holder, bank_code, account_number, rib 
FROM public.profiles
WHERE role = 'photographer'
ON CONFLICT (id) DO UPDATE SET 
    stripe_account_id = EXCLUDED.stripe_account_id,
    bank_details = EXCLUDED.bank_details,
    bank_transfer_enabled = EXCLUDED.bank_transfer_enabled,
    bank_name = EXCLUDED.bank_name,
    account_holder = EXCLUDED.account_holder,
    bank_code = EXCLUDED.bank_code,
    account_number = EXCLUDED.account_number,
    rib = EXCLUDED.rib;

-- 5. SECURE PROFILES TABLE (OPTIONAL but RECOMMENDED: Deprecate sensitive columns)
-- Note: Do NOT drop columns until you confirmed AuthContext.jsx is deployed and working.
-- COMMENT ON COLUMN public.profiles.stripe_account_id IS 'DEPRECATED: Use photographer_private_data instead';
