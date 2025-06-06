import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the same Supabase client setup as other membership endpoints
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration is missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Types for new client webhook data from Make.com
interface NewClientWebhookData {
  clientEmail: string;
  clientName: string;
  amount: number;
  paymentDate?: string;
  emailSubject?: string;
  emailBody?: string;
}

// Function to check if client already exists
async function checkClientExists(email: string) {
  console.log('🔍 Checking if client exists with email:', email);
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('clients')
    .select('id, owner_first_name, owner_last_name')
    .eq('contact_email', email.toLowerCase().trim())
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('❌ Error checking client:', error);
    throw error;
  }

  return data;
}

// Function to create new client
async function createNewClient(webhookData: NewClientWebhookData) {
  console.log('👤 Creating new client:', webhookData.clientName);
  const supabase = getSupabaseClient();
  
  // Split client name into first and last name
  const nameParts = webhookData.clientName.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const newClient = {
    owner_first_name: firstName,
    owner_last_name: lastName,
    contact_email: webhookData.clientEmail.toLowerCase().trim(),
    is_member: true, // They're paying, so they're a member
    is_active: true,
    dog_name: 'Unknown', // Default value, can be updated later
    postcode: '', // Can be updated later
    full_address: '', // Can be updated later
    contact_number: null // Can be updated later
  };

  const { data, error } = await supabase
    .from('clients')
    .insert(newClient)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating client:', error);
    throw error;
  }

  console.log('✅ Client created successfully:', data.id);
  return data;
}

// Function to insert membership record for new client
async function insertMembershipForNewClient(webhookData: NewClientWebhookData) {
  console.log('💳 Inserting membership record for new client:', webhookData.clientName);
  const supabase = getSupabaseClient();

  const paymentDate = webhookData.paymentDate || new Date().toISOString().split('T')[0];

  const membershipRecord = {
    email: webhookData.clientEmail,
    client: webhookData.clientName,
    date: paymentDate,
    amount: webhookData.amount,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('memberships')
    .insert(membershipRecord)
    .select()
    .single();

  if (error) {
    console.error('❌ Error inserting membership record:', error);
    throw error;
  }

  console.log('✅ Membership record inserted successfully:', data.id);
  return data;
}

// Main webhook handler for new clients
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 New client membership webhook received');
    
    const webhookData: NewClientWebhookData = await request.json();
    console.log('📨 Webhook data:', webhookData);

    // Validate required fields
    if (!webhookData.clientEmail || !webhookData.clientName || !webhookData.amount) {
      console.error('❌ Missing required fields in webhook data');
      return NextResponse.json(
        { error: 'Missing required fields: clientEmail, clientName, and amount are required' },
        { status: 400 }
      );
    }

    // Check if client already exists
    const existingClient = await checkClientExists(webhookData.clientEmail);
    
    if (existingClient) {
      console.log('⚠️ Client already exists:', existingClient.owner_first_name, existingClient.owner_last_name);
      return NextResponse.json(
        { 
          error: 'Client already exists with this email address',
          suggestion: 'Use /api/memberships/webhook endpoint for existing clients',
          existingClient: {
            id: existingClient.id,
            name: `${existingClient.owner_first_name} ${existingClient.owner_last_name}`
          }
        },
        { status: 409 } // Conflict
      );
    }

    // Create new client
    const newClient = await createNewClient(webhookData);

    // Insert membership record
    const membershipRecord = await insertMembershipForNewClient(webhookData);

    console.log('✅ New client and membership created successfully');
    
    const response = {
      success: true,
      message: `New client ${newClient.owner_first_name} ${newClient.owner_last_name} created with membership`,
      clientId: newClient.id,
      clientName: `${newClient.owner_first_name} ${newClient.owner_last_name}`,
      membershipRecordId: membershipRecord.id,
      isMember: true,
      isNewClient: true
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ New client webhook error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error processing new client webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'New client membership webhook endpoint is active',
    endpoint: '/api/memberships/new-client',
    method: 'POST',
    description: 'Creates new client account and membership record from Make.com',
    workflow: [
      '1. Check if client already exists (returns error if they do)',
      '2. Create new client account',
      '3. Insert new membership record',
      '4. Set client is_member to true'
    ],
    expectedData: {
      clientEmail: 'newclient@example.com (required)',
      clientName: 'John Doe (required)', 
      amount: '25.00 (required)',
      paymentDate: '2025-01-15 (optional, defaults to today)',
      emailSubject: 'Email subject (optional)',
      emailBody: 'Email content (optional)'
    },
    relatedEndpoints: {
      existingClient: '/api/memberships/webhook - For existing client renewals/cancellations',
      cancelOnly: '/api/memberships/cancel - For cancellation-only workflow'
    }
  });
}
