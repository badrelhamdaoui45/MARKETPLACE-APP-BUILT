
-- Fix: Allow authenticated users (photographers) to insert photos
create policy "Photographers can insert photos" on public.photos 
for insert with check (
  auth.role() = 'authenticated' AND
  exists (
    select 1 from public.albums 
    where id = album_id and photographer_id = auth.uid()
  )
);

-- Note: The SELECT policy 'Watermarked photos are viewable by everyone' is already there, so viewing should work after insertion succeeds.
