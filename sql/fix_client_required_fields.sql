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

-- Add new unique constraint that allows multiple NULLs
CREATE UNIQUE INDEX clients_contact_email_unique 
ON clients (contact_email) 
WHERE contact_email IS NOT NULL;

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

-- Test inserting a client with minimal data
INSERT INTO clients (
  owner_first_name,
  owner_last_name,
  submission_date
) VALUES (
  'Test',
  'Client',
  '2025-01-15'
) RETURNING id, owner_first_name, owner_last_name, contact_email, contact_number, postcode;

-- Clean up test record
DELETE FROM clients 
WHERE owner_first_name = 'Test' 
  AND owner_last_name = 'Client' 
  AND submission_date = '2025-01-15';

-- Show summary
SELECT 
  'Migration summary' as info,
  'postcode, contact_number, and contact_email are now optional' as changes,
  'contact_email still has unique constraint when not NULL' as note;
