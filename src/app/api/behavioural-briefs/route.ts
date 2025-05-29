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

// Convert database row to BehaviouralBrief type
function dbRowToBehaviouralBrief(row: any) {
  return {
    id: row.id,
    clientId: row.client_id,
    dogName: row.dog_name,
    dogSex: row.dog_sex,
    dogBreed: row.dog_breed,
    lifeWithDogAndHelpNeeded: row.life_with_dog_and_help_needed,
    bestOutcome: row.best_outcome,
    idealSessionTypes: row.ideal_session_types || [],
    submissionDate: row.submission_date,
    createdAt: row.created_at,
  };
}

// Convert BehaviouralBrief to database insert format
function behaviouralBriefToDbInsert(brief: any) {
  return {
    client_id: brief.clientId,
    dog_name: brief.dogName,
    dog_sex: brief.dogSex,
    dog_breed: brief.dogBreed,
    life_with_dog_and_help_needed: brief.lifeWithDogAndHelpNeeded,
    best_outcome: brief.bestOutcome,
    ideal_session_types: brief.idealSessionTypes || [],
    submission_date: brief.submissionDate,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    let query = supabase
      .from('behavioural_briefs')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching behavioural briefs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const briefs = data?.map(dbRowToBehaviouralBrief) || [];
    return NextResponse.json({ data: briefs });

  } catch (error) {
    console.error('Behavioural briefs API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const briefData = await request.json();

    const insertData = behaviouralBriefToDbInsert(briefData);

    const { data, error } = await supabase
      .from('behavioural_briefs')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating behavioural brief:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const brief = dbRowToBehaviouralBrief(data);
    return NextResponse.json({ data: brief });

  } catch (error) {
    console.error('Behavioural brief creation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
