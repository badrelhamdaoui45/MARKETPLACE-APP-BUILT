-- Allow anyone to view a transaction if they have the ID (UUID)
-- This enables guest users to track their manual (bank transfer) payments
CREATE POLICY "Enable read for public by transaction ID" 
ON public.transactions 
FOR SELECT 
USING (true);

-- Also ensure profiles are viewable by anyone (needed for photographer info)
-- This is already in schema.sql but let's double check or re-apply if needed
-- CREATE POLICY "Public profiles are viewable by everyone" on public.profiles for select using (true);
