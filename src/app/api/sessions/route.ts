import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function getSessions() {
  console.log('🔍 Server: Fetching sessions from Supabase...');
  try {
    // First try to get sessions with join to clients (including email for payment matching)
    let { data: rawData, error } = await supabase
      .from('sessions')
      .select(`
        *,
        clients!sessions_client_id_fkey(
          owner_first_name,
          owner_last_name,
          dog_name,
          contact_email,
          contact_number,
          is_member
        )
      `)
      .order('booking', { ascending: false });

    if (error) {
      console.log('🔄 Join failed, trying simple select...', error.message);
      // Fallback to simple select if join fails
      const result = await supabase
        .from('sessions')
        .select('*')
        .order('booking', { ascending: false });

      rawData = result.data;
      error = result.error;
    }

    if (error) {
      throw error;
    }

    if (!rawData || rawData.length === 0) {
      console.log('📭 No sessions found');
      return { data: [], error: null };
    }

    console.log('🔍 Raw session data:', JSON.stringify(rawData[0], null, 2));

    // Transform the data to match the expected format
    const data = rawData.map((session: any) => ({
      id: session.id,
      clientId: session.client_id,
      clientName: session.clients ? `${session.clients.owner_first_name} ${session.clients.owner_last_name}` : session.client_name || 'Unknown Client',
      dogName: session.clients?.dog_name || session.dog_name || null,
      email: session.clients?.contact_email || session.email, // Use client's email from JOIN
      booking: session.booking,
      date: session.booking ? session.booking.split('T')[0] : null, // Extract date from booking timestamp
      time: session.booking ? session.booking.split('T')[1]?.split('.')[0]?.substring(0, 5) : null, // Extract time from booking timestamp
      sessionType: session.session_type || 'General Session',
      amount: session.amount,
      depositPaid: session.deposit_paid,
      paymentStatus: session.payment_status,
      paymentDate: session.payment_date,
      paymentIntentId: session.payment_intent_id,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      // Additional client data for debugging
      clientEmail: session.clients?.contact_email,
      clientPhone: session.clients?.contact_number,
      isMember: session.clients?.is_member,
    }));

    console.log(`✅ Server: Found ${data.length} sessions`);
    console.log('🔍 Transformed session data:', JSON.stringify(data[0], null, 2));
    return { data, error: null };
  } catch (error) {
    console.error('❌ Server: Error fetching sessions:', error);
    return { data: null, error };
  }
}

async function addSession(session: any) {
  console.log('➕ Server: Adding session to Supabase...');
  try {
    // Transform the session data to match database schema
    // Combine date and time into booking timestamp
    const bookingTimestamp = session.date && session.time
      ? `${session.date}T${session.time}:00.000Z`
      : session.booking;

    const dbSession = {
      client_id: session.clientId,
      client_name: session.clientName,
      dog_name: session.dogName,
      // No email field needed - we'll use JOIN with clients table for payment matching
      booking: bookingTimestamp,
      session_type: session.sessionType,
      amount: session.amount,
      deposit_paid: session.depositPaid || false,
      payment_status: session.paymentStatus || 'pending',
      payment_date: session.paymentDate || null,
      payment_intent_id: session.paymentIntentId || null,
    };

    const { data: rawData, error } = await supabase
      .from('sessions')
      .insert(dbSession)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Transform the response back to frontend format
    const data = {
      id: rawData.id,
      clientId: rawData.client_id,
      clientName: rawData.client_name,
      dogName: rawData.dog_name,
      // No email field - use JOIN with clients table when needed
      booking: rawData.booking,
      date: rawData.booking ? rawData.booking.split('T')[0] : null,
      time: rawData.booking ? rawData.booking.split('T')[1]?.split('.')[0]?.substring(0, 5) : null,
      sessionType: rawData.session_type,
      amount: rawData.amount,
      depositPaid: rawData.deposit_paid,
      paymentStatus: rawData.payment_status,
      paymentDate: rawData.payment_date,
      paymentIntentId: rawData.payment_intent_id,
      createdAt: rawData.created_at,
      updatedAt: rawData.updated_at,
    };

    console.log('✅ Server: Session added successfully');
    return { data, error: null };
  } catch (error) {
    console.error('❌ Server: Error adding session:', error);
    return { data: null, error };
  }
}

async function updateSession(id: string, updates: any) {
  console.log('✏️ Server: Updating session in Supabase...');
  try {
    // Transform the updates to match database schema
    const dbUpdates: any = {};
    if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
    if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
    if (updates.dogName !== undefined) dbUpdates.dog_name = updates.dogName;
    if (updates.email !== undefined) dbUpdates.email = updates.email;

    // Handle booking timestamp - combine date and time if provided separately
    if (updates.date !== undefined && updates.time !== undefined) {
      dbUpdates.booking = `${updates.date}T${updates.time}:00.000Z`;
    } else if (updates.booking !== undefined) {
      dbUpdates.booking = updates.booking;
    }

    if (updates.sessionType !== undefined) dbUpdates.session_type = updates.sessionType;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.depositPaid !== undefined) dbUpdates.deposit_paid = updates.depositPaid;
    if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
    if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
    if (updates.paymentIntentId !== undefined) dbUpdates.payment_intent_id = updates.paymentIntentId;

    const { error } = await supabase
      .from('sessions')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      throw error;
    }

    console.log('✅ Server: Session updated successfully');
    return { error: null };
  } catch (error) {
    console.error('❌ Server: Error updating session:', error);
    return { error };
  }
}

async function deleteSession(id: string) {
  console.log('🗑️ Server: Deleting session from Supabase...');
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    console.log('✅ Server: Session deleted successfully');
    return { error: null };
  } catch (error) {
    console.error('❌ Server: Error deleting session:', error);
    return { error };
  }
}

// GET /api/sessions
export async function GET() {
  try {
    const { data, error } = await getSessions();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sessions
export async function POST(request: NextRequest) {
  try {
    const session = await request.json();
    const { data, error } = await addSession(session);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/sessions/[id]
export async function PATCH(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const updates = await request.json();
    const { error } = await updateSession(id, updates);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sessions/[id]
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const { error } = await deleteSession(id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
