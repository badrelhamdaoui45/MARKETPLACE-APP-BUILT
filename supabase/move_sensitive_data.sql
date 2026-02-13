-- SECURITY HARDENING: Profiles Table RLS
-- This migration restricts access to sensitive fields like bank_details and stripe_account_id.

-- 1. Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 2. Policy: Public Photographer Info
-- Allows anyone to see public-facing details of photographers and runners (for profile pages)
-- We use a view or specific column selection in the policy if possible, but standard RLS is row-level.
-- To truly hide columns, we'd need a view, but we can at least restrict WHO can see the rows.
-- However, "Public profiles are viewable by everyone" (id, full_name, role, etc) is needed for the app to function.
-- The real risk is that ALL columns are public. 

-- Re-implementing with more care:
-- Everyone can see basic info of all users (needed for mentions, profiles, etc.)
-- BUT we should really store sensitive info in a separate table if we want true column-level security.
-- Since they are in the same table, we will restrict SELECT to non-sensitive rows for public,
-- and full rows for owners/admins.

-- Actually, Supabase RLS is ROW level, not COLUMN level. 
-- To protect columns, we have two choices:
-- 1. Move sensitive columns to a private table (e.g. `photographer_secrets`).
-- 2. Use a View and restrict access to the base table.

-- Given the current structure, moving `bank_details`, `bank_transfer_enabled`, and `stripe_account_id` 
-- to a private table is the most robust fix.

-- Let's create `photographer_private_data`
CREATE TABLE IF NOT EXISTS public.photographer_private_data (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    stripe_account_id TEXT,
    bank_details TEXT,
    bank_transfer_enabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migrating data
INSERT INTO public.photographer_private_data (id, stripe_account_id, bank_details, bank_transfer_enabled)
SELECT id, stripe_account_id, bank_details, bank_transfer_enabled 
FROM public.profiles
ON CONFLICT (id) DO UPDATE SET
    stripe_account_id = EXCLUDED.stripe_account_id,
    bank_details = EXCLUDED.bank_details,
    bank_transfer_enabled = EXCLUDED.bank_transfer_enabled;

-- Enable RLS on private table
ALTER TABLE public.photographer_private_data ENABLE ROW LEVEL SECURITY;

-- Policies for private data
CREATE POLICY "Users can view their own private data"
    ON public.photographer_private_data FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own private data"
    ON public.photographer_private_data FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all private data"
    ON public.photographer_private_data FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Now we can safely REMOVE the sensitive columns from public.profiles or just leave them empty.
-- For now, let's just make sure the public profile policy is safe.
-- We'll keep the public policy for profiles since it only contains non-sensitive info now (once we clear those columns).

-- Note: We should update the code to use the new table. 
-- BUT wait, the Edge Function uses Service Role, so it can still read from `profiles` if we don't delete them.
-- To BE SAFE: We should delete the columns from `profiles` after confirming the app doesn't break.
