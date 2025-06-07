-- SAFE VERSION: Restructure sessions table to remove redundant denormalized fields
-- This version handles cases where columns may already be dropped
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

-- Show sample data before restructuring (only if columns exist)
DO $$
DECLARE
    has_client_name BOOLEAN;
    has_dog_name BOOLEAN;
    has_email BOOLEAN;
    has_date BOOLEAN;
    has_time BOOLEAN;
BEGIN
    -- Check which columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'client_name'
    ) INTO has_client_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'dog_name'
    ) INTO has_dog_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'email'
    ) INTO has_email;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'date'
    ) INTO has_date;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'time'
    ) INTO has_time;
    
    RAISE NOTICE 'Columns found - client_name: %, dog_name: %, email: %, date: %, time: %', 
                 has_client_name, has_dog_name, has_email, has_date, has_time;
END $$;

-- Safely remove redundant denormalized fields
DO $$
BEGIN
  -- Remove client_name column (can be derived from clients table)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'client_name'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sessions DROP COLUMN client_name;
    RAISE NOTICE 'Removed client_name column (use JOIN with clients table)';
  ELSE
    RAISE NOTICE 'client_name column does not exist';
  END IF;

  -- Remove dog_name column (can be derived from clients table)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'dog_name'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sessions DROP COLUMN dog_name;
    RAISE NOTICE 'Removed dog_name column (use JOIN with clients table)';
  ELSE
    RAISE NOTICE 'dog_name column does not exist';
  END IF;

  -- Remove email column (can be derived from clients table)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'email'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sessions DROP COLUMN email;
    RAISE NOTICE 'Removed email column (use JOIN with clients table)';
  ELSE
    RAISE NOTICE 'email column does not exist';
  END IF;

  -- Remove separate date column (use booking timestamp)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'date'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sessions DROP COLUMN date;
    RAISE NOTICE 'Removed date column (use booking timestamp)';
  ELSE
    RAISE NOTICE 'date column does not exist';
  END IF;

  -- Remove separate time column (use booking timestamp)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'time'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sessions DROP COLUMN time;
    RAISE NOTICE 'Removed time column (use booking timestamp)';
  ELSE
    RAISE NOTICE 'time column does not exist';
  END IF;
END $$;

-- Ensure booking column exists and has proper format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'booking'
    AND table_schema = 'public'
  ) THEN
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

-- Ensure session_type column exists and has default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'session_type'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sessions ADD COLUMN session_type TEXT NOT NULL DEFAULT 'General Session';
    RAISE NOTICE 'Added session_type column';
  ELSE
    RAISE NOTICE 'session_type column already exists';
  END IF;
END $$;

-- Update any NULL session_type values
UPDATE sessions 
SET session_type = 'General Session'
WHERE session_type IS NULL;

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

-- Final verification - count sessions and verify integrity
SELECT 
  'Final verification' as info,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN client_id IS NOT NULL THEN 1 END) as sessions_with_client_id,
  COUNT(CASE WHEN booking IS NOT NULL THEN 1 END) as sessions_with_booking,
  COUNT(CASE WHEN session_type IS NOT NULL THEN 1 END) as sessions_with_type
FROM sessions;
