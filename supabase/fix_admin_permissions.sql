
-- Allow Admins to see ALL transactions (Sales)
create policy "Admins can view all transactions"
on public.transactions
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- Also allow Admins to seeing all albums (including drafts) could be useful
create policy "Admins can view all albums"
on public.albums
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);
