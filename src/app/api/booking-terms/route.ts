import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key (bypasses RLS)
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface BookingTerms {
  id: string;
  email: string;
  submitted: string;
  created_at?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Check if booking terms already exist for this email
    const { data: existingBookingTerms, error: checkError } = await supabaseServiceRole
      .from('booking_terms')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Check if this is an update request (overwrite existing)
    const isUpdate = request.headers.get('x-booking-terms-update') === 'true';

    if (existingBookingTerms && !checkError && !isUpdate) {
      return NextResponse.json(
        { error: 'Booking terms have already been signed for this email address.' },
        { status: 400 }
      );
    }

    // Get the active version with activated_at date
    const { data: activeVersion } = await supabaseServiceRole
      .from('booking_terms_versions')
      .select('id, activated_at')
      .eq('is_active', true)
      .single();

    let bookingTerms;
    let createError;

    // Always INSERT a new row — previous submissions are preserved as historical records
    const { data: newBookingTerms, error: insertError } = await supabaseServiceRole
      .from('booking_terms')
      .insert([{
        email: email.toLowerCase().trim(),
        submitted: new Date().toISOString(),
        version_id: activeVersion?.id || null
      }])
      .select()
      .single();

    bookingTerms = newBookingTerms;
    createError = insertError;

    if (createError) throw createError;

    // Try to update client profile if exists (check main clients table)
    const { data: clientData, error: clientError } = await supabaseServiceRole
      .from('clients')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Format the booking terms version display
    let termsVersion = 'Unknown';
    if (activeVersion?.activated_at) {
      const activationDate = new Date(activeVersion.activated_at).toLocaleDateString('en-GB');
      termsVersion = `From ${activationDate}`;
    }

    let resolvedClientId: string | null = null;

    if (clientData && !clientError) {
      // Update client with booking terms signed status
      await supabaseServiceRole
        .from('clients')
        .update({
          booking_terms_signed: true,
          booking_terms_signed_date: new Date().toISOString(),
          booking_terms_version: termsVersion
        })
        .eq('id', clientData.id);
      resolvedClientId = clientData.id;
    } else {
      // Check email aliases table
      const { data: aliasData, error: aliasError } = await supabaseServiceRole
        .from('client_email_aliases')
        .select('client_id')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (aliasData && !aliasError) {
        // Update client via alias
        await supabaseServiceRole
          .from('clients')
          .update({
            booking_terms_signed: true,
            booking_terms_signed_date: new Date().toISOString(),
            booking_terms_version: termsVersion
          })
          .eq('id', aliasData.client_id);
        resolvedClientId = aliasData.client_id;
      }
    }

    // Fire booking terms webhook with client name and email data
    if (resolvedClientId) {
      try {
        const { data: fullClient } = await supabaseServiceRole
          .from('clients')
          .select('first_name, last_name, partner_name, email')
          .eq('id', resolvedClientId)
          .single();

        const { data: aliases } = await supabaseServiceRole
          .from('client_email_aliases')
          .select('email')
          .eq('client_id', resolvedClientId);

        if (fullClient) {
          const aliasEmails = (aliases || [])
            .map((a: { email: string }) => a.email)
            .filter((e: string) => e.toLowerCase() !== fullClient.email?.toLowerCase());
          const allEmails = [fullClient.email, ...aliasEmails].filter(Boolean);
          const emailList = allEmails.join(', ');

          // Determine partner first name:
          // 1. Use explicit partner_name field if set
          // 2. Otherwise look up alias emails to find a linked client
          let partnerFirstName = fullClient.partner_name?.trim().split(' ')[0];
          if (!partnerFirstName) {
            for (const aliasEmail of aliasEmails) {
              const { data: linkedClient } = await supabaseServiceRole
                .from('clients')
                .select('first_name')
                .eq('email', aliasEmail.toLowerCase())
                .neq('id', resolvedClientId)
                .single();
              if (linkedClient) {
                partnerFirstName = linkedClient.first_name;
                break;
              }
            }
          }
          const allNames = partnerFirstName
            ? `${fullClient.first_name} & ${partnerFirstName}`
            : `${fullClient.first_name} ${fullClient.last_name}`.trim();

          const webhookPayload = {
            all_names: allNames,
            email_list: emailList,
            clientFirstName: fullClient.first_name,
            clientLastName: fullClient.last_name,
            clientEmail: fullClient.email,
            isUpdate: true,
          };

          await Promise.allSettled([
            fetch('https://hook.eu1.make.com/yaoalfe77uqtw4xv9fbh5atf4okq14wm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            }),
            fetch('https://hook.eu1.make.com/1idapny85mc0paxt4hr75ajoka01r2sk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            }),
          ]);
        }
      } catch (webhookError) {
        console.error('Error firing booking terms webhook:', webhookError);
        // Don't fail the request if webhook errors
      }
    }

    return NextResponse.json({
      success: true,
      bookingTerms: bookingTerms
    });

  } catch (error) {
    console.error('Error submitting booking terms:', error);
    
    let errorMessage = 'An error occurred. Please try again.';
    
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        errorMessage = 'Booking terms have already been signed for this email address.';
      } else if (error.message.includes('violates not-null constraint')) {
        errorMessage = 'Email address is required.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint to check if booking terms exist for an email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Check if booking terms exist for this email and get the version they signed
    const { data: bookingTerms, error } = await supabaseServiceRole
      .from('booking_terms')
      .select('*, version:booking_terms_versions(id, version_number, title, html_content, activated_at)')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({
      exists: !!bookingTerms,
      bookingTerms: bookingTerms || null
    });

  } catch (error) {
    console.error('Error checking booking terms:', error);
    return NextResponse.json(
      { error: 'Error checking booking terms status' },
      { status: 500 }
    );
  }
}
