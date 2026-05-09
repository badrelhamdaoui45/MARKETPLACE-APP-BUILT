-- Add language column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Update existing profiles to have en if null
UPDATE public.profiles SET language = 'en' WHERE language IS NULL;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
