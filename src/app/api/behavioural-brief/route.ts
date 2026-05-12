import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BehaviouralBrief, Client } from '@/types';
import { verifyWebhookApiKey } from '@/lib/webhookAuth';

// Create Supabase client with service role key (bypasses RLS)
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Convert database row to Client type
function dbRowToClient(row: Record<string, any>): Client {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    partnerName: row.partner_name || undefined,
    dogName: row.dog_name || undefined,
    otherDogs: row.other_dogs,
    phone: row.phone,
    email: row.email,
    address: row.address,
    active: row.active,
    membership: row.membership,
    avatar: row.avatar,
    behaviouralBriefId: row.behavioural_brief_id,
    // behaviourQuestionnaireId removed - clients can now have multiple questionnaires
    booking_terms_signed: row.booking_terms_signed,
    booking_terms_signed_date: row.booking_terms_signed_date,
  };
}

// Convert Client type to database insert/update format
function clientToDbRow(client: Partial<Client>) {
  return {
    id: client.id,
    first_name: client.firstName,
    last_name: client.lastName,
    partner_name: client.partnerName || null,
    dog_name: client.dogName,
    other_dogs: client.otherDogs,
    phone: client.phone,
    email: client.email,
    address: client.address,
    active: client.active,
    membership: client.membership,
    avatar: client.avatar,
    behavioural_brief_id: client.behaviouralBriefId,
    // behaviour_questionnaire_id removed - clients can now have multiple questionnaires
    booking_terms_signed: client.booking_terms_signed,
    booking_terms_signed_date: client.booking_terms_signed_date,
  };
}

// Convert BehaviouralBrief to database row
function behaviouralBriefToDbRow(brief: Partial<BehaviouralBrief>): Record<string, any> {
  const row: Record<string, any> = {};
  
  if (brief.id !== undefined) row.id = brief.id;
  if (brief.clientId !== undefined) row.client_id = brief.clientId;
  if (brief.ownerFirstName !== undefined) row.owner_first_name = brief.ownerFirstName;
  if (brief.ownerLastName !== undefined) row.owner_last_name = brief.ownerLastName;
  if (brief.email !== undefined) row.email = brief.email;
  if (brief.contactNumber !== undefined) row.contact_number = brief.contactNumber;
  if (brief.postcode !== undefined) row.postcode = brief.postcode;
  if (brief.dogName !== undefined) row.dog_name = brief.dogName;
  if (brief.sex !== undefined) row.sex = brief.sex;
  if (brief.breed !== undefined) row.breed = brief.breed;
  if (brief.lifeWithDog !== undefined) row.life_with_dog = brief.lifeWithDog;
  if (brief.bestOutcome !== undefined) row.best_outcome = brief.bestOutcome;
  if (brief.sessionType !== undefined) row.session_type = brief.sessionType;
  if (brief.submittedAt !== undefined) row.submitted_at = brief.submittedAt.toISOString();

  return row;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authentication (public form submissions don't need auth)
    // This endpoint is public for form submissions, so we skip auth check

    const formData = await request.json();

    // Validate required fields
    if (!formData.ownerFirstName?.trim() || !formData.ownerLastName?.trim() || 
        !formData.email?.trim() || !formData.contactNumber?.trim() || 
        !formData.postcode?.trim() || !formData.dogName?.trim() || 
        !formData.sex || !formData.breed?.trim() || 
        !formData.lifeWithDog?.trim() || !formData.bestOutcome?.trim() || 
        !formData.sessionType) {
      return NextResponse.json(
        { error: 'Please fill in all required fields.' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // First, try to find existing client by email in main clients table
    let existingClient: Client | null = null;
    
    const { data: clientData, error: clientError } = await supabaseServiceRole
      .from('clients')
      .select('*')
      .eq('email', formData.email)
      .single();

    if (clientData && !clientError) {
      existingClient = dbRowToClient(clientData);
    }

    // If not found in main table, check email aliases
    if (!existingClient) {
      const { data: aliasData, error: aliasError } = await supabaseServiceRole
        .from('client_email_aliases')
        .select('client_id')
        .eq('email', formData.email.toLowerCase().trim())
        .single();

      if (aliasData && !aliasError) {
        const { data: clientFromAlias, error: clientFromAliasError } = await supabaseServiceRole
          .from('clients')
          .select('*')
          .eq('id', aliasData.client_id)
          .single();

        if (clientFromAlias && !clientFromAliasError) {
          existingClient = dbRowToClient(clientFromAlias);
        }
      }
    }

    let client: Client;

    if (existingClient) {
      // Use existing client and potentially add new dog
      client = existingClient;
      
      // Check if this is a new dog for the existing client
      const currentDogs = [
        ...(client.dogName ? [client.dogName] : []),
        ...(client.otherDogs || [])
      ];
      
      const isNewDog = !currentDogs.some(dog => 
        dog.toLowerCase().trim() === formData.dogName.toLowerCase().trim()
      );
      
      if (isNewDog) {
        // Add the new dog to the client's other dogs
        const updatedOtherDogs = [...(client.otherDogs || [])];
        
        if (!client.dogName) {
          // If client has no primary dog, make this the primary dog
          const { data: updatedClient, error: updateError } = await supabaseServiceRole
            .from('clients')
            .update({ dog_name: formData.dogName })
            .eq('id', client.id)
            .select()
            .single();

          if (updateError) throw updateError;
          client = dbRowToClient(updatedClient);
        } else {
          // Add to other dogs array
          updatedOtherDogs.push(formData.dogName);
          const { data: updatedClient, error: updateError } = await supabaseServiceRole
            .from('clients')
            .update({ other_dogs: updatedOtherDogs })
            .eq('id', client.id)
            .select()
            .single();

          if (updateError) throw updateError;
          client = dbRowToClient(updatedClient);
        }
      }
    } else {
      // Create new client
      const newClientData = clientToDbRow({
        firstName: formData.ownerFirstName,
        lastName: formData.ownerLastName,
        dogName: formData.dogName,
        phone: formData.contactNumber,
        email: formData.email,
        active: true,
        membership: false,
      });

      const { data: createdClient, error: createError } = await supabaseServiceRole
        .from('clients')
        .insert(newClientData)
        .select()
        .single();

      if (createError) throw createError;
      client = dbRowToClient(createdClient);
    }

    // Create behavioural brief data
    const briefData = {
      clientId: client.id,
      ownerFirstName: formData.ownerFirstName,
      ownerLastName: formData.ownerLastName,
      email: formData.email,
      contactNumber: formData.contactNumber,
      postcode: formData.postcode,
      dogName: formData.dogName,
      sex: formData.sex as 'Male' | 'Female',
      breed: formData.breed,
      lifeWithDog: formData.lifeWithDog,
      bestOutcome: formData.bestOutcome,
      sessionType: formData.sessionType as BehaviouralBrief['sessionType'],
      submittedAt: new Date()
    };

    // Create the behavioural brief
    const dbRow = behaviouralBriefToDbRow(briefData);
    const { data: createdBrief, error: briefError } = await supabaseServiceRole
      .from('behavioural_briefs')
      .insert(dbRow)
      .select()
      .single();

    if (briefError) throw briefError;

    // Forward to Lovable app (non-blocking)
    fetch('https://project--c09ec361-f2b1-4b43-9d0a-df480ab13b35.lovable.app/api/public/intake/behavioural-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    }).catch(err => console.error('[BEHAVIOURAL-BRIEF] Lovable forward failed:', err));

    return NextResponse.json({
      success: true,
      client: client,
      brief: createdBrief
    });

  } catch (error) {
    console.error('Error submitting behavioural brief:', error);
    
    // Return specific error messages for common issues
    let errorMessage = 'There was an error submitting your form. Please try again.';
    
    if (error instanceof Error) {
      if (error.message.includes('violates check constraint')) {
        if (error.message.includes('sex')) {
          errorMessage = 'Please select a valid sex for your dog (Male or Female).';
        } else if (error.message.includes('session_type')) {
          errorMessage = 'Please select a valid session type.';
        }
      } else if (error.message.includes('violates not-null constraint')) {
        errorMessage = 'Please fill in all required fields.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
