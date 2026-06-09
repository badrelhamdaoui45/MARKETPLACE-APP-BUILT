-- Migration: Sync Album Pre-Subscriptions (Leads) to Resend
-- 1. Create function to POST pre-inscription info to Resend via Edge Function
CREATE OR REPLACE FUNCTION public.sync_pre_inscription_to_resend()
RETURNS TRIGGER AS $$
DECLARE
  internal_secret text := (SELECT value FROM public.platform_settings WHERE id = 'internal_sync_secret' LIMIT 1);
  -- Construct the Edge Function URL dynamically using the request host
  resend_url text := 'https://' || (SELECT split_part(current_setting('request.header.host', true), '.', 1)) || '.supabase.co/functions/v1/sync-to-resend';
  album_title text := '';
BEGIN
  -- Fetch corresponding album title to send as context/userId
  SELECT title INTO album_title FROM public.albums WHERE id = NEW.album_id;

  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    -- We use pg_net for non-blocking asynchronous HTTP POST requests
    PERFORM net.http_post(
      url := resend_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Internal-Secret', internal_secret
      ),
      body := jsonb_build_object(
        'action', 'sync-contact',
        'payload', jsonb_build_object(
          'email', NEW.email,
          'firstName', COALESCE(split_part(NEW.email, '@', 1), 'Subscriber'),
          'lastName', 'Lead',
          'userGroup', 'runner_subscriber',
          'userId', COALESCE(album_title, 'Unknown Album')
        )
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block pre-inscription signup even if the sync fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Restrict search path to public to prevent hijacking
ALTER FUNCTION public.sync_pre_inscription_to_resend() SET search_path = public;

-- 3. Create database trigger
DROP TRIGGER IF EXISTS on_pre_inscription_created_sync_resend ON public.pre_inscriptions;
CREATE TRIGGER on_pre_inscription_created_sync_resend
  AFTER INSERT ON public.pre_inscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_pre_inscription_to_resend();
