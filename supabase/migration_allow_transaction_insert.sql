
-- Allow buyers to insert their own transaction records
-- (In a real app, this should be done by a webhook using a service_role key)
create policy "Buyers can insert their own transactions" on public.transactions 
for insert with check (auth.uid() = buyer_id);
