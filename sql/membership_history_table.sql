-- Optional: Create membership history table to track membership changes over time
-- Run this in your Supabase SQL editor if you want to track membership history

CREATE TABLE IF NOT EXISTS membership_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('renewed', 'cancelled')),
    renewal_date DATE,
    membership_type VARCHAR(50) DEFAULT 'monthly',
    amount DECIMAL(10,2),
    email_subject TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_membership_history_client_id ON membership_history(client_id);
CREATE INDEX IF NOT EXISTS idx_membership_history_processed_at ON membership_history(processed_at);

-- Add RLS (Row Level Security) if needed
ALTER TABLE membership_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on membership_history" ON membership_history
    FOR ALL USING (true);

-- Optional: Add a comment
COMMENT ON TABLE membership_history IS 'Tracks membership renewal and cancellation history from email webhooks';
