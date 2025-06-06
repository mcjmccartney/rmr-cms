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

// Types for Stripe data via Make.com
interface StripePaymentData {
  customerEmail: string;
  customerName: string;
  paymentDate: string;
  amount: number;
  currency?: string;
  paymentIntentId?: string;
  subscriptionId?: string;
  productName?: string;
  isMembershipPayment: boolean;
}

// Function to check if client exists
async function findOrCreateClient(paymentData: StripePaymentData) {
  console.log('🔍 Finding or creating client for:', paymentData.customerEmail);
  const supabase = getSupabaseClient();
  
  const email = paymentData.customerEmail.toLowerCase().trim();
  
  // Split customer name into first and last name
  const nameParts = paymentData.customerName.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
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

  // Create new client
  console.log('👤 Creating new client:', firstName, lastName);
  const newClient = {
    owner_first_name: firstName,
    owner_last_name: lastName,
    contact_email: email,
    is_member: true,
    is_active: true,
    dog_name: 'Unknown', // Default value, can be updated later
    postcode: '',
    full_address: '',
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

// Function to insert membership record
async function insertMembershipRecord(paymentData: StripePaymentData, client: any) {
  console.log('💳 Inserting membership record for payment:', paymentData.paymentIntentId);
  const supabase = getSupabaseClient();
  
  const paymentDate = new Date(paymentData.paymentDate).toISOString().split('T')[0];
  
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

// Main webhook handler
export async function POST(request: NextRequest) {
  try {
    console.log('💳 Stripe payment webhook received via Make.com');
    
    const paymentData: StripePaymentData = await request.json();
    console.log('📨 Payment data:', JSON.stringify(paymentData, null, 2));

    // Validate required fields
    if (!paymentData.customerEmail || !paymentData.customerName || !paymentData.amount) {
      console.error('❌ Missing required payment data');
      return NextResponse.json(
        { error: 'Missing required fields: customerEmail, customerName, and amount' },
        { status: 400 }
      );
    }

    // Check if this is a membership payment
    if (!paymentData.isMembershipPayment) {
      console.log('ℹ️ Not a membership payment, skipping');
      return NextResponse.json({ 
        success: true, 
        message: 'Non-membership payment, no action taken' 
      });
    }

    // Process membership payment
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
      paymentIntentId: paymentData.paymentIntentId,
      amount: paymentData.amount,
      isNewClient: !client.created_at || new Date(client.created_at).getTime() > Date.now() - 60000 // Created in last minute
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
      customerEmail: 'customer@example.com (required)',
      customerName: 'John Doe (required)',
      paymentDate: '2025-01-15T10:30:00Z (required)',
      amount: '25.00 (required)',
      currency: 'gbp (optional)',
      paymentIntentId: 'pi_1234567890 (optional)',
      subscriptionId: 'sub_1234567890 (optional)',
      productName: 'Monthly Membership (optional)',
      isMembershipPayment: 'true (required)'
    },
    makeComSetup: {
      step1: 'Stripe "Watch Events" trigger is already set up ✅',
      step2: 'Add HTTP module pointing to this endpoint',
      step3: 'Map Stripe fields to expected data structure',
      step4: 'Test with a sample payment'
    }
  });
}
