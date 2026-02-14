-- ==========================================
-- SECURITY PATCH: Role Escalation & Data Lockdown
-- ==========================================

-- 1. FIX ROLE ESCALATION IN SIGNUP TRIGGER
-- Prevents users from self-promoting to 'admin' during registration.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  raw_role text;
  assigned_role user_role;
BEGIN
  raw_role := new.raw_user_meta_data->>'role';
  
  -- STRICT VALIDATION: Only allow 'photographer' to be explicitly set.
  -- Everything else (including 'admin', null, or invalid strings) defaults to 'runner'.
  IF raw_role = 'photographer' THEN
    assigned_role := 'photographer';
  ELSE
    assigned_role := 'runner';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', assigned_role);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. LOCKDOWN PROFILES TABLE
-- Ensure sensitive financial identifiers are only viewable by the user themselves or admins.
-- These were moved to photographer_private_data in a previous migration, 
-- so we can safely strip them from the public profiles table.

ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_account_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS bank_details;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS bank_transfer_enabled;

-- 3. ENSURE STRATEGIC RLS ON PRIVATE DATA
-- Confirm the private data table is locked down
ALTER TABLE public.photographer_private_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Private data owner access" ON public.photographer_private_data;
CREATE POLICY "Private data owner access" ON public.photographer_private_data
    FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin view private data" ON public.photographer_private_data;
CREATE POLICY "Admin view private data" ON public.photographer_private_data
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
