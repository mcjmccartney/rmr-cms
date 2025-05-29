import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function getSessions() {
  console.log('🔍 Server: Fetching sessions from Supabase...');
  try {
    // First try to get sessions with join to clients
    let { data: rawData, error } = await supabase
      .from('sessions')
      .select(`
        *,
        clients!sessions_client_id_fkey(
          owner_first_name,
          owner_last_name,
          dog_name
        )
      `)
      .order('date', { ascending: false });

    if (error) {
      console.log('🔄 Join failed, trying simple select...', error.message);
      // Fallback to simple select if join fails
      const result = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false });

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
      date: session.date,
      time: session.time,
      sessionType: session.session_type || 'General Session',
      amount: session.amount,
      createdAt: session.created_at,
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
    const dbSession = {
      client_id: session.clientId,
      client_name: session.clientName,
      dog_name: session.dogName,
      date: session.date,
      time: session.time,
      session_type: session.sessionType,
      amount: session.amount,
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
      date: rawData.date,
      time: rawData.time,
      sessionType: rawData.session_type,
      amount: rawData.amount,
      createdAt: rawData.created_at,
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
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.sessionType !== undefined) dbUpdates.session_type = updates.sessionType;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;

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
