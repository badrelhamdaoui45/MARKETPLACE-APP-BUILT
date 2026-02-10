-- Verification query to check current user_role enum values
-- Run this to confirm that 'runner' exists and 'buyer' does not

SELECT enumlabel as role_value 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;

-- Expected output should show:
-- admin
-- photographer
-- runner
