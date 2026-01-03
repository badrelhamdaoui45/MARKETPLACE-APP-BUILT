-- ROBUST FIX: Re-create trigger with safe casting

-- 1. Ensure column exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider_type text;

-- 2. Drop existing objects to ensure clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Re-create function with safe Enum handling
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  var_role user_role;
BEGIN
  -- Safely determine role to avoid Enum casting errors
  BEGIN
    var_role := (new.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    var_role := 'buyer'::user_role; -- Fallback
  END;

  INSERT INTO public.profiles (id, email, full_name, role, provider_type)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    var_role,
    new.raw_user_meta_data->>'provider_type'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
