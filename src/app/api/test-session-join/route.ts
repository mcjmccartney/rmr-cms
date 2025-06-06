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

// GET endpoint to test session JOIN with clients
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing session JOIN with clients table');
    const supabase = getSupabaseClient();
    
    // Test the JOIN query that the payment webhook uses
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id,
        client_id,
        client_name,
        dog_name,
        booking,
        amount,
        deposit_paid,
        payment_status,
        clients!sessions_client_id_fkey(
          id,
          owner_first_name,
          owner_last_name,
          contact_email,
          contact_number,
          dog_name,
          is_member
        )
      `)
      .eq('deposit_paid', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ JOIN query failed:', error);
      return NextResponse.json(
        { 
          error: 'JOIN query failed',
          details: error.message,
          suggestion: 'Check if sessions have valid client_id references'
        },
        { status: 500 }
      );
    }

    console.log('✅ JOIN query successful, found sessions:', sessions?.length || 0);

    // Transform and analyze the data
    const analysis = {
      totalUnpaidSessions: sessions?.length || 0,
      sessionsWithClientData: sessions?.filter(s => s.clients).length || 0,
      sessionsWithoutClientData: sessions?.filter(s => !s.clients).length || 0,
      sessionsWithEmail: sessions?.filter(s => s.clients?.contact_email).length || 0,
      sessionsWithoutEmail: sessions?.filter(s => !s.clients?.contact_email).length || 0,
    };

    // Sample sessions for debugging
    const sampleSessions = sessions?.slice(0, 3).map(session => ({
      sessionId: session.id,
      sessionClientName: session.client_name,
      sessionDogName: session.dog_name,
      sessionAmount: session.amount,
      hasClientData: !!session.clients,
      clientData: session.clients ? {
        clientId: session.clients.id,
        ownerName: `${session.clients.owner_first_name} ${session.clients.owner_last_name}`,
        contactEmail: session.clients.contact_email,
        contactNumber: session.clients.contact_number,
        dogName: session.clients.dog_name,
        isMember: session.clients.is_member
      } : null,
      paymentMatchingReady: !!(session.clients?.contact_email)
    }));

    return NextResponse.json({
      success: true,
      message: 'Session JOIN test completed',
      analysis,
      sampleSessions,
      paymentWebhookCompatibility: {
        canMatchByEmail: analysis.sessionsWithEmail > 0,
        readyForPaymentMatching: analysis.sessionsWithEmail === analysis.totalUnpaidSessions,
        issuesFound: analysis.sessionsWithoutClientData > 0 || analysis.sessionsWithoutEmail > 0
      },
      recommendations: [
        analysis.sessionsWithoutClientData > 0 ? 'Some sessions have missing client_id references' : null,
        analysis.sessionsWithoutEmail > 0 ? 'Some clients have missing contact_email addresses' : null,
        analysis.sessionsWithEmail === 0 ? 'No sessions can be matched by email - check client data' : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    
    return NextResponse.json(
      { 
        error: 'Test endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST endpoint to test payment matching for a specific email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const testEmail = body.email || body.customerEmail;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Please provide email or customerEmail in request body' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing payment matching for email:', testEmail);
    const supabase = getSupabaseClient();
    
    // Test the exact query the payment webhook uses
    const { data: matchingSessions, error } = await supabase
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
      .eq('clients.contact_email', testEmail)
      .eq('deposit_paid', false)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { 
          error: 'Payment matching query failed',
          details: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      testEmail,
      matchingSessionsFound: matchingSessions?.length || 0,
      sessions: matchingSessions?.map(session => ({
        sessionId: session.id,
        clientName: session.client_name,
        dogName: session.dog_name,
        amount: session.amount,
        booking: session.booking,
        depositPaid: session.deposit_paid,
        paymentStatus: session.payment_status,
        clientEmail: session.clients.contact_email,
        clientPhone: session.clients.contact_number,
        isMember: session.clients.is_member
      })),
      paymentWebhookWouldWork: (matchingSessions?.length || 0) > 0
    });

  } catch (error) {
    console.error('❌ Payment matching test error:', error);
    
    return NextResponse.json(
      { 
        error: 'Payment matching test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
