-- Migration to add bib_numbers to photos table
alter table public.photos add column if not exists bib_numbers text[] default '{}';

-- Update RLS if needed (though existing select true should cover it)
-- For searchability, we might want an index later
create index if not exists photos_bib_numbers_idx on public.photos using gin(bib_numbers);
