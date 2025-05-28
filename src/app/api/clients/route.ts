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

  async getClients() {
    console.log('🔍 Server: Fetching clients from Supabase...');
    try {
      const response = await fetch(`${this.baseUrl}/clients?select=*`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Server: Found ${data.length} clients`);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Server: Error fetching clients:', error);
      return { data: null, error };
    }
  }

  async addClient(client: any) {
    console.log('➕ Server: Adding client to Supabase...');
    try {
      const response = await fetch(`${this.baseUrl}/clients?select=*`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(client),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Server: Client added successfully');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Server: Error adding client:', error);
      return { data: null, error };
    }
  }

  async updateClient(id: string, updates: any) {
    console.log('✏️ Server: Updating client in Supabase...');
    try {
      const response = await fetch(`${this.baseUrl}/clients?id=eq.${id}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('✅ Server: Client updated successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Server: Error updating client:', error);
      return { error };
    }
  }

  async deleteClient(id: string) {
    console.log('🗑️ Server: Deleting client from Supabase...');
    try {
      const response = await fetch(`${this.baseUrl}/clients?id=eq.${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('✅ Server: Client deleted successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Server: Error deleting client:', error);
      return { error };
    }
  }
}

function getServerSupabaseClient() {
  return new ServerSupabaseClient();
}

// GET /api/clients
export async function GET() {
  try {
    const serverSupabase = getServerSupabaseClient();
    const { data, error } = await serverSupabase.getClients();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/clients
export async function POST(request: NextRequest) {
  try {
    const serverSupabase = getServerSupabaseClient();
    const client = await request.json();
    const { data, error } = await serverSupabase.addClient(client);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/clients/[id]
export async function PATCH(request: NextRequest) {
  try {
    const serverSupabase = getServerSupabaseClient();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    const updates = await request.json();
    const { error } = await serverSupabase.updateClient(id, updates);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/clients/[id]
export async function DELETE(request: NextRequest) {
  try {
    const serverSupabase = getServerSupabaseClient();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    const { error } = await serverSupabase.deleteClient(id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
