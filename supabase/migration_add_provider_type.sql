-- Migration: Add provider_type to profiles and update trigger

-- 1. Add provider_type column if it doesn't exist
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'provider_type') then
        alter table public.profiles add column provider_type text;
    end if;
end $$;

-- 2. Update handle_new_user function to include provider_type
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, provider_type)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    (new.raw_user_meta_data->>'role')::user_role,
    new.raw_user_meta_data->>'provider_type'
  );
  return new;
end;
$$ language plpgsql security definer;
