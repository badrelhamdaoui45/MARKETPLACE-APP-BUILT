-- Rename the 'buyer' enum value to 'runner' in user_role type
-- This automatically updates all columns using this enum value (e.g. public.profiles.role)
ALTER TYPE user_role RENAME VALUE 'buyer' TO 'runner';

-- Update the default value for the profiles table just to be explicit (though RENAME VALUE usually handles metadata)
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'runner'::user_role;
