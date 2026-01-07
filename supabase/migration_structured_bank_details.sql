-- Add structured bank details to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_holder TEXT,
ADD COLUMN IF NOT EXISTS bank_code TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS rib TEXT;

-- Update the comments for clarity
COMMENT ON COLUMN public.profiles.bank_name IS 'Name of the bank for manual transfers';
COMMENT ON COLUMN public.profiles.account_holder IS 'Full name of the account holder';
COMMENT ON COLUMN public.profiles.bank_code IS 'Bank code / Sort code';
COMMENT ON COLUMN public.profiles.account_number IS 'Bank account number';
COMMENT ON COLUMN public.profiles.rib IS 'RIB / IBAN / Swift';
