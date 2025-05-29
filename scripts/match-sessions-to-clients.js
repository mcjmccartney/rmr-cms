#!/usr/bin/env node

/**
 * Script to match sessions to clients by email address and update client_id
 *
 * This script:
 * 1. Fetches all clients using the API
 * 2. Fetches all sessions using the API
 * 3. Matches sessions to clients by email address
 * 4. Updates the client_id field via API calls
 * 5. Updates client_name and dog_name fields for consistency
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Use the local API endpoints instead of direct Supabase access
const API_BASE = 'http://localhost:9003/api';

async function matchSessionsToClients() {
  try {
    console.log('🚀 Starting session-to-client matching process...\n');

    // Step 1: Fetch all clients via API
    console.log('📋 Fetching clients from API...');
    const clientsResponse = await fetch(`${API_BASE}/clients`);
    if (!clientsResponse.ok) {
      throw new Error(`Failed to fetch clients: ${clientsResponse.status}`);
    }
    const clientsData = await clientsResponse.json();
    const clients = clientsData.data || [];

    console.log(`✅ Found ${clients.length} clients\n`);

    // Step 2: Fetch all sessions via API
    console.log('📅 Fetching sessions from API...');
    const sessionsResponse = await fetch(`${API_BASE}/sessions`);
    if (!sessionsResponse.ok) {
      throw new Error(`Failed to fetch sessions: ${sessionsResponse.status}`);
    }
    const sessionsData = await sessionsResponse.json();
    const sessions = sessionsData.data || [];

    console.log(`✅ Found ${sessions.length} sessions\n`);

    // Step 3: Create email-to-client mapping
    console.log('🔗 Creating email-to-client mapping...');
    const emailToClient = {};
    clients.forEach(client => {
      if (client.contactEmail) {
        emailToClient[client.contactEmail.toLowerCase()] = client;
      }
    });

    console.log(`✅ Created mapping for ${Object.keys(emailToClient).length} unique emails\n`);

    // Step 4: Match sessions to clients and prepare updates
    console.log('🔍 Matching sessions to clients...');
    const updates = [];
    const unmatched = [];

    sessions.forEach(session => {
      if (!session.email) {
        console.log(`⚠️  Session ${session.id} has no email address`);
        unmatched.push({ session, reason: 'No email address' });
        return;
      }

      const client = emailToClient[session.email.toLowerCase()];
      if (!client) {
        console.log(`⚠️  No client found for email: ${session.email}`);
        unmatched.push({ session, reason: `No client found for email: ${session.email}` });
        return;
      }

      // Prepare update data
      const updateData = {
        clientId: client.id,
        clientName: `${client.ownerFirstName} ${client.ownerLastName}`,
        dogName: client.dogName || null
      };

      updates.push({
        sessionId: session.id,
        updateData,
        clientEmail: session.email,
        clientName: updateData.clientName
      });
    });

    console.log(`✅ Found ${updates.length} sessions to update`);
    console.log(`⚠️  Found ${unmatched.length} unmatched sessions\n`);

    // Step 5: Show preview of updates
    if (updates.length > 0) {
      console.log('📋 Preview of updates to be made:');
      updates.slice(0, 5).forEach((update, index) => {
        console.log(`${index + 1}. Session ${update.sessionId}:`);
        console.log(`   Email: ${update.clientEmail}`);
        console.log(`   Will link to: ${update.clientName} (ID: ${update.updateData.client_id})`);
        console.log(`   Dog: ${update.updateData.dog_name || 'N/A'}`);
        console.log('');
      });

      if (updates.length > 5) {
        console.log(`   ... and ${updates.length - 5} more updates\n`);
      }
    }

    // Step 6: Show unmatched sessions
    if (unmatched.length > 0) {
      console.log('⚠️  Unmatched sessions:');
      unmatched.forEach((item, index) => {
        console.log(`${index + 1}. Session ${item.session.id}: ${item.reason}`);
      });
      console.log('');
    }

    // Step 7: Confirm before proceeding
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question(`Do you want to proceed with updating ${updates.length} sessions? (y/N): `, resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled by user');
      return;
    }

    // Step 8: Perform updates
    console.log('\n🔄 Updating sessions...');
    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      try {
        const response = await fetch(`${API_BASE}/sessions/${update.sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update.updateData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Failed to update session ${update.sessionId}: ${response.status} - ${errorText}`);
          errorCount++;
        } else {
          console.log(`✅ Updated session ${update.sessionId} -> ${update.clientName}`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error updating session ${update.sessionId}:`, err.message);
        errorCount++;
      }
    }

    // Step 9: Summary
    console.log('\n📊 Update Summary:');
    console.log(`✅ Successfully updated: ${successCount} sessions`);
    console.log(`❌ Failed to update: ${errorCount} sessions`);
    console.log(`⚠️  Unmatched sessions: ${unmatched.length} sessions`);
    console.log('\n🎉 Session-to-client matching process completed!');

  } catch (error) {
    console.error('❌ Error during matching process:', error.message);
    process.exit(1);
  }
}

// Run the script
matchSessionsToClients();
