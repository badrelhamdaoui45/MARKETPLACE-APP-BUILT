-- Add pricing_package_ids column (array of UUIDs)
ALTER TABLE public.albums ADD COLUMN pricing_package_ids UUID[] DEFAULT '{}';

-- Migrate existing data (if any)
UPDATE public.albums 
SET pricing_package_ids = ARRAY[pricing_package_id]
WHERE pricing_package_id IS NOT NULL;
