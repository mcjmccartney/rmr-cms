import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration is missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { id } = await params;

    const { data: membership, error } = await supabase
      .from('memberships')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching membership:', error);
      return NextResponse.json({ error: 'Failed to fetch membership' }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    return NextResponse.json(membership);
  } catch (error) {
    console.error('Error in membership GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const { data: membership, error } = await supabase
      .from('memberships')
      .update(body)
      .eq('id', id)
      .select(`
        *,
        client:clients(*)
      `)
      .single();

    if (error) {
      console.error('Error updating membership:', error);
      return NextResponse.json({ error: 'Failed to update membership' }, { status: 500 });
    }

    return NextResponse.json(membership);
  } catch (error) {
    console.error('Error in membership PUT API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { id } = await params;

    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting membership:', error);
      return NextResponse.json({ error: 'Failed to delete membership' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in membership DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
