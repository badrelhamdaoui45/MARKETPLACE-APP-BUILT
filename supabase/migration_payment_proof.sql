-- Add payment proof and messaging fields to transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS photographer_message TEXT;

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for payment-proofs
-- 1. Anyone can view (to allow photographer and guest runner to see it)
CREATE POLICY "Payment proofs are publicly viewable" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'payment-proofs');

-- 2. Anyone can upload (to allow guest runners)
-- In production, you might want to restrict this more, but for now we follow the guest-friendly approach
CREATE POLICY "Anyone can upload payment proofs" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'payment-proofs');

-- Add comment
COMMENT ON COLUMN public.transactions.payment_proof_url IS 'URL of the screenshot/proof of payment uploaded by the runner';
COMMENT ON COLUMN public.transactions.photographer_message IS 'Message from the photographer to the runner regarding the payment status';
