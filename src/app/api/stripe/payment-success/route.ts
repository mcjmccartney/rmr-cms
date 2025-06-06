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

// Function to mark session as paid
async function markSessionAsPaid(sessionId: string, stripeSessionId?: string) {
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
  const sessionUpdateFields: any = {
    deposit_paid: true,
    payment_status: 'paid',
    payment_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString()
  };

  if (stripeSessionId) {
    sessionUpdateFields.stripe_session_id = stripeSessionId;
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

  console.log('✅ Session marked as paid successfully:', updatedSession.id);
  return updatedSession;
}

// GET handler for Stripe success redirect
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const stripeSessionId = searchParams.get('session_id'); // Stripe's session ID

    console.log('🎉 Payment success redirect received');
    console.log('📨 SessionId:', sessionId);
    console.log('📨 Stripe Session ID:', stripeSessionId);

    if (!sessionId) {
      console.error('❌ Missing sessionId parameter');
      return NextResponse.json(
        { error: 'Missing sessionId parameter' },
        { status: 400 }
      );
    }

    // Mark session as paid
    const updatedSession = await markSessionAsPaid(sessionId, stripeSessionId || undefined);

    console.log('✅ Session payment processed successfully via redirect');

    // Return success page or redirect
    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} marked as paid successfully`,
      sessionId: updatedSession.id,
      depositPaid: updatedSession.deposit_paid,
      paymentStatus: updatedSession.payment_status,
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
    console.error('❌ Payment success processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error processing payment success',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST handler for webhook calls
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, stripeSessionId } = body;

    console.log('💳 Payment success webhook received');
    console.log('📨 Data:', { sessionId, stripeSessionId });

    if (!sessionId) {
      console.error('❌ Missing sessionId in request body');
      return NextResponse.json(
        { error: 'Missing sessionId in request body' },
        { status: 400 }
      );
    }

    // Mark session as paid
    const updatedSession = await markSessionAsPaid(sessionId, stripeSessionId);

    console.log('✅ Session payment processed successfully via webhook');

    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} marked as paid successfully`,
      sessionId: updatedSession.id,
      depositPaid: updatedSession.deposit_paid,
      paymentStatus: updatedSession.payment_status
    });

  } catch (error) {
    console.error('❌ Payment success webhook error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error processing payment success webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
