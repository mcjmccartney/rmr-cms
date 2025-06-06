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

// Function to extract sessionId from Stripe event
function extractSessionIdFromStripeEvent(event: any): string | null {
  try {
    // Method 1: Check metadata (if sessionId was added when creating checkout session)
    if (event.data?.object?.metadata?.sessionId) {
      console.log('✅ Found sessionId in metadata:', event.data.object.metadata.sessionId);
      return event.data.object.metadata.sessionId;
    }

    // Method 2: Check success_url for sessionId parameter
    if (event.data?.object?.success_url) {
      const url = new URL(event.data.object.success_url);
      const sessionIdFromUrl = url.searchParams.get('sessionId');
      if (sessionIdFromUrl) {
        console.log('✅ Found sessionId in success_url:', sessionIdFromUrl);
        return sessionIdFromUrl;
      }
    }

    // Method 3: Check client_reference_id (alternative approach)
    if (event.data?.object?.client_reference_id) {
      console.log('✅ Found sessionId in client_reference_id:', event.data.object.client_reference_id);
      return event.data.object.client_reference_id;
    }

    console.log('❌ No sessionId found in Stripe event');
    return null;
  } catch (error) {
    console.error('❌ Error extracting sessionId from Stripe event:', error);
    return null;
  }
}

// Types for Stripe session payment data
interface StripeSessionPaymentData {
  sessionId?: string;
  paymentIntentId?: string;
  amount?: number;
  currency?: string;
  customerEmail?: string;
  paymentStatus: 'succeeded' | 'failed' | 'pending';
  paymentDate?: string;
  // For direct Stripe webhook events
  stripeEvent?: any;
}

// Function to update session payment status
async function updateSessionPaymentStatus(sessionId: string, paymentData: StripeSessionPaymentData) {
  console.log('💳 Updating session payment status:', sessionId);
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

  // Prepare update data based on payment status
  const sessionUpdateFields: any = {
    updated_at: new Date().toISOString()
  };

  if (paymentData.paymentStatus === 'succeeded') {
    sessionUpdateFields.deposit_paid = true;
    sessionUpdateFields.payment_status = 'paid';
    sessionUpdateFields.payment_date = paymentData.paymentDate || new Date().toISOString().split('T')[0];
    
    if (paymentData.paymentIntentId) {
      sessionUpdateFields.payment_intent_id = paymentData.paymentIntentId;
    }
    
    if (paymentData.amount) {
      sessionUpdateFields.amount_paid = paymentData.amount;
    }
  } else if (paymentData.paymentStatus === 'failed') {
    sessionUpdateFields.deposit_paid = false;
    sessionUpdateFields.payment_status = 'failed';
  } else if (paymentData.paymentStatus === 'pending') {
    sessionUpdateFields.deposit_paid = false;
    sessionUpdateFields.payment_status = 'pending';
  }

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

  console.log('✅ Session payment status updated successfully:', updatedSession.id);
  return updatedSession;
}

// Main webhook handler
export async function POST(request: NextRequest) {
  try {
    console.log('💳 Stripe session payment webhook received');

    const requestData = await request.json();
    console.log('📨 Raw request data:', JSON.stringify(requestData, null, 2));

    let sessionId: string | null = null;
    let paymentData: StripeSessionPaymentData;

    // Check if this is a direct Stripe webhook event
    if (requestData.type && requestData.data) {
      console.log('🔍 Processing direct Stripe webhook event:', requestData.type);

      // Extract sessionId from Stripe event
      sessionId = extractSessionIdFromStripeEvent(requestData);

      if (!sessionId) {
        console.error('❌ Could not extract sessionId from Stripe event');
        return NextResponse.json(
          { error: 'Could not extract sessionId from Stripe event. Ensure sessionId is in metadata, success_url, or client_reference_id.' },
          { status: 400 }
        );
      }

      // Create payment data from Stripe event
      const stripeObject = requestData.data.object;
      paymentData = {
        sessionId,
        paymentStatus: requestData.type === 'checkout.session.completed' ? 'succeeded' :
                      requestData.type === 'payment_intent.succeeded' ? 'succeeded' : 'pending',
        paymentIntentId: stripeObject.payment_intent || stripeObject.id,
        amount: stripeObject.amount_total ? stripeObject.amount_total / 100 : stripeObject.amount ? stripeObject.amount / 100 : undefined,
        currency: stripeObject.currency,
        customerEmail: stripeObject.customer_details?.email || stripeObject.customer_email,
        paymentDate: new Date().toISOString().split('T')[0]
      };
    } else {
      // Handle direct API call (existing format)
      paymentData = requestData as StripeSessionPaymentData;
      sessionId = paymentData.sessionId || null;
    }

    // Validate required fields
    if (!sessionId || !paymentData.paymentStatus) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: sessionId and paymentStatus' },
        { status: 400 }
      );
    }

    // Ensure sessionId is set in paymentData
    paymentData.sessionId = sessionId;

    // Update the session payment status
    console.log('🔄 Processing session payment update...');

    const updatedSession = await updateSessionPaymentStatus(sessionId, paymentData);

    console.log('✅ Session payment update processed successfully');

    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} payment status updated to ${paymentData.paymentStatus}`,
      sessionId: updatedSession.id,
      paymentStatus: paymentData.paymentStatus,
      depositPaid: updatedSession.deposit_paid,
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
        paymentDate: updatedSession.payment_date,
        amountPaid: updatedSession.amount_paid,
        paymentIntentId: updatedSession.payment_intent_id,
        updatedAt: updatedSession.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Stripe session payment webhook error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error processing session payment webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing and documentation
export async function GET() {
  return NextResponse.json({
    message: 'Stripe session payment webhook endpoint is active',
    endpoint: '/api/stripe/session-payment',
    method: 'POST',
    description: 'Updates session payment status when Stripe payment is completed',
    workflow: [
      '1. Customer completes Stripe payment with sessionId in URL/metadata',
      '2. Stripe webhook or Make.com sends payment data to this endpoint',
      '3. Find existing session by sessionId',
      '4. Update session with payment status and details',
      '5. Mark deposit_paid as true if payment succeeded'
    ],
    expectedData: {
      sessionId: 'session_12345 (required)',
      paymentStatus: 'succeeded/failed/pending (required)',
      paymentIntentId: 'pi_1234567890 (optional)',
      amount: '75.00 (optional)',
      currency: 'gbp (optional)',
      customerEmail: 'customer@example.com (optional)',
      paymentDate: '2025-01-15 (optional, defaults to today)'
    },
    examples: {
      successfulPayment: {
        sessionId: 'session_12345',
        paymentStatus: 'succeeded',
        paymentIntentId: 'pi_1234567890',
        amount: 75.00,
        currency: 'gbp',
        customerEmail: 'john@example.com',
        paymentDate: '2025-01-15'
      },
      failedPayment: {
        sessionId: 'session_12345',
        paymentStatus: 'failed'
      },
      pendingPayment: {
        sessionId: 'session_12345',
        paymentStatus: 'pending'
      }
    },
    sessionUpdates: {
      onSuccess: [
        'deposit_paid = true',
        'payment_status = "paid"',
        'payment_date = payment date',
        'payment_intent_id = Stripe payment intent ID',
        'amount_paid = amount from Stripe'
      ],
      onFailure: [
        'deposit_paid = false',
        'payment_status = "failed"'
      ],
      onPending: [
        'deposit_paid = false', 
        'payment_status = "pending"'
      ]
    },
    integration: {
      stripeWebhook: 'Configure Stripe webhook to send payment.intent.succeeded events to this endpoint',
      makeComIntegration: 'Use Make.com to listen for Stripe events and format data for this endpoint',
      urlStructure: 'Include sessionId in Stripe payment URL: /payment?sessionId=session_12345'
    }
  });
}
