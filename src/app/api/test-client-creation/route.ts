import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to verify client creation works
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TEST: Client creation test started');
    
    const testData = {
      ownerFirstName: 'Matthew',
      ownerLastName: 'McCartney',
      dogName: 'Kuki',
      contactEmail: 'mcjmccartney@gmail.com',
      contactNumber: '',
      fullAddress: '120 The Street',
      postcode: 'ME90LW',
      isMember: false,
      isActive: true
    };

    console.log('📝 TEST: Using test data:', JSON.stringify(testData, null, 2));

    // Call the actual client API
    const apiUrl = `${request.nextUrl.origin}/api/clients`;
    console.log('🌐 TEST: Calling API at:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('📡 TEST: API response status:', response.status);
    console.log('📡 TEST: API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ TEST: API call failed:', errorText);
      return NextResponse.json({
        success: false,
        error: 'API call failed',
        status: response.status,
        details: errorText,
        testData
      }, { status: 500 });
    }

    const result = await response.json();
    console.log('✅ TEST: API call successful:', result);

    return NextResponse.json({
      success: true,
      message: 'Client creation test successful',
      apiResponse: result,
      testData
    });

  } catch (error) {
    console.error('❌ TEST: Test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for instructions
export async function GET() {
  return NextResponse.json({
    message: 'Client creation test endpoint',
    usage: 'POST to test client creation with sample data',
    testData: {
      ownerFirstName: 'Matthew',
      ownerLastName: 'McCartney',
      dogName: 'Kuki',
      contactEmail: 'mcjmccartney@gmail.com',
      contactNumber: '',
      fullAddress: '120 The Street',
      postcode: 'ME90LW',
      isMember: false,
      isActive: true
    }
  });
}
