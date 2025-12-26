
-- Add unlocked_photo_ids column to transactions table to track specific photo purchases
alter table public.transactions 
add column unlocked_photo_ids uuid[] default null;
