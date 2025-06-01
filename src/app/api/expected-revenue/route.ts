import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch expected revenue targets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let query = supabase
      .from('expected_revenue_targets')
      .select('*');

    if (year) {
      query = query.eq('year', parseInt(year));
    }

    if (month) {
      query = query.eq('month', parseInt(month));
    }

    const { data, error } = await query.order('year', { ascending: false }).order('month', { ascending: false });

    if (error) {
      console.error('Error fetching expected revenue targets:', error);
      return NextResponse.json({ error: 'Failed to fetch expected revenue targets' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in expected revenue GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update expected revenue target
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, month, expected_amount } = body;

    if (!year || !month || expected_amount === undefined) {
      return NextResponse.json({ error: 'Year, month, and expected_amount are required' }, { status: 400 });
    }

    // Use upsert to handle both create and update
    const { data, error } = await supabase
      .from('expected_revenue_targets')
      .upsert(
        {
          year: parseInt(year),
          month: parseInt(month),
          expected_amount: parseFloat(expected_amount),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'year,month',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting expected revenue target:', error);
      return NextResponse.json({ error: 'Failed to save expected revenue target' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in expected revenue POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete expected revenue target
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('expected_revenue_targets')
      .delete()
      .eq('year', parseInt(year))
      .eq('month', parseInt(month));

    if (error) {
      console.error('Error deleting expected revenue target:', error);
      return NextResponse.json({ error: 'Failed to delete expected revenue target' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in expected revenue DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
