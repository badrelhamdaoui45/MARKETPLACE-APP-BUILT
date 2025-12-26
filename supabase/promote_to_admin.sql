
-- Replace 'YOUR_EMAIL_HERE' with the email address of the user you want to be Admin
-- Run this in the Supabase SQL Editor

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'YOUR_EMAIL_HERE';

-- Check if it worked
SELECT * FROM public.profiles WHERE role = 'admin';
