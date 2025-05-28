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
      const response = await fetch(`${this.baseUrl}/clients?select=*&order=created_at.desc`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();

      // Transform the data to match the expected frontend format
      const data = rawData.map((client: any) => ({
        id: client.id,
        ownerFirstName: client.owner_first_name,
        ownerLastName: client.owner_last_name,
        contactEmail: client.contact_email,
        contactNumber: client.contact_number,
        postcode: client.postcode,
        fullAddress: client.full_address,
        dogName: client.dog_name,
        isMember: client.is_member,
        isActive: client.is_active,
        submissionDate: client.submission_date,
        lastSession: client.last_session,
        nextSession: client.next_session,
        behaviouralBriefId: client.behavioural_brief_id,
        behaviourQuestionnaireId: client.behaviour_questionnaire_id,
        address: client.address,
        howHeardAboutServices: client.how_heard_about_services,
        createdAt: client.created_at,
      }));

      console.log(`✅ Server: Found ${data.length} clients`);
      console.log('🔍 First client data:', JSON.stringify(data[0], null, 2));
      return { data, error: null };
    } catch (error) {
      console.error('❌ Server: Error fetching clients:', error);
      return { data: null, error };
    }
  }

  async addClient(client: any) {
    console.log('➕ Server: Adding client to Supabase...');
    try {
      // Transform the client data to match database schema
      const dbClient = {
        owner_first_name: client.ownerFirstName,
        owner_last_name: client.ownerLastName,
        contact_email: client.contactEmail,
        contact_number: client.contactNumber,
        postcode: client.postcode,
        full_address: client.fullAddress,
        dog_name: client.dogName,
        is_member: client.isMember || false,
        is_active: client.isActive !== undefined ? client.isActive : true,
        submission_date: client.submissionDate,
        last_session: client.lastSession || 'N/A',
        next_session: client.nextSession || 'Not Scheduled',
        behavioural_brief_id: client.behaviouralBriefId,
        behaviour_questionnaire_id: client.behaviourQuestionnaireId,
        address: client.address,
        how_heard_about_services: client.howHeardAboutServices,
      };

      const response = await fetch(`${this.baseUrl}/clients?select=*`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(dbClient),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Supabase error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const rawData = await response.json();

      // Transform the response back to frontend format
      const data = rawData.map((client: any) => ({
        id: client.id,
        ownerFirstName: client.owner_first_name,
        ownerLastName: client.owner_last_name,
        contactEmail: client.contact_email,
        contactNumber: client.contact_number,
        postcode: client.postcode,
        fullAddress: client.full_address,
        dogName: client.dog_name,
        isMember: client.is_member,
        isActive: client.is_active,
        submissionDate: client.submission_date,
        lastSession: client.last_session,
        nextSession: client.next_session,
        behaviouralBriefId: client.behavioural_brief_id,
        behaviourQuestionnaireId: client.behaviour_questionnaire_id,
        address: client.address,
        howHeardAboutServices: client.how_heard_about_services,
        createdAt: client.created_at,
      }));

      console.log('✅ Server: Client added successfully');
      return { data: data[0], error: null };
    } catch (error) {
      console.error('❌ Server: Error adding client:', error);
      return { data: null, error };
    }
  }

  async updateClient(id: string, updates: any) {
    console.log('✏️ Server: Updating client in Supabase...');
    try {
      // Transform the updates to match database schema
      const dbUpdates: any = {};
      if (updates.ownerFirstName !== undefined) dbUpdates.owner_first_name = updates.ownerFirstName;
      if (updates.ownerLastName !== undefined) dbUpdates.owner_last_name = updates.ownerLastName;
      if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
      if (updates.contactNumber !== undefined) dbUpdates.contact_number = updates.contactNumber;
      if (updates.postcode !== undefined) dbUpdates.postcode = updates.postcode;
      if (updates.fullAddress !== undefined) dbUpdates.full_address = updates.fullAddress;
      if (updates.dogName !== undefined) dbUpdates.dog_name = updates.dogName;
      if (updates.isMember !== undefined) dbUpdates.is_member = updates.isMember;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.submissionDate !== undefined) dbUpdates.submission_date = updates.submissionDate;
      if (updates.lastSession !== undefined) dbUpdates.last_session = updates.lastSession;
      if (updates.nextSession !== undefined) dbUpdates.next_session = updates.nextSession;
      if (updates.behaviouralBriefId !== undefined) dbUpdates.behavioural_brief_id = updates.behaviouralBriefId;
      if (updates.behaviourQuestionnaireId !== undefined) dbUpdates.behaviour_questionnaire_id = updates.behaviourQuestionnaireId;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.howHeardAboutServices !== undefined) dbUpdates.how_heard_about_services = updates.howHeardAboutServices;

      const response = await fetch(`${this.baseUrl}/clients?id=eq.${id}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(dbUpdates),
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
