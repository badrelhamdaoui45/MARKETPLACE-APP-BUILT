
-- Add referencing column to albums
alter table public.albums add column pricing_package_id uuid references public.pricing_packages(id);
