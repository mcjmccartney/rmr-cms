-- Add payment-related fields to sessions table
-- Run this in your Supabase SQL Editor

-- Add payment tracking fields to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for payment queries
CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(email);
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

-- Show sample data
SELECT 
  'Sample sessions with payment fields' as info,
  id,
  client_name,
  email,
  date,
  time,
  amount,
  deposit_paid,
  payment_status,
  payment_date
FROM sessions 
ORDER BY created_at DESC 
LIMIT 5;
