import { NextRequest, NextResponse } from 'next/server';

// Server-side Supabase client using service role key
class ServerSupabaseClient {
  private baseUrl: string;
  private serviceRoleKey: string;

  constructor() {
    this.baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!this.serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.serviceRoleKey,
      'Authorization': `Bearer ${this.serviceRoleKey}`,
    };
  }

  async getSessions() {
    console.log('🔍 Server: Fetching sessions from Supabase... [NEW VERSION]');
    try {
      // First try to get sessions with join
      let response = await fetch(`${this.baseUrl}/sessions?select=*,clients!sessions_client_id_fkey(owner_first_name,owner_last_name,dog_name)&order=date.desc`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.log('🔄 Join failed, trying simple select...');
        // Fallback to simple select if join fails
        response = await fetch(`${this.baseUrl}/sessions?select=*&order=date.desc`, {
          method: 'GET',
          headers: this.getHeaders(),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
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

  async addSession(session: any) {
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

      const response = await fetch(`${this.baseUrl}/sessions?select=*`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(dbSession),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Supabase error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const rawData = await response.json();

      // Transform the response back to frontend format
      const data = rawData.map((session: any) => ({
        id: session.id,
        clientId: session.client_id,
        clientName: session.client_name,
        dogName: session.dog_name,
        date: session.date,
        time: session.time,
        sessionType: session.session_type,
        amount: session.amount,
        createdAt: session.created_at,
      }));

      console.log('✅ Server: Session added successfully');
      return { data: data[0], error: null };
    } catch (error) {
      console.error('❌ Server: Error adding session:', error);
      return { data: null, error };
    }
  }

  async updateSession(id: string, updates: any) {
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

      const response = await fetch(`${this.baseUrl}/sessions?id=eq.${id}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(dbUpdates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('✅ Server: Session updated successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Server: Error updating session:', error);
      return { error };
    }
  }

  async deleteSession(id: string) {
    console.log('🗑️ Server: Deleting session from Supabase...');
    try {
      const response = await fetch(`${this.baseUrl}/sessions?id=eq.${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('✅ Server: Session deleted successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Server: Error deleting session:', error);
      return { error };
    }
  }
}

function getServerSupabaseClient() {
  return new ServerSupabaseClient();
}

// GET /api/sessions
export async function GET() {
  try {
    const serverSupabase = getServerSupabaseClient();
    const { data, error } = await serverSupabase.getSessions();

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
    const serverSupabase = getServerSupabaseClient();
    const session = await request.json();
    const { data, error } = await serverSupabase.addSession(session);

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
    const serverSupabase = getServerSupabaseClient();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const updates = await request.json();
    const { error } = await serverSupabase.updateSession(id, updates);

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
    const serverSupabase = getServerSupabaseClient();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const { error } = await serverSupabase.deleteSession(id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
