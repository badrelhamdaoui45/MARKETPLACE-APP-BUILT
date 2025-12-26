
-- Force update RLS policy for Transactions to ensure Photographer visibility
drop policy if exists "Users can view their own transactions" on public.transactions;

create policy "Users can view their own transactions" 
on public.transactions for select 
using (
  auth.uid() = buyer_id 
  or 
  auth.uid() = photographer_id
);

-- Also ensure Insert is allowed for authenticated users (Buyers create transactions)
drop policy if exists "Buyers can create transactions" on public.transactions;
create policy "Buyers can create transactions" 
on public.transactions for insert 
with check (auth.role() = 'authenticated');
