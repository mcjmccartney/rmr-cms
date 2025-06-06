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

// Function to mark session as paid by email
async function markSessionAsPaidByEmail(customerEmail: string, sessionId?: string) {
  console.log('💳 Finding unpaid session for email:', customerEmail);
  const supabase = getSupabaseClient();

  let query = supabase
    .from('sessions')
    .select('*')
    .eq('email', customerEmail) // Use 'email' field from sessions table
    .eq('deposit_paid', false)
    .order('created_at', { ascending: false }); // Get most recent first

  // If sessionId is provided, use it as additional filter
  if (sessionId) {
    console.log('🔍 Also filtering by sessionId:', sessionId);
    query = query.eq('id', sessionId);
  }

  const { data: unpaidSessions, error: findError } = await query;

  if (findError) {
    console.error('❌ Error finding unpaid sessions:', findError);
    throw findError;
  }

  if (!unpaidSessions || unpaidSessions.length === 0) {
    console.error('❌ No unpaid sessions found for email:', customerEmail);
    throw new Error(`No unpaid sessions found for email ${customerEmail}`);
  }

  // Take the most recent unpaid session
  const sessionToUpdate = unpaidSessions[0];
  console.log('✅ Found unpaid session to mark as paid:', {
    id: sessionToUpdate.id,
    clientName: sessionToUpdate.client_name,
    clientEmail: sessionToUpdate.client_email,
    date: sessionToUpdate.date,
    time: sessionToUpdate.time,
    amount: sessionToUpdate.amount
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

    // Extract email and optional sessionId from request
    const customerEmail = body.customerEmail || body.customer_email || body.email;
    const sessionId = body.sessionId || body.session_id || body.id || body.metadata?.sessionId;

    if (!customerEmail) {
      console.error('❌ Missing customerEmail in request');
      return NextResponse.json(
        {
          error: 'Missing customerEmail. Please provide customerEmail in request body.',
          receivedData: body,
          expectedFields: ['customerEmail', 'customer_email', 'email']
        },
        { status: 400 }
      );
    }

    console.log('🔄 Processing payment for email:', customerEmail);
    if (sessionId) {
      console.log('🔍 Also checking sessionId:', sessionId);
    }

    // Mark session as paid by email
    const updatedSession = await markSessionAsPaidByEmail(customerEmail, sessionId);

    console.log('✅ Payment processed successfully');

    return NextResponse.json({
      success: true,
      message: `Session ${updatedSession.id} marked as paid successfully for ${customerEmail}`,
      sessionId: updatedSession.id,
      customerEmail: customerEmail,
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
      customerEmail: 'customer@example.com (required)',
      // Alternative field names also supported:
      customer_email: 'customer@example.com',
      email: 'customer@example.com',
      // Optional sessionId for additional filtering:
      sessionId: 'session_12345 (optional)',
      session_id: 'session_12345 (optional)'
    },
    examples: {
      byEmailOnly: {
        customerEmail: 'john@example.com'
      },
      byEmailAndSession: {
        customerEmail: 'john@example.com',
        sessionId: '0a61175c-977d-4574-ac49-071c9e51ae86'
      },
      stripeWebhookFormat: {
        customer_email: 'john@example.com',
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
      description: 'Finds the most recent session where client_email matches and deposit_paid = false',
      advantages: [
        'No need to track sessionIds in URLs',
        'Works with existing Stripe setup',
        'Handles multiple sessions gracefully',
        'More intuitive customer matching'
      ]
    },
    testUrl: 'Send POST request to this URL with {"customerEmail": "customer@example.com"}'
  });
}
