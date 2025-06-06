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

// Types for membership webhook data from Make.com
interface MembershipWebhookData {
  clientEmail: string;
  clientName: string;
  amount: number;
  membershipStatus: 'renewed' | 'cancelled';
  paymentDate?: string;
  emailSubject?: string;
  emailBody?: string;
}

// Function to find client by email
async function findClientByEmail(email: string) {
  console.log('🔍 Looking for client with email:', email);
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('contact_email', email.toLowerCase().trim())
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('❌ Error finding client:', error);
    return null;
  }

  if (data) {
    console.log('✅ Found client:', data.owner_first_name, data.owner_last_name);
  } else {
    console.log('❌ No client found with email:', email);
  }

  return data;
}

// Function to update client membership status
async function updateClientMembership(clientId: string, membershipStatus: 'renewed' | 'cancelled') {
  console.log('📝 Updating client membership:', clientId, 'to', membershipStatus);
  const supabase = getSupabaseClient();

  const isMember = membershipStatus === 'renewed';

  const { error } = await supabase
    .from('clients')
    .update({
      is_member: isMember
    })
    .eq('id', clientId);

  if (error) {
    console.error('❌ Error updating client membership:', error);
    throw error;
  }

  console.log('✅ Client membership updated successfully');
  return true;
}

// Function to insert new membership record (for renewals only)
async function insertMembershipRecord(clientEmail: string, clientName: string, webhookData: MembershipWebhookData) {
  console.log('💳 Inserting new membership record for client:', clientName);
  const supabase = getSupabaseClient();

  const paymentDate = webhookData.paymentDate || new Date().toISOString().split('T')[0];

  const membershipRecord = {
    email: clientEmail,
    client: clientName,
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

// Function to log membership history (optional but recommended)
async function logMembershipHistory(webhookData: MembershipWebhookData, clientId: string) {
  console.log('📊 Logging membership history for client:', clientId);
  const supabase = getSupabaseClient();

  try {
    // Check if membership_history table exists, if not we'll skip logging
    const { data, error } = await supabase
      .from('membership_history')
      .insert({
        client_id: clientId,
        status: webhookData.membershipStatus,
        renewal_date: webhookData.paymentDate || new Date().toISOString().split('T')[0],
        membership_type: 'monthly',
        amount: webhookData.amount,
        email_subject: webhookData.emailSubject,
        processed_at: new Date().toISOString()
      });

    if (error) {
      console.warn('⚠️ Could not log membership history (table may not exist):', error.message);
      // Don't throw error - this is optional functionality
    } else {
      console.log('✅ Membership history logged successfully');
    }
  } catch (err) {
    console.warn('⚠️ Membership history logging failed:', err);
    // Don't throw error - this is optional functionality
  }
}

// Main webhook handler
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Membership webhook received');

    const webhookData: MembershipWebhookData = await request.json();
    console.log('📨 Webhook data:', webhookData);

    // Validate required fields
    if (!webhookData.clientEmail || !webhookData.clientName || !webhookData.membershipStatus) {
      console.error('❌ Missing required fields in webhook data');
      return NextResponse.json(
        { error: 'Missing required fields: clientEmail, clientName, and membershipStatus are required' },
        { status: 400 }
      );
    }

    // For renewals, amount is required
    if (webhookData.membershipStatus === 'renewed' && !webhookData.amount) {
      console.error('❌ Amount is required for membership renewals');
      return NextResponse.json(
        { error: 'Amount is required for membership renewals' },
        { status: 400 }
      );
    }

    // Validate membership status
    if (!['renewed', 'cancelled'].includes(webhookData.membershipStatus)) {
      console.error('❌ Invalid membership status:', webhookData.membershipStatus);
      return NextResponse.json(
        { error: 'Invalid membershipStatus. Must be "renewed" or "cancelled"' },
        { status: 400 }
      );
    }

    // Find client by email
    const client = await findClientByEmail(webhookData.clientEmail);

    if (!client) {
      console.error('❌ Client not found for email:', webhookData.clientEmail);
      return NextResponse.json(
        { error: 'Client not found with the provided email address' },
        { status: 404 }
      );
    }

    let membershipRecord = null;

    // Process based on membership status
    if (webhookData.membershipStatus === 'renewed') {
      console.log('🔄 Processing membership renewal...');

      // 1. Insert new membership record
      membershipRecord = await insertMembershipRecord(client.contact_email, webhookData.clientName, webhookData);

      // 2. Update client membership status to true
      await updateClientMembership(client.id, 'renewed');

    } else if (webhookData.membershipStatus === 'cancelled') {
      console.log('❌ Processing membership cancellation...');

      // Only update client membership status to false (no membership record insertion)
      await updateClientMembership(client.id, 'cancelled');
    }

    // Log membership history (optional)
    await logMembershipHistory(webhookData, client.id);

    console.log('✅ Membership webhook processed successfully');

    const response = {
      success: true,
      message: `Client ${client.owner_first_name} ${client.owner_last_name} membership ${webhookData.membershipStatus} successfully`,
      clientId: client.id,
      clientName: `${client.owner_first_name} ${client.owner_last_name}`,
      membershipStatus: webhookData.membershipStatus,
      isMember: webhookData.membershipStatus === 'renewed',
      ...(membershipRecord && { membershipRecordId: membershipRecord.id })
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Membership webhook error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error processing membership webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Membership webhook endpoint is active',
    endpoint: '/api/memberships/webhook',
    method: 'POST',
    description: 'Processes membership renewals and cancellations for EXISTING clients',
    workflow: {
      renewals: [
        '1. Find existing client by email',
        '2. Insert new record into memberships table',
        '3. Set client is_member to true'
      ],
      cancellations: [
        '1. Find existing client by email',
        '2. Set client is_member to false',
        '3. No membership record insertion'
      ]
    },
    expectedData: {
      clientEmail: 'client@example.com (required)',
      clientName: 'John Doe (required)',
      amount: '25.00 (required for renewals)',
      membershipStatus: 'renewed | cancelled (required)',
      paymentDate: '2025-01-15 (optional, defaults to today)',
      emailSubject: 'Email subject (optional)',
      emailBody: 'Email content (optional)'
    },
    relatedEndpoints: {
      newClient: '/api/memberships/new-client - For creating new client accounts',
      cancelOnly: '/api/memberships/cancel - For cancellation-only workflow'
    }
  });
}
