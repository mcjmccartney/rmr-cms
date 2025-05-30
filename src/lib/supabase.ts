// Check if Supabase is configured first
export const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('🔧 Supabase configuration check:', {
  url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  configured: isSupabaseConfigured
});

// Try to import Supabase, fall back to mock if not available
let createClient: any = null;
let supabaseAvailable = false;

try {
  const supabaseModule = require('@supabase/supabase-js');
  createClient = supabaseModule.createClient;
  supabaseAvailable = true;
  console.log('✅ Supabase package loaded successfully');
} catch (error) {
  console.warn('⚠️ Supabase package not available, using mock client');
  supabaseAvailable = false;
}

// Simple mock client for when Supabase is not available
const createMockClient = () => ({
  from: (table: string) => ({
    select: (columns?: string) => ({
      order: (column: string, options?: any) => ({
        eq: (column: string, value: any) => Promise.resolve({ data: [], error: null }),
        limit: (count: number) => Promise.resolve({ data: [], error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
        then: (resolve: any) => resolve({ data: [], error: null })
      }),
      eq: (column: string, value: any) => Promise.resolve({ data: [], error: null }),
      limit: (count: number) => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: [], error: null })
    }),
    insert: (data: any) => ({
      select: (columns?: string) => ({
        single: () => Promise.resolve({ data: null, error: null }),
        then: (resolve: any) => resolve({ data: null, error: null })
      }),
      then: (resolve: any) => resolve({ data: null, error: null })
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => Promise.resolve({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: null, error: null })
    }),
    delete: () => ({
      eq: (column: string, value: any) => Promise.resolve({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: null, error: null })
    }),
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: (credentials: any) => {
      if (credentials.password === 'password123') {
        const mockUser = {
          id: 'mock-user-' + Date.now(),
          email: credentials.email,
          user_metadata: { email: credentials.email },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        };
        return Promise.resolve({ data: { user: mockUser }, error: null });
      }
      return Promise.resolve({ data: { user: null }, error: { message: 'Invalid credentials' } });
    },
    signUp: () => Promise.resolve({ data: { user: null }, error: { message: 'Sign up not available in mock mode' } }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  }
});

// Get Supabase client
const getSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Using mock client.');
    return createMockClient();
  }

  if (supabaseAvailable && createClient) {
    console.log('🚀 Creating real Supabase client');
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  } else {
    console.warn('Using mock Supabase client');
    return createMockClient();
  }
};

// Types for our database schema
export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          owner_first_name: string
          owner_last_name: string
          contact_email: string
          contact_number: string
          postcode: string
          full_address?: string
          dog_name?: string
          is_member: boolean
          is_active: boolean
          submission_date: string
          created_at: string
          last_session: string
          next_session: string
          behavioural_brief_id?: string
          behaviour_questionnaire_id?: string
          address?: any // JSON field
          how_heard_about_services?: string
        }
        Insert: {
          id?: string
          owner_first_name: string
          owner_last_name: string
          contact_email: string
          contact_number: string
          postcode: string
          full_address?: string
          dog_name?: string
          is_member?: boolean
          is_active?: boolean
          submission_date?: string
          created_at?: string
          last_session?: string
          next_session?: string
          behavioural_brief_id?: string
          behaviour_questionnaire_id?: string
          address?: any
          how_heard_about_services?: string
        }
        Update: {
          id?: string
          owner_first_name?: string
          owner_last_name?: string
          contact_email?: string
          contact_number?: string
          postcode?: string
          full_address?: string
          dog_name?: string
          is_member?: boolean
          is_active?: boolean
          submission_date?: string
          created_at?: string
          last_session?: string
          next_session?: string
          behavioural_brief_id?: string
          behaviour_questionnaire_id?: string
          address?: any
          how_heard_about_services?: string
        }
      }
      sessions: {
        Row: {
          id: string
          client_id: string
          client_name: string
          dog_name?: string
          date: string
          time: string
          session_type: string
          amount?: number
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          client_name: string
          dog_name?: string
          date: string
          time: string
          session_type: string
          amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          client_name?: string
          dog_name?: string
          date?: string
          time?: string
          session_type?: string
          amount?: number
          created_at?: string
        }
      }
      behavioural_briefs: {
        Row: {
          id: string
          client_id: string
          dog_name: string
          dog_sex: string
          dog_breed: string
          life_with_dog_and_help_needed: string
          best_outcome: string
          ideal_session_types: string[]
          submission_date: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          dog_name: string
          dog_sex: string
          dog_breed: string
          life_with_dog_and_help_needed: string
          best_outcome: string
          ideal_session_types?: string[]
          submission_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          dog_name?: string
          dog_sex?: string
          dog_breed?: string
          life_with_dog_and_help_needed?: string
          best_outcome?: string
          ideal_session_types?: string[]
          submission_date?: string
          created_at?: string
        }
      }
      behaviour_questionnaires: {
        Row: {
          id: string
          client_id: string
          dog_name: string
          dog_age: string
          dog_sex: string
          dog_breed: string
          neutered_spayed_details: string
          main_problem: string
          problem_tendency_first_noticed: string
          problem_frequency_details: string
          problem_recent_changes: string
          problem_anticipation_details: string
          dog_motivation_for_problem: string
          problem_addressing_attempts: string
          ideal_training_outcome: string
          other_help_needed?: string
          medical_history?: string
          vet_consultation_details?: string
          dog_origin?: string
          rescue_background?: string
          dog_age_when_acquired?: string
          diet_details?: string
          food_motivation_level?: string
          mealtime_routine?: string
          treat_routine?: string
          external_treats_consent?: string
          play_engagement?: string
          affection_response?: string
          exercise_routine?: string
          muzzle_usage?: string
          reaction_to_familiar_people?: string
          reaction_to_unfamiliar_people?: string
          housetrained_status?: string
          activities_aside_from_walks?: string
          dog_likes?: string
          dog_challenges: string
          positive_reinforcement_methods: string
          favorite_rewards: string
          correction_methods: string
          correction_effects: string
          previous_professional_training: string
          previous_training_methods_used: string
          previous_training_experience_results: string
          sociability_with_dogs: string
          sociability_with_people: string
          additional_information?: string
          time_dedicated_to_training?: string
          submission_date: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          dog_name: string
          dog_age: string
          dog_sex: string
          dog_breed: string
          neutered_spayed_details: string
          main_problem?: string
          problem_tendency_first_noticed?: string
          problem_frequency_details?: string
          problem_recent_changes?: string
          problem_anticipation_details?: string
          dog_motivation_for_problem?: string
          problem_addressing_attempts?: string
          ideal_training_outcome?: string
          other_help_needed?: string
          medical_history?: string
          vet_consultation_details?: string
          dog_origin?: string
          rescue_background?: string
          dog_age_when_acquired?: string
          diet_details?: string
          food_motivation_level?: string
          mealtime_routine?: string
          treat_routine?: string
          external_treats_consent?: string
          play_engagement?: string
          affection_response?: string
          exercise_routine?: string
          muzzle_usage?: string
          reaction_to_familiar_people?: string
          reaction_to_unfamiliar_people?: string
          housetrained_status?: string
          activities_aside_from_walks?: string
          dog_likes?: string
          dog_challenges?: string
          positive_reinforcement_methods?: string
          favorite_rewards?: string
          correction_methods?: string
          correction_effects?: string
          previous_professional_training?: string
          previous_training_methods_used?: string
          previous_training_experience_results?: string
          sociability_with_dogs?: string
          sociability_with_people?: string
          additional_information?: string
          time_dedicated_to_training?: string
          submission_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          dog_name?: string
          dog_age?: string
          dog_sex?: string
          dog_breed?: string
          neutered_spayed_details?: string
          main_problem?: string
          problem_tendency_first_noticed?: string
          problem_frequency_details?: string
          problem_recent_changes?: string
          problem_anticipation_details?: string
          dog_motivation_for_problem?: string
          problem_addressing_attempts?: string
          ideal_training_outcome?: string
          other_help_needed?: string
          medical_history?: string
          vet_consultation_details?: string
          dog_origin?: string
          rescue_background?: string
          dog_age_when_acquired?: string
          diet_details?: string
          food_motivation_level?: string
          mealtime_routine?: string
          treat_routine?: string
          external_treats_consent?: string
          play_engagement?: string
          affection_response?: string
          exercise_routine?: string
          muzzle_usage?: string
          reaction_to_familiar_people?: string
          reaction_to_unfamiliar_people?: string
          housetrained_status?: string
          activities_aside_from_walks?: string
          dog_likes?: string
          dog_challenges?: string
          positive_reinforcement_methods?: string
          favorite_rewards?: string
          correction_methods?: string
          correction_effects?: string
          previous_professional_training?: string
          previous_training_methods_used?: string
          previous_training_experience_results?: string
          sociability_with_dogs?: string
          sociability_with_people?: string
          additional_information?: string
          time_dedicated_to_training?: string
          submission_date?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Configuration check is now at the top of the file

// Browser client for client-side operations
export const createSupabaseBrowserClient = () => {
  return getSupabaseClient();
};

// Simple client for basic operations
export const supabase = getSupabaseClient();

export type { Database };
