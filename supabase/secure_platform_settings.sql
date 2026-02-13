-- SECURITY HARDENING: Platform Settings
-- This migration ensures that sensitive API keys are never leaked to non-admin users.

-- 1. Ensure RLS is enabled
alter table public.platform_settings enable row level security;

-- 2. Drop existing policies to start fresh
drop policy if exists "Admins can view platform settings" on public.platform_settings;
drop policy if exists "Admins can manage platform settings" on public.platform_settings;

-- 3. Policy: ONLY Admins can see or manage these settings
-- This prevents Photographers and Runners from reading your secret keys via the browser.
create policy "Admin platform settings control"
    on public.platform_settings
    for all
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

-- 4. Explicitly deny all other access
-- (Default behavior of RLS when no policy matches)

-- NOTE: Supabase Edge Functions bypass RLS when using the Service Role key, 
-- allowing them to securely read these settings without exposing them to the frontend.
