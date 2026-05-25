-- Create Subscription Plans table
CREATE TABLE IF NOT EXISTS public.pricing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    upload_limit INTEGER NOT NULL DEFAULT 100,
    commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default subscription plans with static UUIDs
INSERT INTO public.pricing_plans (id, name, price, upload_limit, commission_percent) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Free', 0.00, 100, 15.00),
    ('00000000-0000-0000-0000-000000000002', 'Starter', 19.00, 1000, 10.00),
    ('00000000-0000-0000-0000-000000000003', 'Premium', 49.00, 10000, 5.00)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    upload_limit = EXCLUDED.upload_limit,
    commission_percent = EXCLUDED.commission_percent;

-- Add plan_id reference column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.pricing_plans(id) DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

-- Update existing profiles to default Free subscription plan if they don't have one
UPDATE public.profiles SET plan_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE plan_id IS NULL;

-- Enable Row Level Security (RLS) on pricing_plans
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_plans
DROP POLICY IF EXISTS "Allow public read access to plans" ON public.pricing_plans;
CREATE POLICY "Allow public read access to plans" ON public.pricing_plans
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin write access to plans" ON public.pricing_plans;
CREATE POLICY "Allow admin write access to plans" ON public.pricing_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- RLS Policy to allow admins to update any photographer profile (e.g. to upgrade/downgrade their subscription plan)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Refresh PostgREST cache (forces postgrest to re-parse the schemas and see new columns)
NOTIFY pgrst, 'reload schema';
