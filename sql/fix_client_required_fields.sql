-- Fix client table to make postcode, contact_number, and contact_email optional
-- Run this in your Supabase SQL Editor

-- Check current table structure
SELECT 
  'Current clients table structure' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Make postcode optional (allow NULL)
ALTER TABLE clients 
ALTER COLUMN postcode DROP NOT NULL;

-- Make contact_number optional (allow NULL)
ALTER TABLE clients 
ALTER COLUMN contact_number DROP NOT NULL;

-- Make contact_email optional (allow NULL) but keep UNIQUE constraint
ALTER TABLE clients 
ALTER COLUMN contact_email DROP NOT NULL;

-- Update the unique constraint to handle NULLs properly
-- Drop existing unique constraint
ALTER TABLE clients
DROP CONSTRAINT IF EXISTS clients_contact_email_key;

-- Add new unique constraint that allows multiple NULLs (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'clients_contact_email_unique'
  ) THEN
    CREATE UNIQUE INDEX clients_contact_email_unique
    ON clients (contact_email)
    WHERE contact_email IS NOT NULL;
    RAISE NOTICE 'Created unique index clients_contact_email_unique';
  ELSE
    RAISE NOTICE 'Index clients_contact_email_unique already exists';
  END IF;
END $$;

-- Verify the changes
SELECT 
  'Updated clients table structure' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test inserting a client with minimal data (using dynamic approach)
DO $$
DECLARE
    has_submission_date BOOLEAN;
    test_client_id UUID;
BEGIN
    -- Check if submission_date column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients'
        AND column_name = 'submission_date'
        AND table_schema = 'public'
    ) INTO has_submission_date;

    IF has_submission_date THEN
        -- Insert with submission_date
        INSERT INTO clients (
            owner_first_name,
            owner_last_name,
            submission_date
        ) VALUES (
            'Test',
            'Client',
            '2025-01-15'
        ) RETURNING id INTO test_client_id;

        RAISE NOTICE 'Test client created with submission_date: %', test_client_id;

        -- Clean up
        DELETE FROM clients WHERE id = test_client_id;
        RAISE NOTICE 'Test client deleted: %', test_client_id;
    ELSE
        -- Insert without submission_date
        INSERT INTO clients (
            owner_first_name,
            owner_last_name
        ) VALUES (
            'Test',
            'Client'
        ) RETURNING id INTO test_client_id;

        RAISE NOTICE 'Test client created without submission_date: %', test_client_id;

        -- Clean up
        DELETE FROM clients WHERE id = test_client_id;
        RAISE NOTICE 'Test client deleted: %', test_client_id;
    END IF;
END $$;

-- Show summary
SELECT 
  'Migration summary' as info,
  'postcode, contact_number, and contact_email are now optional' as changes,
  'contact_email still has unique constraint when not NULL' as note;
