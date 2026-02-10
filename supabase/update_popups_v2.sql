
-- Update popups table to support types and coupon codes
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS type text DEFAULT 'announcement';
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS show_once boolean DEFAULT true;

-- Insert a dynamic welcome popup template
INSERT INTO public.popups (title, message, image_url, button_text, type, coupon_code, show_once, is_active)
VALUES (
  'Bienvenue dans {{album_title}}',
  'Use the referral code to get a discount on your favorite photos from this event.',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1000',
  'DÉCOUVRIR LES PHOTOS',
  'album_welcome',
  'CAPTURE10',
  true,
  true
);
