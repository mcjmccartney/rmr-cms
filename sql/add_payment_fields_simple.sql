-- Add payment-related fields to sessions table (without email field)
-- Run this in your Supabase SQL Editor

-- Add payment tracking fields to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for payment queries (no email index needed - we use JOIN)
CREATE INDEX IF NOT EXISTS idx_sessions_deposit_paid ON sessions(deposit_paid);
CREATE INDEX IF NOT EXISTS idx_sessions_payment_status ON sessions(payment_status);

-- Update existing sessions to have default payment status
UPDATE sessions 
SET 
  deposit_paid = false,
  payment_status = 'pending',
  updated_at = NOW()
WHERE deposit_paid IS NULL;

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at_trigger
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_updated_at();

-- Test the JOIN query that will be used for payment matching
SELECT 
  'Test JOIN query for payment matching' as info,
  s.id as session_id,
  s.client_name,
  s.date,
  s.time,
  s.amount,
  s.deposit_paid,
  s.payment_status,
  c.contact_email,
  c.owner_first_name,
  c.owner_last_name
FROM sessions s
INNER JOIN clients c ON s.client_id = c.id
WHERE s.deposit_paid = false
ORDER BY s.created_at DESC
LIMIT 3;

-- Verify the changes
SELECT 
  'Sessions table structure after migration' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
