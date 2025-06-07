import { NextRequest, NextResponse } from 'next/server';

// Debug endpoint to test client saving
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Starting client save test...');
    
    // Get the request data
    const clientData = await request.json();
    console.log('📨 DEBUG: Received client data:', JSON.stringify(clientData, null, 2));

    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
    };
    console.log('🔧 DEBUG: Environment check:', envCheck);

    // Test 1: Try direct Supabase client
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      console.log('🧪 DEBUG: Testing direct Supabase insert...');
      
      const testClient = {
        owner_first_name: clientData.ownerFirstName || 'Test',
        owner_last_name: clientData.ownerLastName || 'Debug',
        contact_email: clientData.contactEmail || null,
        contact_number: clientData.contactNumber || null,
        postcode: clientData.postcode || null,
        full_address: clientData.fullAddress || null,
        dog_name: clientData.dogName || null,
        is_member: clientData.isMember || false,
        is_active: clientData.isActive !== undefined ? clientData.isActive : true,
        submission_date: clientData.submissionDate || new Date().toISOString().split('T')[0]
      };

      console.log('📝 DEBUG: Transformed client data:', JSON.stringify(testClient, null, 2));

      const { data: insertResult, error: insertError } = await supabase
        .from('clients')
        .insert(testClient)
        .select()
        .single();

      if (insertError) {
        console.error('❌ DEBUG: Direct Supabase insert failed:', insertError);
        return NextResponse.json({
          success: false,
          error: 'Direct Supabase insert failed',
          details: insertError,
          envCheck,
          testData: testClient
        }, { status: 500 });
      }

      console.log('✅ DEBUG: Direct Supabase insert successful:', insertResult);

      return NextResponse.json({
        success: true,
        message: 'Client saved successfully via direct Supabase',
        data: insertResult,
        envCheck,
        testData: testClient
      });

    } catch (supabaseError) {
      console.error('❌ DEBUG: Supabase client creation failed:', supabaseError);
      
      // Test 2: Try HTTP API approach
      try {
        console.log('🧪 DEBUG: Testing HTTP API approach...');
        
        const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
        const headers = {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Prefer': 'return=representation'
        };

        console.log('🌐 DEBUG: HTTP request details:', {
          url: `${baseUrl}/clients`,
          headers: {
            ...headers,
            'Authorization': 'Bearer [REDACTED]',
            'apikey': '[REDACTED]'
          }
        });

        const testClient = {
          owner_first_name: clientData.ownerFirstName || 'Test',
          owner_last_name: clientData.ownerLastName || 'Debug',
          contact_email: clientData.contactEmail || null,
          contact_number: clientData.contactNumber || null,
          postcode: clientData.postcode || null,
          full_address: clientData.fullAddress || null,
          dog_name: clientData.dogName || null,
          is_member: clientData.isMember || false,
          is_active: clientData.isActive !== undefined ? clientData.isActive : true,
          submission_date: clientData.submissionDate || new Date().toISOString().split('T')[0]
        };

        const response = await fetch(`${baseUrl}/clients`, {
          method: 'POST',
          headers,
          body: JSON.stringify(testClient)
        });

        console.log('📡 DEBUG: HTTP response status:', response.status);
        console.log('📡 DEBUG: HTTP response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ DEBUG: HTTP API failed:', errorText);
          return NextResponse.json({
            success: false,
            error: 'HTTP API failed',
            status: response.status,
            details: errorText,
            envCheck,
            testData: testClient
          }, { status: 500 });
        }

        const httpResult = await response.json();
        console.log('✅ DEBUG: HTTP API successful:', httpResult);

        return NextResponse.json({
          success: true,
          message: 'Client saved successfully via HTTP API',
          data: httpResult,
          envCheck,
          testData: testClient
        });

      } catch (httpError) {
        console.error('❌ DEBUG: HTTP API approach failed:', httpError);
        
        return NextResponse.json({
          success: false,
          error: 'Both Supabase client and HTTP API failed',
          supabaseError: supabaseError instanceof Error ? supabaseError.message : 'Unknown Supabase error',
          httpError: httpError instanceof Error ? httpError.message : 'Unknown HTTP error',
          envCheck,
          recommendations: [
            'Check if Supabase URL and keys are correctly set',
            'Verify database permissions and RLS policies',
            'Check if clients table exists and has correct schema',
            'Verify network connectivity to Supabase'
          ]
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('❌ DEBUG: Debug endpoint failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Client save debug endpoint',
    usage: 'POST with client data to test saving',
    testData: {
      ownerFirstName: 'Test',
      ownerLastName: 'Client',
      contactEmail: 'test@example.com',
      contactNumber: '1234567890',
      dogName: 'Test Dog'
    }
  });
}
