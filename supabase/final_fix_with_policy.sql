-- ULTRA COMPREHENSIVE FIX: Handle ALL policy dependencies and schema updates

-- 1. DROP ALL DEPENDENT POLICIES (Must be done first)
DROP POLICY IF EXISTS "Only admins can manage popups" ON public.popups;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all albums" ON public.albums;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. ALTER SCHEMA
-- Convert role to TEXT to allow flexible values (removes Enum dependency)
ALTER TABLE public.profiles ALTER COLUMN role TYPE text USING role::text;

-- Ensure provider_type exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider_type text;

-- 3. RE-CREATE FUNCTION & TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, provider_type)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'buyer'), 
    new.raw_user_meta_data->>'provider_type'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. RESTORE ALL POLICIES
-- Re-create policies using TEXT comparison (fully compatible)

-- Policy 1: Popups
CREATE POLICY "Only admins can manage popups" ON public.popups FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy 2: Transactions
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy 3: Albums
CREATE POLICY "Admins can view all albums" ON public.albums FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
