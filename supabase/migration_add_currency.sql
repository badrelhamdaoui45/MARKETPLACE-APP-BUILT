-- Add currency column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Update existing profiles to have USD if null
UPDATE public.profiles SET currency = 'USD' WHERE currency IS NULL;
