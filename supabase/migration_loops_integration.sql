-- Create a table for platform-wide settings (API keys, config)
create table if not exists public.platform_settings (
    id text primary key, -- e.g., 'loops_api_key', 'stripe_publishable_key'
    value text, -- The actual key/value
    description text, -- Optional description
    is_encrypted boolean default false, -- Flag if we implement encryption later
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.platform_settings enable row level security;

-- Policies
-- 1. Admins can view everything
create policy "Admins can view platform settings"
    on public.platform_settings
    for select
    using (
        auth.uid() in (
            select id from public.profiles where role = 'admin'
        )
    );

-- 2. Admins can insert/update
create policy "Admins can manage platform settings"
    on public.platform_settings
    for all
    using (
        auth.uid() in (
            select id from public.profiles where role = 'admin'
        )
    );

-- 3. No public access (Buyers/Photographers cannot see your API keys)
