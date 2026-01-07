
-- 1. Ensure all columns exist in profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Safely rename 'buyer' to 'runner' if not already done
-- We check if 'runner' exists in the enum first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'user_role' AND e.enumlabel = 'runner'
    ) THEN
        ALTER TYPE user_role RENAME VALUE 'buyer' TO 'runner';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not rename enum value, it might already be renamed or in use.';
END $$;

-- 3. Update default value for role column
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'runner'::user_role;

-- 4. Create a ROBUST handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  assigned_role public.user_role;
  raw_role text;
BEGIN
  -- Get the role from metadata
  raw_role := new.raw_user_meta_data->>'role';
  
  -- Attempt to cast the role, fallback to 'runner' if it fails or is invalid/missing
  BEGIN
    assigned_role := raw_role::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    assigned_role := 'runner'::public.user_role;
  END;

  -- Ensure we have a role if casting resulted in null
  IF assigned_role IS NULL THEN
    assigned_role := 'runner'::public.user_role;
  END IF;

  -- Insert into profiles
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    country, 
    provider_type,
    logo_url
  )
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    assigned_role,
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'provider_type',
    new.raw_user_meta_data->>'logo_url'
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Ensure the trigger is attached (it should be, but just in case)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
