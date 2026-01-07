
-- 1. Update Profiles table for Bank Transfer settings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_transfer_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_details TEXT;

-- 2. Update Transactions table for payment method and manual statuses
-- If status is already an enum, we might need to handle it, but it's currently text with default 'pending'
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe'; -- 'stripe' or 'bank_transfer'
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES public.albums(id); -- Ensure album_id is definitely there

-- 3. Add index for performance on status checks
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON public.transactions(payment_method);

-- 4. RLS Update (already exists, but ensuring completeness)
-- Currently, transactions are viewable by buyer or photographer. This remains true.
-- Photographers need update access to mark manual transfers as 'paid'
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transactions' 
        AND policyname = 'Photographers can update their own received transactions'
    ) THEN
        CREATE POLICY "Photographers can update their own received transactions" 
        ON public.transactions FOR UPDATE 
        USING (auth.uid() = photographer_id);
    END IF;
END $$;
