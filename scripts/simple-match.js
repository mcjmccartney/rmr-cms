#!/usr/bin/env node

/**
 * Simple script to match sessions to clients by email
 * This script will show you what needs to be done manually
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function checkData() {
  try {
    console.log('🔍 Checking current data state...\n');

    // Test API endpoints
    console.log('📋 Testing clients API...');
    try {
      const clientsResponse = await fetch('http://localhost:9003/api/clients');
      console.log(`Clients API status: ${clientsResponse.status}`);
      
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        console.log(`✅ Found ${clientsData.data?.length || 0} clients`);
        
        // Show first few clients
        if (clientsData.data && clientsData.data.length > 0) {
          console.log('\nFirst 3 clients:');
          clientsData.data.slice(0, 3).forEach((client, i) => {
            console.log(`${i + 1}. ${client.ownerFirstName} ${client.ownerLastName} - ${client.contactEmail}`);
          });
        }
      } else {
        const errorText = await clientsResponse.text();
        console.log(`❌ Clients API error: ${errorText}`);
      }
    } catch (err) {
      console.log(`❌ Clients API error: ${err.message}`);
    }

    console.log('\n📅 Testing sessions API...');
    try {
      const sessionsResponse = await fetch('http://localhost:9003/api/sessions');
      console.log(`Sessions API status: ${sessionsResponse.status}`);
      
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        console.log(`✅ Found ${sessionsData.data?.length || 0} sessions`);
        
        // Show first few sessions
        if (sessionsData.data && sessionsData.data.length > 0) {
          console.log('\nFirst 3 sessions:');
          sessionsData.data.slice(0, 3).forEach((session, i) => {
            console.log(`${i + 1}. ${session.clientName} - ${session.date} ${session.time}`);
            console.log(`   Client ID: ${session.clientId || 'NOT SET'}`);
            console.log(`   Email: ${session.email || 'NOT SET'}`);
            console.log('');
          });
        }
      } else {
        const errorText = await sessionsResponse.text();
        console.log(`❌ Sessions API error: ${errorText}`);
      }
    } catch (err) {
      console.log(`❌ Sessions API error: ${err.message}`);
    }

    console.log('\n💡 Manual Steps to Link Sessions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Open the sessions table');
    console.log('3. For each session with an email but no client_id:');
    console.log('   a. Find the matching client by email in the clients table');
    console.log('   b. Copy the client\'s ID');
    console.log('   c. Update the session\'s client_id field');
    console.log('   d. Update the session\'s client_name field to match the client');
    console.log('   e. Update the session\'s dog_name field to match the client');
    console.log('\n🔗 Or use the web interface at: http://localhost:9003/admin/match-sessions');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
checkData();
