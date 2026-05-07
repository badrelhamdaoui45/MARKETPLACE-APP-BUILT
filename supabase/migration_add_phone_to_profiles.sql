-- 1. Add phone column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Update the handle_new_user trigger function to include phone
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
    phone,
    full_name, 
    role, 
    country, 
    provider_type,
    logo_url
  )
  VALUES (
    new.id, 
    new.email, 
    new.phone, -- This grabs the phone number from the auth.users table
    new.raw_user_meta_data->>'full_name', 
    assigned_role,
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'provider_type',
    new.raw_user_meta_data->>'logo_url'
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
