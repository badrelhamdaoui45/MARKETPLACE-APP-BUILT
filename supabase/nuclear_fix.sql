-- NUCLEAR FIX: Simplify schema to fix "Database error saving new user"

-- 1. Drop the trigger first to avoid locks/conflicts during alteration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Convert 'role' column to TEXT to eliminate Enum mismatch errors
-- This effectively removes the strict type constraint causing the crash
ALTER TABLE public.profiles ALTER COLUMN role TYPE text USING role::text;

-- 3. Ensure provider_type exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider_type text;

-- 4. Re-create the function with simple text handling (No casting needed)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, provider_type)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'buyer'), -- Default to buyer if null
    new.raw_user_meta_data->>'provider_type'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-attach trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
