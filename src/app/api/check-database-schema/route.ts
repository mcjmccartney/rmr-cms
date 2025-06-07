import { NextRequest, NextResponse } from 'next/server';

// Check what columns actually exist in the database
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 SCHEMA CHECK: Checking actual database schema...');
    
    const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!baseUrl || !serviceKey) {
      return NextResponse.json({
        error: 'Supabase configuration missing',
        baseUrl: !!baseUrl,
        serviceKey: !!serviceKey
      }, { status: 500 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    };

    // Try to get the first client to see what columns exist
    console.log('📡 SCHEMA CHECK: Fetching first client to check columns...');
    const response = await fetch(`${baseUrl}/clients?select=*&limit=1`, {
      method: 'GET',
      headers,
    });

    console.log('📡 SCHEMA CHECK: Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SCHEMA CHECK: Failed to fetch clients:', errorText);
      return NextResponse.json({
        error: 'Failed to fetch clients',
        status: response.status,
        details: errorText
      }, { status: 500 });
    }

    const clients = await response.json();
    console.log('✅ SCHEMA CHECK: Clients fetched successfully');

    // Analyze the structure
    const analysis = {
      totalClients: clients.length,
      availableColumns: clients.length > 0 ? Object.keys(clients[0]) : [],
      sampleClient: clients.length > 0 ? clients[0] : null
    };

    console.log('📊 SCHEMA CHECK: Analysis:', analysis);

    // Test minimal client creation
    console.log('🧪 SCHEMA CHECK: Testing minimal client creation...');
    
    const minimalClient = {
      owner_first_name: 'Schema',
      owner_last_name: 'Test'
    };

    const createResponse = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(minimalClient)
    });

    console.log('📡 SCHEMA CHECK: Create response status:', createResponse.status);

    let createResult = null;
    let createError = null;

    if (createResponse.ok) {
      createResult = await createResponse.json();
      console.log('✅ SCHEMA CHECK: Minimal client created successfully');
      
      // Clean up the test client
      if (createResult && createResult.length > 0) {
        const testClientId = createResult[0].id;
        await fetch(`${baseUrl}/clients?id=eq.${testClientId}`, {
          method: 'DELETE',
          headers
        });
        console.log('🧹 SCHEMA CHECK: Test client cleaned up');
      }
    } else {
      createError = await createResponse.text();
      console.error('❌ SCHEMA CHECK: Minimal client creation failed:', createError);
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema check completed',
      analysis,
      minimalClientTest: {
        success: createResponse.ok,
        status: createResponse.status,
        result: createResult,
        error: createError
      },
      recommendations: [
        'Use only the columns shown in availableColumns',
        'Test with minimal required fields first',
        'Add optional fields one by one to identify issues'
      ]
    });

  } catch (error) {
    console.error('❌ SCHEMA CHECK: Error:', error);
    
    return NextResponse.json({
      error: 'Schema check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint to test specific client data
export async function POST(request: NextRequest) {
  try {
    const testData = await request.json();
    console.log('🧪 SCHEMA TEST: Testing client data:', testData);
    
    const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const headers = {
      'Content-Type': 'application/json',
      'apikey': serviceKey!,
      'Authorization': `Bearer ${serviceKey!}`,
      'Prefer': 'return=representation'
    };

    const response = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testData)
    });

    console.log('📡 SCHEMA TEST: Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SCHEMA TEST: Failed:', errorText);
      return NextResponse.json({
        success: false,
        status: response.status,
        error: errorText,
        testData
      }, { status: 500 });
    }

    const result = await response.json();
    console.log('✅ SCHEMA TEST: Success:', result);

    // Clean up test data
    if (result && result.length > 0) {
      const testClientId = result[0].id;
      await fetch(`${baseUrl}/clients?id=eq.${testClientId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey!,
          'Authorization': `Bearer ${serviceKey!}`,
        }
      });
      console.log('🧹 SCHEMA TEST: Test client cleaned up');
    }

    return NextResponse.json({
      success: true,
      message: 'Client creation test successful',
      result,
      testData
    });

  } catch (error) {
    console.error('❌ SCHEMA TEST: Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
