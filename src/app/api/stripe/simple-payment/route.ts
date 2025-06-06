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

// Simple function to mark session as paid
async function markSessionAsPaid(sessionId: string) {
  console.log('💳 Marking session as paid:', sessionId);
  const supabase = getSupabaseClient();
  
  // First, check if session exists
  const { data: existingSession, error: findError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (findError && findError.code !== 'PGRST116') {
    console.error('❌ Error finding session:', findError);
    throw findError;
  }

  if (!existingSession) {
    console.error('❌ Session not found:', sessionId);
    throw new Error(`Session with ID ${sessionId} not found`);
  }

  console.log('✅ Found existing session:', existingSession.id);

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
    .eq('id', sessionId)
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

    // Extract sessionId from various possible fields
    const sessionId = body.sessionId || body.session_id || body.id || body.metadata?.sessionId;

    if (!sessionId) {
      console.error('❌ Missing sessionId in request');
      return NextResponse.json(
        { 
          error: 'Missing sessionId. Please provide sessionId in request body.',
          receivedData: body
        },
        { status: 400 }
      );
    }

    console.log('🔄 Processing payment for sessionId:', sessionId);

    // Mark session as paid
    const updatedSession = await markSessionAsPaid(sessionId);

    console.log('✅ Payment processed successfully');

    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} marked as paid successfully`,
      sessionId: updatedSession.id,
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
      sessionId: 'session_12345 (required)',
      // Alternative field names also supported:
      session_id: 'session_12345',
      id: 'session_12345',
      'metadata.sessionId': 'session_12345'
    },
    examples: {
      simple: {
        sessionId: '0a61175c-977d-4574-ac49-071c9e51ae86'
      },
      withMetadata: {
        sessionId: '0a61175c-977d-4574-ac49-071c9e51ae86',
        stripeSessionId: 'cs_1234567890',
        amount: 75.00,
        customerEmail: 'customer@example.com'
      }
    },
    makeComIntegration: {
      step1: 'Add Stripe webhook module to watch for payment.succeeded events',
      step2: 'Extract sessionId from the original payment URL or metadata',
      step3: 'Send HTTP POST request to this endpoint with sessionId',
      step4: 'Session will be automatically marked as paid'
    },
    testUrl: 'Send POST request to this URL with {"sessionId": "your-session-id"}'
  });
}
