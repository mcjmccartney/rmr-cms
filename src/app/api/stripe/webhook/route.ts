import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the same Supabase client setup
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration is missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Types for Stripe data via Make.com (matching your JSON structure)
interface StripePaymentData {
  email: string;
  date: string;
  amount: number;
  postCode?: string;
  country?: string;
}

// Function to check if client exists (simplified for your data structure)
async function findOrCreateClient(paymentData: StripePaymentData) {
  console.log('🔍 Finding or creating client for:', paymentData.email);
  const supabase = getSupabaseClient();

  const email = paymentData.email.toLowerCase().trim();

  // Try to find existing client
  const { data: existingClient, error: findError } = await supabase
    .from('clients')
    .select('*')
    .eq('contact_email', email)
    .single();

  if (findError && findError.code !== 'PGRST116') {
    console.error('❌ Error finding client:', findError);
    throw findError;
  }

  if (existingClient) {
    console.log('✅ Found existing client:', existingClient.owner_first_name, existingClient.owner_last_name);
    return existingClient;
  }

  // Create new client with minimal data (since we don't have name from your JSON)
  console.log('👤 Creating new client for email:', email);
  const newClient = {
    owner_first_name: 'Unknown', // Will need to be updated manually
    owner_last_name: 'Client',
    contact_email: email,
    is_member: true,
    is_active: true,
    dog_name: 'Unknown',
    postcode: paymentData.postCode || '',
    full_address: paymentData.country || '',
    contact_number: null
  };

  const { data: createdClient, error: createError } = await supabase
    .from('clients')
    .insert(newClient)
    .select()
    .single();

  if (createError) {
    console.error('❌ Error creating client:', createError);
    throw createError;
  }

  console.log('✅ Client created successfully:', createdClient.id);
  return createdClient;
}

// Function to insert membership record (matching your data structure)
async function insertMembershipRecord(paymentData: StripePaymentData, client: any) {
  console.log('💳 Inserting membership record for payment');
  const supabase = getSupabaseClient();

  // Convert timestamp to date format if needed
  let paymentDate: string;
  if (paymentData.date.includes('T') || paymentData.date.includes(' ')) {
    // If it's a timestamp, convert to date
    paymentDate = new Date(paymentData.date).toISOString().split('T')[0];
  } else {
    // If it's already a date, use as is
    paymentDate = paymentData.date;
  }

  const membershipRecord = {
    email: client.contact_email,
    client: `${client.owner_first_name} ${client.owner_last_name}`,
    date: paymentDate,
    amount: paymentData.amount,
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

// Function to update client membership status
async function updateClientMembership(clientId: string, isMember: boolean) {
  console.log('📝 Updating client membership status:', clientId, 'to', isMember);
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('clients')
    .update({ is_member: isMember })
    .eq('id', clientId);

  if (error) {
    console.error('❌ Error updating client membership:', error);
    throw error;
  }

  console.log('✅ Client membership status updated successfully');
  return true;
}

// Main webhook handler (updated to match your JSON structure)
export async function POST(request: NextRequest) {
  try {
    console.log('💳 Stripe payment webhook received via Make.com');

    const paymentData: StripePaymentData = await request.json();
    console.log('📨 Payment data:', JSON.stringify(paymentData, null, 2));

    // Validate required fields (matching your JSON structure)
    if (!paymentData.email || !paymentData.amount || !paymentData.date) {
      console.error('❌ Missing required payment data');
      return NextResponse.json(
        { error: 'Missing required fields: email, amount, and date' },
        { status: 400 }
      );
    }

    // Process membership payment (assuming all payments sent here are membership payments)
    console.log('🔄 Processing membership payment...');

    // Find or create client
    const client = await findOrCreateClient(paymentData);

    // Insert membership record
    const membershipRecord = await insertMembershipRecord(paymentData, client);

    // Update client membership status
    await updateClientMembership(client.id, true);

    console.log('✅ Stripe membership payment processed successfully');

    return NextResponse.json({
      success: true,
      message: `Membership payment processed for ${client.owner_first_name} ${client.owner_last_name}`,
      clientId: client.id,
      clientName: `${client.owner_first_name} ${client.owner_last_name}`,
      membershipRecordId: membershipRecord.id,
      email: paymentData.email,
      amount: paymentData.amount,
      date: paymentData.date,
      postCode: paymentData.postCode,
      country: paymentData.country,
      isNewClient: !client.created_at || new Date(client.created_at).getTime() > Date.now() - 60000
    });

  } catch (error) {
    console.error('❌ Stripe webhook error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error processing Stripe webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Stripe payment webhook endpoint is active (via Make.com)',
    endpoint: '/api/stripe/webhook',
    method: 'POST',
    description: 'Processes Stripe payments via Make.com for membership management',
    workflow: [
      '1. Stripe payment completed',
      '2. Make.com detects payment event',
      '3. Make.com filters for membership payments',
      '4. Make.com sends payment data to this endpoint',
      '5. Find existing client or create new one',
      '6. Insert membership record',
      '7. Set client is_member to true'
    ],
    expectedData: {
      email: 'customer@example.com (required)',
      date: '2025-01-15 or timestamp (required)',
      amount: '25.00 (required)',
      postCode: 'SW1A 1AA (optional)',
      country: 'GB (optional)'
    },
    makeComSetup: {
      step1: 'Stripe "Watch Events" trigger is already set up ✅',
      step2: 'Add HTTP module with URL: https://rmr-cms.vercel.app/api/stripe/webhook',
      step3: 'Map Stripe fields to expected data structure',
      step4: 'Test with a sample payment'
    }
  });
}
