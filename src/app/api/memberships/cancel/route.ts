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

// Types for cancellation webhook data from Make.com
interface CancellationWebhookData {
  clientEmail: string;
  clientName?: string; // Optional since we're just matching by email
  cancellationDate?: string;
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

// Function to cancel client membership
async function cancelClientMembership(clientId: string) {
  console.log('❌ Cancelling client membership:', clientId);
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('clients')
    .update({ 
      is_member: false
    })
    .eq('id', clientId);

  if (error) {
    console.error('❌ Error cancelling client membership:', error);
    throw error;
  }

  console.log('✅ Client membership cancelled successfully');
  return true;
}

// Function to log cancellation history (optional)
async function logCancellationHistory(webhookData: CancellationWebhookData, clientId: string) {
  console.log('📊 Logging cancellation history for client:', clientId);
  const supabase = getSupabaseClient();
  
  try {
    // Check if membership_history table exists, if not we'll skip logging
    const { data, error } = await supabase
      .from('membership_history')
      .insert({
        client_id: clientId,
        status: 'cancelled',
        renewal_date: webhookData.cancellationDate || new Date().toISOString().split('T')[0],
        membership_type: 'monthly',
        amount: 0, // No amount for cancellations
        email_subject: webhookData.emailSubject,
        processed_at: new Date().toISOString()
      });

    if (error) {
      console.warn('⚠️ Could not log cancellation history (table may not exist):', error.message);
      // Don't throw error - this is optional functionality
    } else {
      console.log('✅ Cancellation history logged successfully');
    }
  } catch (err) {
    console.warn('⚠️ Cancellation history logging failed:', err);
    // Don't throw error - this is optional functionality
  }
}

// Main webhook handler for cancellations
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Membership cancellation webhook received');
    
    const webhookData: CancellationWebhookData = await request.json();
    console.log('📨 Webhook data:', webhookData);

    // Validate required fields
    if (!webhookData.clientEmail) {
      console.error('❌ Missing required field: clientEmail');
      return NextResponse.json(
        { error: 'Missing required field: clientEmail is required' },
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

    // Check if client is already not a member
    if (!client.is_member) {
      console.log('⚠️ Client is already not a member');
      return NextResponse.json({
        success: true,
        message: `Client ${client.owner_first_name} ${client.owner_last_name} is already not a member`,
        clientId: client.id,
        clientName: `${client.owner_first_name} ${client.owner_last_name}`,
        isMember: false,
        alreadyCancelled: true
      });
    }

    // Cancel client membership
    await cancelClientMembership(client.id);

    // Log cancellation history (optional)
    await logCancellationHistory(webhookData, client.id);

    console.log('✅ Membership cancellation processed successfully');
    
    const response = {
      success: true,
      message: `Client ${client.owner_first_name} ${client.owner_last_name} membership cancelled successfully`,
      clientId: client.id,
      clientName: `${client.owner_first_name} ${client.owner_last_name}`,
      isMember: false,
      cancellationProcessed: true
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Membership cancellation webhook error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error processing membership cancellation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Membership cancellation webhook endpoint is active',
    endpoint: '/api/memberships/cancel',
    method: 'POST',
    description: 'Cancels membership for existing clients (sets is_member to false)',
    workflow: [
      '1. Find existing client by email',
      '2. Set client is_member to false',
      '3. Log cancellation history (optional)'
    ],
    expectedData: {
      clientEmail: 'client@example.com (required)',
      clientName: 'John Doe (optional)',
      cancellationDate: '2025-01-15 (optional, defaults to today)',
      emailSubject: 'Email subject (optional)',
      emailBody: 'Email content (optional)'
    },
    relatedEndpoints: {
      existingClient: '/api/memberships/webhook - For existing client renewals/cancellations',
      newClient: '/api/memberships/new-client - For creating new client accounts'
    }
  });
}
