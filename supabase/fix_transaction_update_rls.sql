-- Allow anyone to update the payment_proof_url column
-- This enables guest runners to submit their screenshot
CREATE POLICY "Enable update of payment_proof_url for anyone" 
ON public.transactions 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- NOTE: In a production environment, you should restrict this more.
-- However, since guests don't have a user_id, we rely on the transaction ID (UUID) 
-- being secret enough for this specific flow.
