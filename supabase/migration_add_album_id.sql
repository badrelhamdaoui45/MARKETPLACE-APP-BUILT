
-- Fix: Add album_id to transactions to track which album is purchased
alter table public.transactions add column album_id uuid references public.albums(id);
