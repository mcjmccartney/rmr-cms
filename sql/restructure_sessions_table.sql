-- Restructure sessions table to remove redundant denormalized fields
-- Run this in your Supabase SQL Editor

-- Check current sessions table structure
SELECT 
  'Current sessions table structure' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show sample data before restructuring
SELECT 
  'Sample sessions before restructuring' as info,
  id,
  client_id,
  client_name,
  dog_name,
  email,
  booking,
  session_type,
  amount,
  deposit_paid,
  payment_status
FROM sessions 
ORDER BY created_at DESC 
LIMIT 3;

-- Remove redundant denormalized fields that can be obtained via JOIN
-- Keep client_id for referential integrity, remove client_name, dog_name, email

DO $$
BEGIN
  -- Remove client_name column (can be derived from clients table)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'client_name') THEN
    ALTER TABLE sessions DROP COLUMN client_name;
    RAISE NOTICE 'Removed client_name column (use JOIN with clients table)';
  ELSE
    RAISE NOTICE 'client_name column does not exist';
  END IF;

  -- Remove dog_name column (can be derived from clients table)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'dog_name') THEN
    ALTER TABLE sessions DROP COLUMN dog_name;
    RAISE NOTICE 'Removed dog_name column (use JOIN with clients table)';
  ELSE
    RAISE NOTICE 'dog_name column does not exist';
  END IF;

  -- Remove email column (can be derived from clients table)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'email') THEN
    ALTER TABLE sessions DROP COLUMN email;
    RAISE NOTICE 'Removed email column (use JOIN with clients table)';
  ELSE
    RAISE NOTICE 'email column does not exist';
  END IF;

  -- Remove separate date and time columns (use booking timestamp)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'date') THEN
    ALTER TABLE sessions DROP COLUMN date;
    RAISE NOTICE 'Removed date column (use booking timestamp)';
  ELSE
    RAISE NOTICE 'date column does not exist';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'time') THEN
    ALTER TABLE sessions DROP COLUMN time;
    RAISE NOTICE 'Removed time column (use booking timestamp)';
  ELSE
    RAISE NOTICE 'time column does not exist';
  END IF;
END $$;

-- Ensure booking column exists and has proper format
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'booking') THEN
    ALTER TABLE sessions ADD COLUMN booking TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added booking timestamp column';
  ELSE
    RAISE NOTICE 'booking column already exists';
  END IF;
END $$;

-- Update any NULL booking timestamps with a default value
UPDATE sessions 
SET booking = created_at 
WHERE booking IS NULL AND created_at IS NOT NULL;

-- Show updated table structure
SELECT 
  'Updated sessions table structure' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test the JOIN query that will be used for session display
SELECT 
  'Test sessions with client data via JOIN' as info,
  s.id as session_id,
  s.client_id,
  s.booking,
  s.session_type,
  s.amount,
  s.deposit_paid,
  s.payment_status,
  c.owner_first_name,
  c.owner_last_name,
  c.dog_name,
  c.contact_email,
  c.contact_number,
  c.is_member,
  CONCAT(c.owner_first_name, ' ', c.owner_last_name) as client_name
FROM sessions s
INNER JOIN clients c ON s.client_id = c.id
ORDER BY s.created_at DESC
LIMIT 5;

-- Test payment matching query
SELECT 
  'Test payment matching via client email' as info,
  s.id as session_id,
  s.client_id,
  s.booking,
  s.session_type,
  s.amount,
  s.deposit_paid,
  c.contact_email,
  CONCAT(c.owner_first_name, ' ', c.owner_last_name) as client_name
FROM sessions s
INNER JOIN clients c ON s.client_id = c.id
WHERE s.deposit_paid = false
  AND c.contact_email IS NOT NULL
ORDER BY s.created_at DESC
LIMIT 3;

-- Show summary of changes
SELECT 
  'Restructuring summary' as info,
  'Removed denormalized fields: client_name, dog_name, email, date, time' as removed_fields,
  'Kept normalized fields: client_id (FK), booking (timestamp), session_type, amount, payment fields' as kept_fields,
  'All client data now accessed via JOIN with clients table' as access_method;
