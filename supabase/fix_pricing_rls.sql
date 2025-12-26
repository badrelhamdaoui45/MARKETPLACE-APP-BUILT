
-- Fix RLS policy to allow Buyers to see Pricing Packages
drop policy if exists "Photographers can view own packages" on public.pricing_packages;

-- Allow everyone to view pricing packages (needed for Public Album View)
create policy "Pricing packages are viewable by everyone" 
on public.pricing_packages for select 
using (true);
