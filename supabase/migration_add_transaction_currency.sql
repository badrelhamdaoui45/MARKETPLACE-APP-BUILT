-- Add currency column to transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- Comment on column
COMMENT ON COLUMN public.transactions.currency IS 'The currency used for this transaction';
