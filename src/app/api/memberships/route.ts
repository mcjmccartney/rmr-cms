import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Membership } from '@/lib/types';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration is missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const clientId = searchParams.get('clientId');

    // Get all memberships first, then we'll match them with clients
    const { data: allMemberships, error: membershipError } = await supabase
      .from('memberships')
      .select('*');

    console.log('Memberships table structure:', allMemberships?.[0]);

    if (membershipError) {
      console.error('Error fetching memberships:', membershipError);
      return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 });
    }

    // Get all clients for matching
    const { data: allClients, error: clientError } = await supabase
      .from('clients')
      .select('*');

    if (clientError) {
      console.error('Error fetching clients:', clientError);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    // Match memberships with clients by email first, then by surname
    const membershipsWithClients = allMemberships?.map(membership => {
      // Family member overrides - redirect specific payments to family members
      const familyOverrides: { [key: string]: string } = {
        'c.vau@hotmail.com': 'vautrinot', // Christopher's payments go to Heather Vautrinot
      };

      let matchedClient = null;

      // Debug family override check for Vautrinot
      if (membership.email?.toLowerCase().includes('vau')) {
        console.log(`🔍 Family override check for ${membership.email}:`, {
          email: membership.email,
          emailLower: membership.email.toLowerCase(),
          hasOverride: !!familyOverrides[membership.email.toLowerCase()],
          overrideValue: familyOverrides[membership.email.toLowerCase()],
          allOverrides: familyOverrides,
          willTriggerOverride: !!(membership.email && familyOverrides[membership.email.toLowerCase()])
        });
      }

      // Check for family member override first
      if (membership.email && familyOverrides[membership.email.toLowerCase()]) {
        const targetSurname = familyOverrides[membership.email.toLowerCase()];

        // Find all clients with the target surname
        const familyClients = allClients?.filter(client =>
          client.owner_last_name?.toLowerCase() === targetSurname
        ) || [];

        // For Vautrinot family, specifically target Heather over Christopher
        if (targetSurname === 'vautrinot') {
          matchedClient = familyClients.find(client =>
            client.owner_first_name?.toLowerCase() === 'heather'
          ) || familyClients[0]; // fallback to first family member if Heather not found
        } else {
          matchedClient = familyClients[0]; // for other families, use first match
        }

        console.log(`🔄 Family override: ${membership.email} -> ${targetSurname} -> ${matchedClient ? `${matchedClient.owner_first_name} ${matchedClient.owner_last_name}` : 'No match'}`);
      }

      // If no family override, try exact email match
      if (!matchedClient) {
        matchedClient = allClients?.find(client =>
          client.contact_email && membership.email &&
          client.contact_email.toLowerCase() === membership.email.toLowerCase()
        );
      }

      // If no email match, try surname matching
      if (!matchedClient && membership.client) {
        const membershipSurname = membership.client.split(' ').pop()?.toLowerCase();
        if (membershipSurname) {
          matchedClient = allClients?.find(client =>
            client.owner_last_name &&
            client.owner_last_name.toLowerCase() === membershipSurname
          );
        }
      }

      const result = {
        ...membership,
        clients: matchedClient ? [matchedClient] : []
      };

      // Debug logging for Vautrinot family
      if (membership.client?.toLowerCase().includes('vautrinot') || membership.email?.toLowerCase().includes('vau')) {
        const vautrinotClients = allClients?.filter(c => c.owner_last_name?.toLowerCase().includes('vautrinot')) || [];
        console.log(`🔍 VAUTRINOT Membership ${membership.id} matching:`, {
          membershipEmail: membership.email,
          membershipClient: membership.client,
          membershipSurname: membership.client?.split(' ').pop()?.toLowerCase(),
          matchedClient: matchedClient ? `${matchedClient.owner_first_name} ${matchedClient.owner_last_name}` : 'No match',
          matchedClientId: matchedClient?.id,
          matchType: matchedClient ? (
            matchedClient.contact_email?.toLowerCase() === membership.email?.toLowerCase() ? 'email' : 'surname'
          ) : 'none',
          allVautrinotClients: vautrinotClients.map(c => ({
            id: c.id,
            name: `${c.owner_first_name} ${c.owner_last_name}`,
            email: c.contact_email
          }))
        });
      }

      return result;
    }) || [];

    let filteredMemberships = membershipsWithClients;

    // Filter by client if specified
    if (clientId) {
      filteredMemberships = filteredMemberships.filter(membership =>
        membership.clients.some(client => client.id === clientId)
      );
    }

    // Filter by year/month if specified
    if (year && month) {
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0);

      filteredMemberships = filteredMemberships.filter(membership => {
        const membershipDate = new Date(membership.date);

        return membershipDate >= startOfMonth && membershipDate <= endOfMonth;
      });
    } else if (year) {
      const startOfYear = new Date(parseInt(year), 0, 1);
      const endOfYear = new Date(parseInt(year), 11, 31);

      filteredMemberships = filteredMemberships.filter(membership => {
        const membershipDate = new Date(membership.date);

        return membershipDate >= startOfYear && membershipDate <= endOfYear;
      });
    }

    return NextResponse.json(filteredMemberships);
  } catch (error) {
    console.error('Error in memberships API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    const { data: membership, error } = await supabase
      .from('memberships')
      .insert([body])
      .select(`
        *,
        client:clients(*)
      `)
      .single();

    if (error) {
      console.error('Error creating membership:', error);
      return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 });
    }

    return NextResponse.json(membership);
  } catch (error) {
    console.error('Error in memberships POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
