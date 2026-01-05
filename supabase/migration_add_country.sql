
-- Migration: Add country field for photographers
-- This field will allow photographers to specify their location.

-- Add column if it doesn't exist
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'country') then
        alter table public.profiles add column country text;
    end if;
end $$;

-- Update the handle_new_user trigger function to include country
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, country)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    (new.raw_user_meta_data->>'role')::user_role,
    new.raw_user_meta_data->>'country'
  );
  return new;
end;
$$ language plpgsql security definer;
