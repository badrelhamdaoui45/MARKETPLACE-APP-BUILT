
-- 1. Support guest checkout by allowing buyer_id to be NULL
alter table public.transactions alter column buyer_id drop not null;

-- 2. Allow public insert (for client-side recording of transactions)
drop policy if exists "Public can insert transactions" on public.transactions;
drop policy if exists "Allow transaction insertion for everyone" on public.transactions;
create policy "Allow transaction insertion for everyone" 
on public.transactions for insert 
with check (true);

-- 3. Allow public select via Stripe Session ID (Guest Access)
drop policy if exists "Public can view their own guest transactions" on public.transactions;
drop policy if exists "View transactions by owner or session" on public.transactions;
create policy "View transactions by owner or session" 
on public.transactions for select 
using (
  auth.uid() = buyer_id 
  or 
  auth.uid() = photographer_id
  or
  stripe_payment_intent_id is not null -- Allows querying by session_id in the URL
);
