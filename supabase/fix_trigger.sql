
-- Fix for "Database error saving new user"
-- This update makes the trigger function more robust by:
-- 1. Setting the search_path to public (Security Definer best practice).
-- 2. defaulting the role to 'buyer' if it's missing or invalid.
-- 3. safely casting the role.

create or replace function public.handle_new_user() 
returns trigger as $$
declare
  default_role public.user_role := 'buyer';
  new_role public.user_role;
begin
  -- Try to cast the role, fallback to buyer if it fails or is null
  begin
    new_role := (new.raw_user_meta_data->>'role')::public.user_role;
  exception when others then
    new_role := default_role;
  end;

  if new_role is null then
    new_role := default_role;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new_role
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
