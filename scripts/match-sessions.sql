-- SQL Script to match sessions to clients by email address
-- Run this in your Supabase SQL Editor

-- First, let's check the current state
SELECT 
  'Current State Check' as info,
  (SELECT COUNT(*) FROM sessions) as total_sessions,
  (SELECT COUNT(*) FROM sessions WHERE client_id IS NOT NULL) as sessions_with_client_id,
  (SELECT COUNT(*) FROM sessions WHERE client_id IS NULL) as sessions_without_client_id,
  (SELECT COUNT(*) FROM sessions WHERE email IS NOT NULL) as sessions_with_email,
  (SELECT COUNT(*) FROM clients) as total_clients;

-- Show sessions that have email but no client_id
SELECT 
  'Sessions with email but no client_id' as info,
  s.id,
  s.email,
  s.client_name,
  s.dog_name,
  s.date,
  s.time
FROM sessions s 
WHERE s.email IS NOT NULL 
  AND s.client_id IS NULL
ORDER BY s.date, s.time;

-- Show potential matches between sessions and clients
SELECT 
  'Potential Matches' as info,
  s.id as session_id,
  s.email as session_email,
  s.client_name as session_client_name,
  c.id as client_id,
  c.contact_email as client_email,
  c.owner_first_name || ' ' || c.owner_last_name as client_full_name,
  c.dog_name as client_dog_name
FROM sessions s
JOIN clients c ON LOWER(s.email) = LOWER(c.contact_email)
WHERE s.email IS NOT NULL 
  AND s.client_id IS NULL
ORDER BY s.date, s.time;

-- Update sessions with matching client information
-- UNCOMMENT THE LINES BELOW TO ACTUALLY PERFORM THE UPDATE
-- WARNING: This will modify your data. Make sure to backup first!

/*
UPDATE sessions 
SET 
  client_id = c.id,
  client_name = c.owner_first_name || ' ' || c.owner_last_name,
  dog_name = c.dog_name
FROM clients c 
WHERE LOWER(sessions.email) = LOWER(c.contact_email)
  AND sessions.email IS NOT NULL 
  AND sessions.client_id IS NULL;
*/

-- After running the update, check the results
/*
SELECT 
  'Update Results' as info,
  (SELECT COUNT(*) FROM sessions) as total_sessions,
  (SELECT COUNT(*) FROM sessions WHERE client_id IS NOT NULL) as sessions_with_client_id,
  (SELECT COUNT(*) FROM sessions WHERE client_id IS NULL) as sessions_without_client_id,
  (SELECT COUNT(*) FROM sessions WHERE email IS NOT NULL AND client_id IS NULL) as unmatched_sessions_with_email;
*/

-- Show any remaining unmatched sessions
/*
SELECT 
  'Remaining Unmatched Sessions' as info,
  s.id,
  s.email,
  s.client_name,
  s.dog_name,
  s.date,
  s.time,
  CASE 
    WHEN s.email IS NULL THEN 'No email address'
    WHEN NOT EXISTS (SELECT 1 FROM clients c WHERE LOWER(c.contact_email) = LOWER(s.email)) THEN 'No matching client found'
    ELSE 'Unknown reason'
  END as reason
FROM sessions s 
WHERE s.client_id IS NULL
ORDER BY s.date, s.time;
*/
