-- Add watermark_text column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS watermark_text text DEFAULT '© RUN CAPTURE';
