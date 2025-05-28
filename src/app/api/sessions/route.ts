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
    console.log('🔍 Server: Fetching sessions from Supabase...');
    try {
      const response = await fetch(`${this.baseUrl}/sessions?select=*`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Server: Found ${data.length} sessions`);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Server: Error fetching sessions:', error);
      return { data: null, error };
    }
  }

  async addSession(session: any) {
    console.log('➕ Server: Adding session to Supabase...');
    try {
      const response = await fetch(`${this.baseUrl}/sessions?select=*`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(session),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Supabase error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Server: Session added successfully');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Server: Error adding session:', error);
      return { data: null, error };
    }
  }

  async updateSession(id: string, updates: any) {
    console.log('✏️ Server: Updating session in Supabase...');
    try {
      const response = await fetch(`${this.baseUrl}/sessions?id=eq.${id}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
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
