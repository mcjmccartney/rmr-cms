-- SAFE VERSION: Add payment fields to sessions table
-- This version handles cases where fields already exist
-- Run this in your Supabase SQL Editor

-- Check current table structure first
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

-- Check existing indexes
SELECT 
  'Existing sessions indexes' as info,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'sessions';

-- Safely add payment tracking fields
DO $$
BEGIN
  -- Add deposit_paid if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'deposit_paid'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sessions ADD COLUMN deposit_paid BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added deposit_paid column';
  ELSE
    RAISE NOTICE 'deposit_paid column already exists';
  END IF;

  -- Add payment_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'payment_status'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sessions ADD COLUMN payment_status TEXT DEFAULT 'pending';
    RAISE NOTICE 'Added payment_status column';
    
    -- Add check constraint for payment_status
    BEGIN
      ALTER TABLE sessions ADD CONSTRAINT sessions_payment_status_check 
      CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
      RAISE NOTICE 'Added payment_status check constraint';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'payment_status check constraint already exists or failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'payment_status column already exists';
  END IF;

  -- Add payment_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'payment_date'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sessions ADD COLUMN payment_date DATE;
    RAISE NOTICE 'Added payment_date column';
  ELSE
    RAISE NOTICE 'payment_date column already exists';
  END IF;

  -- Add payment_intent_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'payment_intent_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sessions ADD COLUMN payment_intent_id TEXT;
    RAISE NOTICE 'Added payment_intent_id column';
  ELSE
    RAISE NOTICE 'payment_intent_id column already exists';
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'updated_at'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;

  -- Add booking column if it doesn't exist (for restructured schema)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'booking'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE sessions ADD COLUMN booking TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added booking column';
  ELSE
    RAISE NOTICE 'booking column already exists';
  END IF;
END $$;

-- Safely create indexes
DO $$
BEGIN
  -- Create deposit_paid index
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sessions_deposit_paid'
  ) THEN
    CREATE INDEX idx_sessions_deposit_paid ON sessions(deposit_paid);
    RAISE NOTICE 'Created idx_sessions_deposit_paid index';
  ELSE
    RAISE NOTICE 'idx_sessions_deposit_paid index already exists';
  END IF;

  -- Create payment_status index
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sessions_payment_status'
  ) THEN
    CREATE INDEX idx_sessions_payment_status ON sessions(payment_status);
    RAISE NOTICE 'Created idx_sessions_payment_status index';
  ELSE
    RAISE NOTICE 'idx_sessions_payment_status index already exists';
  END IF;

  -- Create client_id index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sessions_client_id'
  ) THEN
    CREATE INDEX idx_sessions_client_id ON sessions(client_id);
    RAISE NOTICE 'Created idx_sessions_client_id index';
  ELSE
    RAISE NOTICE 'idx_sessions_client_id index already exists';
  END IF;
END $$;

-- Update existing sessions that don't have payment status set
UPDATE sessions 
SET 
  deposit_paid = COALESCE(deposit_paid, false),
  payment_status = COALESCE(payment_status, 'pending'),
  updated_at = COALESCE(updated_at, NOW())
WHERE deposit_paid IS NULL OR payment_status IS NULL OR updated_at IS NULL;

-- Update booking column from date/time if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'date'
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'time'
    AND table_schema = 'public'
  ) THEN
    -- Update booking from date and time
    UPDATE sessions 
    SET booking = (date || ' ' || time)::timestamp
    WHERE booking IS NULL AND date IS NOT NULL AND time IS NOT NULL;
    RAISE NOTICE 'Updated booking column from date and time fields';
  ELSE
    -- Update booking from created_at if date/time don't exist
    UPDATE sessions 
    SET booking = created_at 
    WHERE booking IS NULL AND created_at IS NOT NULL;
    RAISE NOTICE 'Updated booking column from created_at field';
  END IF;
END $$;

-- Show how many sessions were updated
SELECT 
  'Sessions update summary' as info,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN deposit_paid = false THEN 1 END) as unpaid_sessions,
  COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_sessions,
  COUNT(CASE WHEN booking IS NOT NULL THEN 1 END) as sessions_with_booking
FROM sessions;

-- Test the JOIN query that will be used for payment matching
SELECT
  'Test JOIN query for payment matching' as info,
  s.id as session_id,
  s.client_id,
  s.booking,
  s.session_type,
  s.amount,
  s.deposit_paid,
  s.payment_status,
  c.contact_email,
  c.contact_number,
  c.owner_first_name,
  c.owner_last_name,
  c.dog_name,
  CONCAT(c.owner_first_name, ' ', c.owner_last_name) as client_name
FROM sessions s
INNER JOIN clients c ON s.client_id = c.id
WHERE s.deposit_paid = false
ORDER BY s.created_at DESC
LIMIT 5;

-- Final verification - show updated table structure
SELECT 
  'Final sessions table structure' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show final indexes
SELECT 
  'Final sessions indexes' as info,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'sessions';
