-- Migration: Add Withdrawals Table for Photographer Payouts
-- This table tracks withdrawal requests from photographers

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  photographer_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  stripe_payout_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'canceled')),
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_withdrawals_photographer_id ON public.withdrawals(photographer_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);

-- Enable RLS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Photographers can view their own withdrawals
CREATE POLICY "Photographers can view their own withdrawals" 
  ON public.withdrawals 
  FOR SELECT 
  USING (auth.uid() = photographer_id);

-- Photographers can insert their own withdrawal requests
CREATE POLICY "Photographers can create withdrawal requests" 
  ON public.withdrawals 
  FOR INSERT 
  WITH CHECK (auth.uid() = photographer_id);

-- Only the photographer can update their own withdrawals (e.g., cancel)
CREATE POLICY "Photographers can update their own withdrawals" 
  ON public.withdrawals 
  FOR UPDATE 
  USING (auth.uid() = photographer_id);

-- Admins can view all withdrawals
CREATE POLICY "Admins can view all withdrawals" 
  ON public.withdrawals 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any withdrawal (for processing)
CREATE POLICY "Admins can update any withdrawal" 
  ON public.withdrawals 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
