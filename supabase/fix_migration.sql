-- FIX: Ensure provider_type column exists and update trigger

-- 1. Force add column (if it fails, it means it exists, which is fine, but we use IF NOT EXISTS to be clean)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider_type text;

-- 2. Update the function again to match the column
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, provider_type)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    (new.raw_user_meta_data->>'role')::user_role,
    new.raw_user_meta_data->>'provider_type'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
