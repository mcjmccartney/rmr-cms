import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API endpoint to match sessions to clients by email address
 * 
 * This endpoint:
 * 1. Fetches all clients and sessions from Supabase
 * 2. Matches sessions to clients by email address
 * 3. Updates the client_id field in sessions table
 * 4. Returns a summary of the matching process
 */

interface MatchResult {
  sessionId: string;
  email: string;
  clientId: string;
  clientName: string;
  dogName?: string;
}

interface UnmatchedSession {
  sessionId: string;
  email?: string;
  reason: string;
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();
    
    console.log('🚀 Starting session-to-client matching process...');

    // Step 1: Fetch all clients
    console.log('📋 Fetching clients from Supabase...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, contact_email, owner_first_name, owner_last_name, dog_name');

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    console.log(`✅ Found ${clients.length} clients`);

    // Step 2: Fetch all sessions
    console.log('📅 Fetching sessions from Supabase...');
    
    // First, let's check what columns exist in the sessions table
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .limit(1);

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    // Check if email column exists
    const sampleSession = sessions[0];
    const hasEmailColumn = sampleSession && 'email' in sampleSession;
    
    if (!hasEmailColumn) {
      return NextResponse.json({
        error: 'Email column not found in sessions table. Please add an email column to the sessions table first.',
        availableColumns: sampleSession ? Object.keys(sampleSession) : []
      }, { status: 400 });
    }

    // Now fetch all sessions with email
    const { data: allSessions, error: allSessionsError } = await supabase
      .from('sessions')
      .select('id, client_id, client_name, dog_name, email');

    if (allSessionsError) {
      throw new Error(`Failed to fetch all sessions: ${allSessionsError.message}`);
    }

    console.log(`✅ Found ${allSessions.length} sessions`);

    // Step 3: Create email-to-client mapping
    console.log('🔗 Creating email-to-client mapping...');
    const emailToClient: Record<string, any> = {};
    clients.forEach(client => {
      if (client.contact_email) {
        emailToClient[client.contact_email.toLowerCase()] = client;
      }
    });

    console.log(`✅ Created mapping for ${Object.keys(emailToClient).length} unique emails`);

    // Step 4: Match sessions to clients
    console.log('🔍 Matching sessions to clients...');
    const matches: MatchResult[] = [];
    const unmatched: UnmatchedSession[] = [];

    allSessions.forEach(session => {
      if (!session.email) {
        unmatched.push({
          sessionId: session.id,
          reason: 'No email address'
        });
        return;
      }

      const client = emailToClient[session.email.toLowerCase()];
      if (!client) {
        unmatched.push({
          sessionId: session.id,
          email: session.email,
          reason: `No client found for email: ${session.email}`
        });
        return;
      }

      matches.push({
        sessionId: session.id,
        email: session.email,
        clientId: client.id,
        clientName: `${client.owner_first_name} ${client.owner_last_name}`,
        dogName: client.dog_name || undefined
      });
    });

    console.log(`✅ Found ${matches.length} sessions to update`);
    console.log(`⚠️  Found ${unmatched.length} unmatched sessions`);

    // Step 5: Perform updates (if not dry run)
    let updateResults = { success: 0, errors: 0 };
    
    if (!dryRun && matches.length > 0) {
      console.log('🔄 Updating sessions...');
      
      for (const match of matches) {
        try {
          const { error } = await supabase
            .from('sessions')
            .update({
              client_id: match.clientId,
              client_name: match.clientName,
              dog_name: match.dogName || null
            })
            .eq('id', match.sessionId);

          if (error) {
            console.error(`❌ Failed to update session ${match.sessionId}: ${error.message}`);
            updateResults.errors++;
          } else {
            console.log(`✅ Updated session ${match.sessionId} -> ${match.clientName}`);
            updateResults.success++;
          }
        } catch (err) {
          console.error(`❌ Error updating session ${match.sessionId}:`, err);
          updateResults.errors++;
        }
      }
    }

    // Step 6: Return summary
    const summary = {
      totalSessions: allSessions.length,
      totalClients: clients.length,
      matchedSessions: matches.length,
      unmatchedSessions: unmatched.length,
      dryRun,
      updateResults: dryRun ? null : updateResults,
      matches: matches.slice(0, 10), // Show first 10 matches
      unmatched: unmatched.slice(0, 10), // Show first 10 unmatched
      hasMoreMatches: matches.length > 10,
      hasMoreUnmatched: unmatched.length > 10
    };

    return NextResponse.json({
      success: true,
      message: dryRun ? 'Dry run completed - no changes made' : 'Matching process completed',
      summary
    });

  } catch (error) {
    console.error('❌ Error during matching process:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for checking the current state
export async function GET() {
  try {
    // Check sessions table structure
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .limit(1);

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    const sampleSession = sessions[0];
    const hasEmailColumn = sampleSession && 'email' in sampleSession;

    // Get counts
    const { count: sessionCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true });

    const { count: clientCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    // Count sessions with and without client_id
    const { count: sessionsWithClientId } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .not('client_id', 'is', null);

    const { count: sessionsWithoutClientId } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .is('client_id', null);

    return NextResponse.json({
      hasEmailColumn,
      availableColumns: sampleSession ? Object.keys(sampleSession) : [],
      counts: {
        totalSessions: sessionCount || 0,
        totalClients: clientCount || 0,
        sessionsWithClientId: sessionsWithClientId || 0,
        sessionsWithoutClientId: sessionsWithoutClientId || 0
      }
    });

  } catch (error) {
    console.error('❌ Error checking state:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
