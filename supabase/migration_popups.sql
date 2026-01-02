
-- 1. Create Popups Table
create table public.popups (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  message text not null,
  image_url text,
  button_text text default 'View Details',
  button_link text,
  is_active boolean default true,
  display_delay integer default 2000, -- Delay in ms before showing
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. RLS for Popups
alter table public.popups enable row level security;
create policy "Popups are viewable by everyone" on public.popups for select using (true);
create policy "Only admins can manage popups" on public.popups for all using (
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'admin'
  )
);

-- 3. Insert a sample popup
insert into public.popups (title, message, image_url, button_text, button_link)
values (
  'Welcome to CaptureRun!', 
  'Explore professional photo collections from top photographers. Get 10% off on your first full album purchase today.',
  'https://images.unsplash.com/photo-1554080353-a576cf803bda?auto=format&fit=crop&q=80&w=1000',
  'Explore Albums',
  '/albums'
);
