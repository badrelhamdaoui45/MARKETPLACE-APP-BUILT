-- 1. Drop the old Loops.so trigger and function if they exist
DROP TRIGGER IF EXISTS on_profile_created_sync_loops ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_profile_to_loops();

-- 2. Create the new Resend.com sync function
CREATE OR REPLACE FUNCTION public.sync_profile_to_resend()
RETURNS TRIGGER AS $$
DECLARE
  internal_secret text := (SELECT value FROM public.platform_settings WHERE id = 'internal_sync_secret' LIMIT 1);
  -- Construct the Edge Function URL dynamically using the request host
  resend_url text := 'https://' || (SELECT split_part(current_setting('request.header.host', true), '.', 1)) || '.supabase.co/functions/v1/sync-to-resend';
BEGIN
  -- We use pg_net for non-blocking asynchronous HTTP POST requests to our Edge Function
  PERFORM net.http_post(
    url := resend_url,
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
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block user registration even if the email marketing sync fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply security hardening: restrict search path to public to prevent hijacking
ALTER FUNCTION public.sync_profile_to_resend() SET search_path = public;

-- 4. Establish the trigger for profile creation
CREATE TRIGGER on_profile_created_sync_resend
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_resend();

-- 5. Cleanup any leftover loops configuration keys from platform_settings
DELETE FROM public.platform_settings WHERE id = 'loops_api_key';
