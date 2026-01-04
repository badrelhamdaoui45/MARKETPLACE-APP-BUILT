
-- 1. Update popups table to support album and photographer linking
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES public.albums(id);
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS photographer_id uuid REFERENCES public.profiles(id);

-- 2. Update RLS policies for popups
-- First drop existing admin-only policy if it exists
DROP POLICY IF EXISTS "Only admins can manage popups" ON public.popups;

-- New management policy for photographers and admins
CREATE POLICY "Photographers can manage their own popups" ON public.popups
FOR ALL USING (
  photographer_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Ensure everyone can still view popups (needed for PublicAlbumView)
DROP POLICY IF EXISTS "Popups are viewable by everyone" ON public.popups;
CREATE POLICY "Popups are viewable by everyone" ON public.popups
FOR SELECT USING (is_active = true);
