import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeEmail, addSecurityHeaders } from '@/lib/security';
import { verifyWebhookApiKey } from '@/lib/webhookAuth';

/**
 * Manual Membership Creation Endpoint
 * 
 * Creates a membership record manually when Squarespace webhook fails
 * 
 * Usage: POST /api/manual-membership
 * Headers: x-api-key: YOUR_WEBHOOK_API_KEY
 * Body: { "email": "customer@example.com", "amount": 8.00, "date": "2026-01-21" }
 */

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    if (!verifyWebhookApiKey(request)) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ));
    }

    const body = await request.json();
    const { email, amount, date } = body;

    // Validate required fields
    if (!email || !amount || !date) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Missing required fields: email, amount, date' },
        { status: 400 }
      ));
    }

    // Sanitize and validate email
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail || !sanitizedEmail.includes('@')) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      ));
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      ));
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      ));
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if membership already exists for this email and date
    const { data: existing, error: checkError } = await supabase
      .from('memberships')
      .select('*')
      .eq('email', sanitizedEmail)
      .eq('date', date)
      .single();

    if (existing && !checkError) {
      return addSecurityHeaders(NextResponse.json({
        success: false,
        message: 'Membership already exists for this email and date',
        data: existing
      }));
    }

    // Create membership record
    const { data: membership, error: createError } = await supabase
      .from('memberships')
      .insert({
        email: sanitizedEmail,
        date: date,
        amount: parsedAmount
      })
      .select()
      .single();

    if (createError) {
      console.error('[MANUAL-MEMBERSHIP] Error creating membership:', createError);
      return addSecurityHeaders(NextResponse.json(
        { error: 'Failed to create membership', details: createError.message },
        { status: 500 }
      ));
    }

    // Update client membership status if client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('email', sanitizedEmail)
      .single();

    if (client && !clientError) {
      await supabase
        .from('clients')
        .update({ membership: true, active: true })
        .eq('id', client.id);
    }

    console.log('[MANUAL-MEMBERSHIP] Membership created:', {
      email: sanitizedEmail,
      amount: parsedAmount,
      date: date
    });

    return addSecurityHeaders(NextResponse.json({
      success: true,
      message: 'Membership created successfully',
      data: membership
    }));

  } catch (error) {
    console.error('[MANUAL-MEMBERSHIP] Error:', error);
    return addSecurityHeaders(NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    ));
  }
}

// GET endpoint for help
export async function GET() {
  return addSecurityHeaders(NextResponse.json({
    message: 'Manual Membership Creation Endpoint',
    usage: {
      method: 'POST',
      headers: {
        'x-api-key': 'YOUR_WEBHOOK_API_KEY',
        'Content-Type': 'application/json'
      },
      body: {
        email: 'customer@example.com',
        amount: 8.00,
        date: '2026-01-21'
      }
    },
    example: `curl -X POST "https://rmrcms.vercel.app/api/manual-membership" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"email": "customer@example.com", "amount": 8.00, "date": "2026-01-21"}'`
  }));
}

