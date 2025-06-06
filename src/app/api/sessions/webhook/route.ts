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

// Types for session update data from Make.com
interface SessionUpdateData {
  sessionId: string;
  clientId?: string;
  clientName?: string;
  dogName?: string;
  date?: string; // YYYY-MM-DD format
  time?: string; // HH:MM format
  sessionType?: string;
  amount?: number;
  notes?: string;
  status?: string;
  depositPaid?: boolean;
  paymentStatus?: string;
  paymentDate?: string;
  paymentIntentId?: string;
}

// Function to find and update session
async function updateSessionById(sessionId: string, updateData: Partial<SessionUpdateData>) {
  console.log('🔍 Finding and updating session:', sessionId);
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

  // Prepare update data (only include fields that are provided)
  const sessionUpdateFields: any = {};
  
  if (updateData.clientId !== undefined) sessionUpdateFields.client_id = updateData.clientId;
  if (updateData.clientName !== undefined) sessionUpdateFields.client_name = updateData.clientName;
  if (updateData.dogName !== undefined) sessionUpdateFields.dog_name = updateData.dogName;
  if (updateData.date !== undefined) sessionUpdateFields.date = updateData.date;
  if (updateData.time !== undefined) sessionUpdateFields.time = updateData.time;
  if (updateData.sessionType !== undefined) sessionUpdateFields.session_type = updateData.sessionType;
  if (updateData.amount !== undefined) sessionUpdateFields.amount = updateData.amount;
  if (updateData.notes !== undefined) sessionUpdateFields.notes = updateData.notes;
  if (updateData.status !== undefined) sessionUpdateFields.status = updateData.status;
  if (updateData.depositPaid !== undefined) sessionUpdateFields.deposit_paid = updateData.depositPaid;
  if (updateData.paymentStatus !== undefined) sessionUpdateFields.payment_status = updateData.paymentStatus;
  if (updateData.paymentDate !== undefined) sessionUpdateFields.payment_date = updateData.paymentDate;
  if (updateData.paymentIntentId !== undefined) sessionUpdateFields.payment_intent_id = updateData.paymentIntentId;

  // Add updated timestamp
  sessionUpdateFields.updated_at = new Date().toISOString();

  console.log('📝 Updating session with fields:', sessionUpdateFields);

  // Update the session
  const { data: updatedSession, error: updateError } = await supabase
    .from('sessions')
    .update(sessionUpdateFields)
    .eq('id', sessionId)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating session:', updateError);
    throw updateError;
  }

  console.log('✅ Session updated successfully:', updatedSession.id);
  return updatedSession;
}

// Main webhook handler
export async function POST(request: NextRequest) {
  try {
    console.log('📅 Session update webhook received via Make.com');
    
    const updateData: SessionUpdateData = await request.json();
    console.log('📨 Update data:', JSON.stringify(updateData, null, 2));

    // Validate required fields
    if (!updateData.sessionId) {
      console.error('❌ Missing required sessionId');
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
        { status: 400 }
      );
    }

    // Update the session
    console.log('🔄 Processing session update...');
    
    const updatedSession = await updateSessionById(updateData.sessionId, updateData);

    console.log('✅ Session update processed successfully');
    
    return NextResponse.json({
      success: true,
      message: `Session ${updateData.sessionId} updated successfully`,
      sessionId: updatedSession.id,
      updatedFields: Object.keys(updateData).filter(key => key !== 'sessionId'),
      session: {
        id: updatedSession.id,
        clientName: updatedSession.client_name,
        dogName: updatedSession.dog_name,
        date: updatedSession.date,
        time: updatedSession.time,
        sessionType: updatedSession.session_type,
        amount: updatedSession.amount,
        status: updatedSession.status,
        updatedAt: updatedSession.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Session update webhook error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error processing session update webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing and documentation
export async function GET() {
  return NextResponse.json({
    message: 'Session update webhook endpoint is active (via Make.com)',
    endpoint: '/api/sessions/webhook',
    method: 'POST',
    description: 'Updates existing sessions via Make.com automation',
    workflow: [
      '1. Make.com scenario triggers (e.g., email processed, calendar updated)',
      '2. Make.com sends session update data to this endpoint',
      '3. Find existing session by sessionId',
      '4. Update session with provided fields',
      '5. Return updated session data'
    ],
    expectedData: {
      sessionId: 'session_12345 (required)',
      clientId: 'client_67890 (optional)',
      clientName: 'John Smith (optional)',
      dogName: 'Buddy (optional)',
      date: '2025-01-15 (optional, YYYY-MM-DD format)',
      time: '14:30 (optional, HH:MM format)',
      sessionType: 'In-Person (optional)',
      amount: '75.00 (optional)',
      notes: 'Session notes (optional)',
      status: 'confirmed/cancelled/completed (optional)',
      depositPaid: 'true/false (optional)',
      paymentStatus: 'paid/pending/failed (optional)',
      paymentDate: '2025-01-15 (optional)',
      paymentIntentId: 'pi_1234567890 (optional)'
    },
    examples: {
      updateAmount: {
        sessionId: 'session_12345',
        amount: 85.00
      },
      updateDateTime: {
        sessionId: 'session_12345',
        date: '2025-01-20',
        time: '15:00'
      },
      updateStatus: {
        sessionId: 'session_12345',
        status: 'confirmed',
        notes: 'Client confirmed via email'
      },
      fullUpdate: {
        sessionId: 'session_12345',
        date: '2025-01-20',
        time: '15:00',
        amount: 85.00,
        status: 'confirmed',
        notes: 'Rescheduled and confirmed'
      },
      markDepositPaid: {
        sessionId: 'session_12345',
        depositPaid: true,
        paymentStatus: 'paid',
        paymentDate: '2025-01-15',
        paymentIntentId: 'pi_1234567890'
      }
    },
    notes: [
      'Only sessionId is required - all other fields are optional',
      'Only provided fields will be updated',
      'Date must be in YYYY-MM-DD format',
      'Time must be in HH:MM format',
      'Amount should be a number (e.g., 75.00)',
      'Returns error if sessionId is not found'
    ]
  });
}
