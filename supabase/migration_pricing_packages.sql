
-- Create Pricing Packages table
create table public.pricing_packages (
  id uuid default uuid_generate_v4() primary key,
  photographer_id uuid references public.profiles(id) not null,
  name text not null,
  package_type text check (package_type in ('digital', 'physical')) default 'digital',
  tiers jsonb default '[]'::jsonb, -- Array of { quantity: int, unit_price: float }
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.pricing_packages enable row level security;
create policy "Photographers can view own packages" on public.pricing_packages for select using (auth.uid() = photographer_id);
create policy "Photographers can insert own packages" on public.pricing_packages for insert with check (auth.uid() = photographer_id);
create policy "Photographers can update own packages" on public.pricing_packages for update using (auth.uid() = photographer_id);
create policy "Photographers can delete own packages" on public.pricing_packages for delete using (auth.uid() = photographer_id);
