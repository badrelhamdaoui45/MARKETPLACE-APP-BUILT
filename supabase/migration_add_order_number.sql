-- Add order_number column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Create a unique index for order_number to ensure no duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_order_number ON public.transactions(order_number);
