
-- Allow buyers to read objects in 'original-photos' IF they have a paid transaction for the album (folder)
create policy "Buyers can download purchased originals"
on storage.objects for select
to authenticated
using (
  bucket_id = 'original-photos'
  and exists (
    select 1 from public.transactions
    where transactions.buyer_id = auth.uid()
    -- Assumes object name format is "album_id/filename"
    and transactions.album_id::text = split_part(name, '/', 1)
  )
);
