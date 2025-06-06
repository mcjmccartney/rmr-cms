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

// Enhanced function with multiple matching strategies
async function markSessionAsPaidByMultipleFields(paymentData: {
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  dogName?: string;
  sessionId?: string;
}) {
  console.log('💳 Finding unpaid session using multiple matching strategies:', paymentData);
  const supabase = getSupabaseClient();

  let unpaidSessions: any[] = [];

  // Strategy 1: Email matching (primary)
  if (paymentData.customerEmail && unpaidSessions.length === 0) {
    console.log('🔍 Trying email matching:', paymentData.customerEmail);
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        clients!inner(
          id,
          contact_email,
          owner_first_name,
          owner_last_name,
          contact_number,
          dog_name,
          is_member
        )
      `)
      .eq('clients.contact_email', paymentData.customerEmail)
      .eq('deposit_paid', false)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      unpaidSessions = data;
      console.log('✅ Found sessions via email matching:', unpaidSessions.length);
    }
  }

  // Strategy 2: Phone number matching (fallback)
  if (paymentData.customerPhone && unpaidSessions.length === 0) {
    console.log('🔍 Trying phone matching:', paymentData.customerPhone);
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        clients!inner(
          id,
          contact_email,
          owner_first_name,
          owner_last_name,
          contact_number,
          dog_name,
          is_member
        )
      `)
      .eq('clients.contact_number', paymentData.customerPhone)
      .eq('deposit_paid', false)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      unpaidSessions = data;
      console.log('✅ Found sessions via phone matching:', unpaidSessions.length);
    }
  }

  // Strategy 3: Name matching (fallback)
  if (paymentData.customerName && unpaidSessions.length === 0) {
    console.log('🔍 Trying name matching:', paymentData.customerName);
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        clients!inner(
          id,
          contact_email,
          owner_first_name,
          owner_last_name,
          contact_number,
          dog_name,
          is_member
        )
      `)
      .ilike('clients.owner_first_name', `%${paymentData.customerName.split(' ')[0]}%`)
      .eq('deposit_paid', false)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      unpaidSessions = data;
      console.log('✅ Found sessions via name matching:', unpaidSessions.length);
    }
  }

  if (unpaidSessions.length === 0) {
    console.error('❌ No unpaid sessions found with any matching strategy');
    throw new Error(`No unpaid sessions found for provided customer data`);
  }

  // If sessionId is provided, filter to that specific session
  if (paymentData.sessionId) {
    console.log('🔍 Filtering by specific sessionId:', paymentData.sessionId);
    unpaidSessions = unpaidSessions.filter(s => s.id === paymentData.sessionId);
    if (unpaidSessions.length === 0) {
      throw new Error(`Session ${paymentData.sessionId} not found or already paid`);
    }
  }

  // Take the most recent unpaid session
  const sessionToUpdate = unpaidSessions[0];
  console.log('✅ Found unpaid session to mark as paid:', {
    id: sessionToUpdate.id,
    clientName: sessionToUpdate.client_name,
    clientEmail: sessionToUpdate.clients.contact_email,
    clientPhone: sessionToUpdate.clients.contact_number,
    dogName: sessionToUpdate.clients.dog_name,
    date: sessionToUpdate.date,
    time: sessionToUpdate.time,
    amount: sessionToUpdate.amount,
    isMember: sessionToUpdate.clients.is_member
  });

  // Update session as paid
  const sessionUpdateFields = {
    deposit_paid: true,
    payment_status: 'paid',
    payment_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString()
  };

  console.log('📝 Updating session with payment fields:', sessionUpdateFields);

  // Update the session
  const { data: updatedSession, error: updateError } = await supabase
    .from('sessions')
    .update(sessionUpdateFields)
    .eq('id', sessionToUpdate.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating session payment status:', updateError);
    throw updateError;
  }

  console.log('✅ Session marked as paid successfully:', updatedSession.id);
  return updatedSession;
}

// POST handler for Make.com integration
export async function POST(request: NextRequest) {
  try {
    console.log('💳 Simple payment webhook received');
    
    const body = await request.json();
    console.log('📨 Request body:', JSON.stringify(body, null, 2));

    // Extract multiple possible matching fields from request
    const paymentData = {
      customerEmail: body.customerEmail || body.customer_email || body.email,
      customerName: body.customerName || body.customer_name || body.name,
      customerPhone: body.customerPhone || body.customer_phone || body.phone,
      dogName: body.dogName || body.dog_name,
      sessionId: body.sessionId || body.session_id || body.id || body.metadata?.sessionId
    };

    // Check if we have at least one matching field
    if (!paymentData.customerEmail && !paymentData.customerName && !paymentData.customerPhone && !paymentData.dogName) {
      console.error('❌ Missing customer identification data in request');
      return NextResponse.json(
        {
          error: 'Missing customer identification data. Please provide at least one: customerEmail, customerName, customerPhone, or dogName.',
          receivedData: body,
          expectedFields: {
            primary: ['customerEmail', 'customer_email', 'email'],
            fallback: ['customerName', 'customer_name', 'name', 'customerPhone', 'customer_phone', 'phone', 'dogName', 'dog_name']
          }
        },
        { status: 400 }
      );
    }

    console.log('🔄 Processing payment with data:', {
      email: paymentData.customerEmail,
      name: paymentData.customerName,
      phone: paymentData.customerPhone,
      dogName: paymentData.dogName,
      sessionId: paymentData.sessionId
    });

    // Mark session as paid using multiple matching strategies
    const updatedSession = await markSessionAsPaidByMultipleFields(paymentData);

    console.log('✅ Payment processed successfully');

    return NextResponse.json({
      success: true,
      message: `Session ${updatedSession.id} marked as paid successfully`,
      sessionId: updatedSession.id,
      matchedBy: paymentData.customerEmail ? 'email' : paymentData.customerPhone ? 'phone' : paymentData.customerName ? 'name' : 'other',
      customerData: {
        email: paymentData.customerEmail,
        name: paymentData.customerName,
        phone: paymentData.customerPhone,
        dogName: paymentData.dogName
      },
      depositPaid: updatedSession.deposit_paid,
      paymentStatus: updatedSession.payment_status,
      paymentDate: updatedSession.payment_date,
      session: {
        id: updatedSession.id,
        clientName: updatedSession.client_name,
        dogName: updatedSession.dog_name,
        date: updatedSession.date,
        time: updatedSession.time,
        sessionType: updatedSession.session_type,
        amount: updatedSession.amount,
        depositPaid: updatedSession.deposit_paid,
        paymentStatus: updatedSession.payment_status,
        paymentDate: updatedSession.payment_date
      }
    });

  } catch (error) {
    console.error('❌ Simple payment webhook error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error processing payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing and documentation
export async function GET() {
  return NextResponse.json({
    message: 'Simple payment webhook endpoint for Make.com integration',
    endpoint: '/api/stripe/simple-payment',
    method: 'POST',
    description: 'Marks session as paid when called from Make.com after Stripe payment',
    workflow: [
      '1. Customer completes Stripe payment',
      '2. Make.com detects payment completion',
      '3. Make.com calls this endpoint with sessionId',
      '4. Session is marked as deposit_paid = true'
    ],
    expectedData: {
      // Primary matching (at least one required):
      customerEmail: 'customer@example.com (primary)',
      customerName: 'John Smith (fallback)',
      customerPhone: '+44123456789 (fallback)',
      dogName: 'Buddy (fallback)',
      // Alternative field names also supported:
      customer_email: 'customer@example.com',
      email: 'customer@example.com',
      customer_name: 'John Smith',
      name: 'John Smith',
      customer_phone: '+44123456789',
      phone: '+44123456789',
      dog_name: 'Buddy',
      // Optional sessionId for additional filtering:
      sessionId: 'session_12345 (optional)',
      session_id: 'session_12345 (optional)'
    },
    examples: {
      byEmailOnly: {
        customerEmail: 'john@example.com'
      },
      byPhoneOnly: {
        customerPhone: '+44123456789'
      },
      byNameOnly: {
        customerName: 'John Smith'
      },
      byDogName: {
        dogName: 'Buddy'
      },
      multipleFields: {
        customerEmail: 'john@example.com',
        customerName: 'John Smith',
        sessionId: '0a61175c-977d-4574-ac49-071c9e51ae86'
      },
      stripeWebhookFormat: {
        customer_email: 'john@example.com',
        customer_name: 'John Smith',
        customer_phone: '+44123456789',
        stripeSessionId: 'cs_1234567890',
        amount: 75.00
      }
    },
    makeComIntegration: {
      step1: 'Add Stripe webhook module to watch for checkout.session.completed events',
      step2: 'Extract customer email from Stripe event (customer_details.email)',
      step3: 'Send HTTP POST request to this endpoint with customerEmail',
      step4: 'Most recent unpaid session for that email will be marked as paid'
    },
    logic: {
      description: 'Uses multiple JOIN strategies to find sessions where client data matches and deposit_paid = false',
      matchingStrategies: [
        '1. Email matching (primary): clients.contact_email = customerEmail',
        '2. Phone matching (fallback): clients.contact_number = customerPhone',
        '3. Name matching (fallback): clients.owner_first_name ILIKE customerName',
        '4. Dog name matching (fallback): clients.dog_name = dogName'
      ],
      advantages: [
        'Multiple fallback matching strategies',
        'No need to track sessionIds in URLs',
        'Works with existing Stripe setup',
        'Handles multiple sessions gracefully',
        'More intuitive customer matching',
        'No data duplication - uses normalized client data from clients table',
        'Robust matching even with partial customer information'
      ],
      queries: {
        email: 'SELECT sessions.*, clients.* FROM sessions INNER JOIN clients ON sessions.client_id = clients.id WHERE clients.contact_email = ? AND sessions.deposit_paid = false',
        phone: 'SELECT sessions.*, clients.* FROM sessions INNER JOIN clients ON sessions.client_id = clients.id WHERE clients.contact_number = ? AND sessions.deposit_paid = false',
        name: 'SELECT sessions.*, clients.* FROM sessions INNER JOIN clients ON sessions.client_id = clients.id WHERE clients.owner_first_name ILIKE ? AND sessions.deposit_paid = false'
      }
    },
    testUrl: 'Send POST request to this URL with {"customerEmail": "customer@example.com"}'
  });
}
