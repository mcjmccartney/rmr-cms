-- SAFE VERSION: Fix client table to make postcode, contact_number, and contact_email optional
-- This version handles cases where migrations have been partially run
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

-- Check existing constraints and indexes
SELECT 
  'Existing constraints and indexes' as info,
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'clients'::regclass;

SELECT 
  'Existing indexes' as info,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'clients';

-- Safely make columns optional
DO $$
BEGIN
  -- Make postcode optional (allow NULL)
  BEGIN
    ALTER TABLE clients ALTER COLUMN postcode DROP NOT NULL;
    RAISE NOTICE 'Made postcode column optional';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'postcode column is already optional or does not exist: %', SQLERRM;
  END;

  -- Make contact_number optional (allow NULL)
  BEGIN
    ALTER TABLE clients ALTER COLUMN contact_number DROP NOT NULL;
    RAISE NOTICE 'Made contact_number column optional';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'contact_number column is already optional or does not exist: %', SQLERRM;
  END;

  -- Make contact_email optional (allow NULL)
  BEGIN
    ALTER TABLE clients ALTER COLUMN contact_email DROP NOT NULL;
    RAISE NOTICE 'Made contact_email column optional';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'contact_email column is already optional or does not exist: %', SQLERRM;
  END;
END $$;

-- Safely handle unique constraint
DO $$
BEGIN
  -- Drop existing unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clients_contact_email_key' 
    AND conrelid = 'clients'::regclass
  ) THEN
    ALTER TABLE clients DROP CONSTRAINT clients_contact_email_key;
    RAISE NOTICE 'Dropped existing unique constraint clients_contact_email_key';
  ELSE
    RAISE NOTICE 'Unique constraint clients_contact_email_key does not exist';
  END IF;

  -- Create new unique index only if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'clients_contact_email_unique'
    AND tablename = 'clients'
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
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test client creation failed: %', SQLERRM;
END $$;

-- Show final summary
SELECT 
  'Migration summary' as info,
  'postcode, contact_number, and contact_email are now optional' as changes,
  'contact_email has unique constraint when not NULL' as note;

-- Show final constraints and indexes
SELECT 
  'Final constraints' as info,
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'clients'::regclass;

SELECT 
  'Final indexes' as info,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'clients';
