-- Migration to add Pre-inscription feature
-- 1. Add column to albums table
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS pre_inscription_enabled BOOLEAN DEFAULT FALSE;

-- 2. Create pre_inscriptions table
CREATE TABLE IF NOT EXISTS public.pre_inscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.pre_inscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Policies for pre_inscriptions
-- Anyone can register for an album notification
CREATE POLICY "Anyone can insert pre-inscriptions" 
ON public.pre_inscriptions FOR INSERT 
WITH CHECK (true);

-- Only the photographer who owns the album can view the inscriptions
CREATE POLICY "Photographers can view their album inscriptions" 
ON public.pre_inscriptions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.albums 
        WHERE id = public.pre_inscriptions.album_id 
        AND photographer_id = auth.uid()
    )
);
