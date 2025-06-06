-- Incremental migration - only add missing payment fields
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

-- Add only the missing payment tracking fields
DO $$
BEGIN
  -- Add deposit_paid if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'deposit_paid') THEN
    ALTER TABLE sessions ADD COLUMN deposit_paid BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added deposit_paid column';
  ELSE
    RAISE NOTICE 'deposit_paid column already exists';
  END IF;

  -- Add payment_status if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'payment_status') THEN
    ALTER TABLE sessions ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
    RAISE NOTICE 'Added payment_status column';
  ELSE
    RAISE NOTICE 'payment_status column already exists';
  END IF;

  -- Add payment_date if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'payment_date') THEN
    ALTER TABLE sessions ADD COLUMN payment_date DATE;
    RAISE NOTICE 'Added payment_date column';
  ELSE
    RAISE NOTICE 'payment_date column already exists';
  END IF;

  -- Add payment_intent_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'payment_intent_id') THEN
    ALTER TABLE sessions ADD COLUMN payment_intent_id TEXT;
    RAISE NOTICE 'Added payment_intent_id column';
  ELSE
    RAISE NOTICE 'payment_intent_id column already exists';
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'updated_at') THEN
    ALTER TABLE sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_sessions_deposit_paid ON sessions(deposit_paid);
CREATE INDEX IF NOT EXISTS idx_sessions_payment_status ON sessions(payment_status);

-- Update existing sessions that don't have payment status set
UPDATE sessions 
SET 
  deposit_paid = COALESCE(deposit_paid, false),
  payment_status = COALESCE(payment_status, 'pending'),
  updated_at = COALESCE(updated_at, NOW())
WHERE deposit_paid IS NULL OR payment_status IS NULL OR updated_at IS NULL;

-- Show how many sessions were updated
SELECT 
  'Sessions update summary' as info,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN deposit_paid = false THEN 1 END) as unpaid_sessions,
  COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_sessions
FROM sessions;

-- Test the JOIN query that will be used for payment matching
SELECT
  'Test JOIN query for payment matching' as info,
  s.id as session_id,
  s.client_name,
  s.booking,
  CASE
    WHEN s.booking IS NOT NULL THEN s.booking::date::text
    ELSE 'No booking date'
  END as session_date,
  CASE
    WHEN s.booking IS NOT NULL THEN s.booking::time::text
    ELSE 'No booking time'
  END as session_time,
  s.amount,
  s.deposit_paid,
  s.payment_status,
  c.contact_email,
  c.contact_number,
  c.owner_first_name,
  c.owner_last_name,
  c.dog_name
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
