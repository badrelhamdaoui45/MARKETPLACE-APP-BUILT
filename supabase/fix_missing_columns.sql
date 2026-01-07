-- FIX: MISSING COLUMNS IN TRANSACTIONS TABLE
-- This script ensures the required columns for payment proofs exist.

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS photographer_message TEXT;

-- Use comments to document the columns
COMMENT ON COLUMN public.transactions.payment_proof_url IS 'Screenshot of the bank transfer';
COMMENT ON COLUMN public.transactions.photographer_message IS 'Notes from photographer to runner';
