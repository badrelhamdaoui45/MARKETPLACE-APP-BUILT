-- Migration to rename 'buyer' role to 'runner'
-- This migration is idempotent - safe to run multiple times

DO $$
BEGIN
    -- Check if 'buyer' enum value exists and rename it to 'runner'
    IF EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'buyer' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role RENAME VALUE 'buyer' TO 'runner';
        RAISE NOTICE 'Successfully renamed buyer to runner';
    ELSE
        RAISE NOTICE 'Enum value "buyer" does not exist - likely already renamed to "runner"';
    END IF;
END $$;

-- Verification: Show all current user_role enum values
SELECT enumlabel as role_value 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;
