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

// Types for Squarespace data via Make.com
interface SquarespaceOrderData {
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  productName: string;
  isMembershipOrder: boolean;
  billingAddress?: {
    address1?: string;
    city?: string;
    postalCode?: string;
    countryCode?: string;
  };
}

// Function to check if client exists
async function findOrCreateClient(orderData: SquarespaceOrderData) {
  console.log('🔍 Finding or creating client for:', orderData.customerEmail);
  const supabase = getSupabaseClient();

  const email = orderData.customerEmail.toLowerCase().trim();
  const firstName = orderData.customerFirstName;
  const lastName = orderData.customerLastName;

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
    postcode: orderData.billingAddress?.postalCode || '',
    full_address: [
      orderData.billingAddress?.address1,
      orderData.billingAddress?.city,
      orderData.billingAddress?.postalCode,
      orderData.billingAddress?.countryCode
    ].filter(Boolean).join(', '),
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
async function insertMembershipRecord(orderData: SquarespaceOrderData, client: any) {
  console.log('💳 Inserting membership record for order:', orderData.orderNumber);
  const supabase = getSupabaseClient();

  const orderDate = new Date(orderData.orderDate).toISOString().split('T')[0];

  const membershipRecord = {
    email: client.contact_email,
    client: `${client.owner_first_name} ${client.owner_last_name}`,
    date: orderDate,
    amount: orderData.totalAmount,
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
    console.log('🏪 Squarespace order webhook received via Make.com');

    const orderData: SquarespaceOrderData = await request.json();
    console.log('📨 Order data:', JSON.stringify(orderData, null, 2));

    // Validate required fields
    if (!orderData.customerEmail || !orderData.customerFirstName || !orderData.customerLastName) {
      console.error('❌ Missing required customer data');
      return NextResponse.json(
        { error: 'Missing required fields: customerEmail, customerFirstName, customerLastName' },
        { status: 400 }
      );
    }

    // Check if this is a membership order
    if (!orderData.isMembershipOrder) {
      console.log('ℹ️ Not a membership order, skipping');
      return NextResponse.json({
        success: true,
        message: 'Non-membership order, no action taken'
      });
    }

    // Process membership order
    console.log('🔄 Processing membership order...');

    // Find or create client
    const client = await findOrCreateClient(orderData);

    // Insert membership record
    const membershipRecord = await insertMembershipRecord(orderData, client);

    // Update client membership status
    await updateClientMembership(client.id, true);

    console.log('✅ Squarespace membership order processed successfully');

    return NextResponse.json({
      success: true,
      message: `Membership order processed for ${client.owner_first_name} ${client.owner_last_name}`,
      clientId: client.id,
      clientName: `${client.owner_first_name} ${client.owner_last_name}`,
      membershipRecordId: membershipRecord.id,
      orderNumber: orderData.orderNumber,
      amount: orderData.totalAmount,
      isNewClient: !client.created_at || new Date(client.created_at).getTime() > Date.now() - 60000 // Created in last minute
    });

  } catch (error) {
    console.error('❌ Squarespace webhook error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error processing Squarespace webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Squarespace order webhook endpoint is active (via Make.com)',
    endpoint: '/api/squarespace/webhook',
    method: 'POST',
    description: 'Processes Squarespace orders via Make.com for membership management',
    workflow: [
      '1. Squarespace order created',
      '2. Make.com detects new order',
      '3. Make.com filters for membership products',
      '4. Make.com sends order data to this endpoint',
      '5. Find existing client or create new one',
      '6. Insert membership record',
      '7. Set client is_member to true'
    ],
    expectedData: {
      customerEmail: 'customer@example.com (required)',
      customerFirstName: 'John (required)',
      customerLastName: 'Doe (required)',
      orderNumber: 'SS-12345 (required)',
      orderDate: '2025-01-15 (required)',
      totalAmount: '25.00 (required)',
      productName: 'Monthly Membership (optional)',
      isMembershipOrder: 'true (required)',
      billingAddress: {
        address1: '123 Main St (optional)',
        city: 'London (optional)',
        postalCode: 'SW1A 1AA (optional)',
        countryCode: 'GB (optional)'
      }
    },
    makeComSetup: {
      step1: 'Create new Make.com scenario',
      step2: 'Add Squarespace "Watch Orders" trigger',
      step3: 'Add filter: Product name contains "membership"',
      step4: 'Add HTTP module with URL: https://rmr-cms.vercel.app/api/squarespace/webhook',
      step5: 'Map Squarespace fields to expected data structure'
    }
  });
}
