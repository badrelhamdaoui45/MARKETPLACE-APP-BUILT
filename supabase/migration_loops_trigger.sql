-- 1. Create a function to sync users to Loops via the Edge Function
create or replace function public.sync_profile_to_loops()
returns trigger as $$
declare
  -- You must set this secret in your Edge Function and pass it here
  -- For security, this should NOT be exposed to the frontend.
  internal_secret text := (select value from public.platform_settings where id = 'internal_sync_secret' limit 1);
  -- Use a generic base URL that works in Supabase
  loops_url text := 'https://' || (select split_part(current_setting('request.header.host', true), '.', 1)) || '.supabase.co/functions/v1/sync-to-loops';
begin
  -- Only sync if it's a new profile or if email/role changed (though usually role is only set once at start)
  -- We use pg_net for non-blocking HTTP calls
  perform net.http_post(
    url := loops_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', internal_secret
    ),
    body := jsonb_build_object(
      'action', 'sync-contact',
      'payload', jsonb_build_object(
        'email', new.email,
        'firstName', split_part(new.full_name, ' ', 1),
        'lastName', substr(new.full_name, length(split_part(new.full_name, ' ', 1)) + 2),
        'userGroup', new.role,
        'userId', new.id
      )
    )
  );
  return new;
exception when others then
  -- Do not block registration if email sync fails
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the trigger
drop trigger if exists on_profile_created_sync_loops on public.profiles;
create trigger on_profile_created_sync_loops
  after insert on public.profiles
  for each row execute function public.sync_profile_to_loops();

-- 3. Cleanup sensitive credentials from database
-- These are now managed via Supabase Secrets
delete from public.platform_settings where id in ('loops_api_key', 'gemini_api_key');

-- OPTIONAL: Add the internal secret for the trigger (Admin should set this)
-- insert into public.platform_settings (id, value, description) 
-- values ('internal_sync_secret', 'generate-a-long-random-string-here', 'Secret for DB to Edge Function communication')
-- on conflict (id) do nothing;
