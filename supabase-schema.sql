-- RMR CMS Database Schema for Supabase
-- Run this in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_first_name TEXT NOT NULL,
  owner_last_name TEXT NOT NULL,
  contact_email TEXT NOT NULL UNIQUE,
  contact_number TEXT NOT NULL,
  postcode TEXT NOT NULL,
  full_address TEXT,
  dog_name TEXT,
  is_member BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  submission_date TEXT NOT NULL,
  last_session TEXT DEFAULT 'N/A',
  next_session TEXT DEFAULT 'Not Scheduled',
  behavioural_brief_id UUID,
  behaviour_questionnaire_id UUID,
  address JSONB,
  how_heard_about_services TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  dog_name TEXT,
  email TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  session_type TEXT NOT NULL,
  amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Behavioural briefs table
CREATE TABLE IF NOT EXISTS behavioural_briefs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  dog_name TEXT NOT NULL,
  dog_sex TEXT NOT NULL,
  dog_breed TEXT NOT NULL,
  life_with_dog_and_help_needed TEXT NOT NULL,
  best_outcome TEXT NOT NULL,
  ideal_session_types TEXT[] DEFAULT '{}',
  submission_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Behaviour questionnaires table
CREATE TABLE IF NOT EXISTS behaviour_questionnaires (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  dog_name TEXT NOT NULL,
  dog_age TEXT NOT NULL,
  dog_sex TEXT NOT NULL,
  dog_breed TEXT NOT NULL,
  neutered_spayed_details TEXT NOT NULL,
  main_problem TEXT,
  problem_tendency_first_noticed TEXT,
  problem_frequency_details TEXT,
  problem_recent_changes TEXT,
  problem_anticipation_details TEXT,
  dog_motivation_for_problem TEXT,
  problem_addressing_attempts TEXT,
  ideal_training_outcome TEXT,
  other_help_needed TEXT,
  medical_history TEXT,
  vet_consultation_details TEXT,
  dog_origin TEXT,
  rescue_background TEXT,
  dog_age_when_acquired TEXT,
  diet_details TEXT,
  food_motivation_level TEXT,
  mealtime_routine TEXT,
  treat_routine TEXT,
  external_treats_consent TEXT,
  play_engagement TEXT,
  affection_response TEXT,
  exercise_routine TEXT,
  muzzle_usage TEXT,
  reaction_to_familiar_people TEXT,
  reaction_to_unfamiliar_people TEXT,
  housetrained_status TEXT,
  activities_aside_from_walks TEXT,
  dog_likes TEXT,
  dog_challenges TEXT,
  positive_reinforcement_methods TEXT,
  favorite_rewards TEXT,
  correction_methods TEXT,
  correction_effects TEXT,
  previous_professional_training TEXT,
  previous_training_methods_used TEXT,
  previous_training_experience_results TEXT,
  sociability_with_dogs TEXT CHECK (sociability_with_dogs IN ('Sociable', 'Nervous', 'Reactive', 'Disinterested', '')),
  sociability_with_people TEXT CHECK (sociability_with_people IN ('Sociable', 'Nervous', 'Reactive', 'Disinterested', '')),
  additional_information TEXT,
  time_dedicated_to_training TEXT,
  submission_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(contact_email);
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_behavioural_briefs_client_id ON behavioural_briefs(client_id);
CREATE INDEX IF NOT EXISTS idx_behaviour_questionnaires_client_id ON behaviour_questionnaires(client_id);

-- Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioural_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviour_questionnaires ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (you can modify these based on your needs)
-- For now, allowing all operations for authenticated users

-- Clients policies
CREATE POLICY "Allow all operations for authenticated users" ON clients
  FOR ALL USING (auth.role() = 'authenticated');

-- Sessions policies  
CREATE POLICY "Allow all operations for authenticated users" ON sessions
  FOR ALL USING (auth.role() = 'authenticated');

-- Behavioural briefs policies
CREATE POLICY "Allow all operations for authenticated users" ON behavioural_briefs
  FOR ALL USING (auth.role() = 'authenticated');

-- Behaviour questionnaires policies
CREATE POLICY "Allow all operations for authenticated users" ON behaviour_questionnaires
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow anonymous access for public intake forms (you may want to restrict this)
CREATE POLICY "Allow anonymous insert for public forms" ON clients
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous insert for public forms" ON behavioural_briefs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous insert for public forms" ON behaviour_questionnaires
  FOR INSERT WITH CHECK (true);
