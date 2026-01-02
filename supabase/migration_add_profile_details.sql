
-- Migration: Add profile details for photographers
-- These fields will allow photographers to share more contact information on their public profile.

-- Add columns if they don't exist
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'whatsapp') then
        alter table public.profiles add column whatsapp text;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'website') then
        alter table public.profiles add column website text;
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'bio') then
        alter table public.profiles add column bio text;
    end if;
end $$;

-- Update RLS policies (They should already allow update by owner, but let's be sure)
-- "Users can update their own profile" is already in schema.sql
