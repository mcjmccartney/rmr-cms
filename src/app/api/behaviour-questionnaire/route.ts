import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BehaviourQuestionnaire, Client } from '@/types';

// Create Supabase client with service role key (bypasses RLS)
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Note: This endpoint is public for form submissions, so no webhook auth required

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

// Convert BehaviourQuestionnaire to database row
function behaviourQuestionnaireToDbRow(questionnaire: Partial<BehaviourQuestionnaire>): Record<string, any> {
  const row: Record<string, any> = {};
  
  if (questionnaire.id !== undefined) row.id = questionnaire.id;
  if (questionnaire.clientId !== undefined) row.client_id = questionnaire.clientId;
  if (questionnaire.ownerFirstName !== undefined) row.owner_first_name = questionnaire.ownerFirstName;
  if (questionnaire.ownerLastName !== undefined) row.owner_last_name = questionnaire.ownerLastName;
  if (questionnaire.email !== undefined) row.email = questionnaire.email;
  if (questionnaire.contactNumber !== undefined) row.contact_number = questionnaire.contactNumber;
  if (questionnaire.address1 !== undefined) row.address1 = questionnaire.address1;
  if (questionnaire.address2 !== undefined) row.address2 = questionnaire.address2;
  if (questionnaire.city !== undefined) row.city = questionnaire.city;
  if (questionnaire.stateProvince !== undefined) row.state_province = questionnaire.stateProvince;
  if (questionnaire.zipPostalCode !== undefined) row.zip_postal_code = questionnaire.zipPostalCode;
  if (questionnaire.country !== undefined) row.country = questionnaire.country;
  if (questionnaire.howDidYouHear !== undefined) row.how_did_you_hear = questionnaire.howDidYouHear;
  if (questionnaire.dogName !== undefined) row.dog_name = questionnaire.dogName;
  if (questionnaire.age !== undefined) row.age = questionnaire.age;
  if (questionnaire.sex !== undefined) row.sex = questionnaire.sex;
  if (questionnaire.breed !== undefined) row.breed = questionnaire.breed;
  if (questionnaire.neuteredSpayed !== undefined) row.neutered_spayed = questionnaire.neuteredSpayed;
  if (questionnaire.mainHelp !== undefined) row.main_help = questionnaire.mainHelp;
  if (questionnaire.firstNoticed !== undefined) row.first_noticed = questionnaire.firstNoticed;
  if (questionnaire.whenWhereHow !== undefined) row.when_where_how = questionnaire.whenWhereHow;
  if (questionnaire.recentChange !== undefined) row.recent_change = questionnaire.recentChange;
  if (questionnaire.canAnticipate !== undefined) row.can_anticipate = questionnaire.canAnticipate;
  if (questionnaire.whyThinking !== undefined) row.why_thinking = questionnaire.whyThinking;
  if (questionnaire.whatDoneSoFar !== undefined) row.what_done_so_far = questionnaire.whatDoneSoFar;
  if (questionnaire.idealGoal !== undefined) row.ideal_goal = questionnaire.idealGoal;
  if (questionnaire.anythingElse !== undefined) row.anything_else = questionnaire.anythingElse;
  if (questionnaire.medicalHistory !== undefined) row.medical_history = questionnaire.medicalHistory;
  if (questionnaire.vetAdvice !== undefined) row.vet_advice = questionnaire.vetAdvice;
  if (questionnaire.whereGotDog !== undefined) row.where_got_dog = questionnaire.whereGotDog;
  if (questionnaire.rescueBackground !== undefined) row.rescue_background = questionnaire.rescueBackground;
  if (questionnaire.ageWhenGot !== undefined) row.age_when_got = questionnaire.ageWhenGot;
  if (questionnaire.whatFeed !== undefined) row.what_feed = questionnaire.whatFeed;
  if (questionnaire.foodMotivated !== undefined) row.food_motivated = questionnaire.foodMotivated;
  if (questionnaire.mealtime !== undefined) row.mealtime = questionnaire.mealtime;
  if (questionnaire.treatRoutine !== undefined) row.treat_routine = questionnaire.treatRoutine;
  if (questionnaire.happyWithTreats !== undefined) row.happy_with_treats = questionnaire.happyWithTreats;
  if (questionnaire.typesOfPlay !== undefined) row.types_of_play = questionnaire.typesOfPlay;
  if (questionnaire.affectionate !== undefined) row.affectionate = questionnaire.affectionate;
  if (questionnaire.exercise !== undefined) row.exercise = questionnaire.exercise;
  if (questionnaire.useMuzzle !== undefined) row.use_muzzle = questionnaire.useMuzzle;
  if (questionnaire.familiarPeople !== undefined) row.familiar_people = questionnaire.familiarPeople;
  if (questionnaire.unfamiliarPeople !== undefined) row.unfamiliar_people = questionnaire.unfamiliarPeople;
  if (questionnaire.housetrained !== undefined) row.housetrained = questionnaire.housetrained;
  if (questionnaire.likesToDo !== undefined) row.likes_to_do = questionnaire.likesToDo;
  if (questionnaire.likeAboutDog !== undefined) row.like_about_dog = questionnaire.likeAboutDog;
  if (questionnaire.mostChallenging !== undefined) row.most_challenging = questionnaire.mostChallenging;
  if (questionnaire.howGood !== undefined) row.how_good = questionnaire.howGood;
  if (questionnaire.favouriteRewards !== undefined) row.favourite_rewards = questionnaire.favouriteRewards;
  if (questionnaire.howBad !== undefined) row.how_bad = questionnaire.howBad;
  if (questionnaire.effectOfBad !== undefined) row.effect_of_bad = questionnaire.effectOfBad;
  if (questionnaire.professionalTraining !== undefined) row.professional_training = questionnaire.professionalTraining;
  if (questionnaire.sociabilityDogs !== undefined) row.sociability_dogs = questionnaire.sociabilityDogs;
  if (questionnaire.sociabilityPeople !== undefined) row.sociability_people = questionnaire.sociabilityPeople;
  if (questionnaire.anythingElseToKnow !== undefined) row.anything_else_to_know = questionnaire.anythingElseToKnow;
  if (questionnaire.timePerWeek !== undefined) row.time_per_week = questionnaire.timePerWeek;
  if (questionnaire.submittedAt !== undefined) row.submitted_at = questionnaire.submittedAt.toISOString();

  return row;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();

    // Basic validation for required fields
    if (!formData.ownerFirstName?.trim() || !formData.ownerLastName?.trim() || 
        !formData.email?.trim() || !formData.contactNumber?.trim() || 
        !formData.dogName?.trim() || !formData.sex) {
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
    let shouldCreateClient = false;

    if (existingClient) {
      client = existingClient;

      // Allow re-submissions — previous questionnaires are preserved as historical records
    } else {
      shouldCreateClient = true;
      // Will create client after questionnaire
      client = {} as Client; // Temporary
    }

    // Create behaviour questionnaire data
    const questionnaireData = {
      clientId: shouldCreateClient ? 'temp-client-id' : client.id,
      ownerFirstName: formData.ownerFirstName,
      ownerLastName: formData.ownerLastName,
      email: formData.email,
      contactNumber: formData.contactNumber,
      address1: formData.address1,
      address2: formData.address2,
      city: formData.city,
      stateProvince: formData.stateProvince,
      zipPostalCode: formData.zipPostalCode,
      country: formData.country,
      howDidYouHear: formData.howDidYouHear,
      dogName: formData.dogName,
      age: formData.age,
      sex: formData.sex as 'Male' | 'Female',
      breed: formData.breed,
      neuteredSpayed: formData.neuteredSpayed,
      mainHelp: formData.mainHelp,
      firstNoticed: formData.firstNoticed,
      whenWhereHow: formData.whenWhereHow,
      recentChange: formData.recentChange,
      canAnticipate: formData.canAnticipate,
      whyThinking: formData.whyThinking,
      whatDoneSoFar: formData.whatDoneSoFar,
      idealGoal: formData.idealGoal,
      anythingElse: formData.anythingElse,
      medicalHistory: formData.medicalHistory,
      vetAdvice: formData.vetAdvice,
      whereGotDog: formData.whereGotDog,
      rescueBackground: formData.rescueBackground,
      ageWhenGot: formData.ageWhenGot,
      whatFeed: formData.whatFeed,
      foodMotivated: formData.foodMotivated,
      mealtime: formData.mealtime,
      treatRoutine: formData.treatRoutine,
      happyWithTreats: formData.happyWithTreats,
      typesOfPlay: formData.typesOfPlay,
      affectionate: formData.affectionate,
      exercise: formData.exercise,
      useMuzzle: formData.useMuzzle,
      familiarPeople: formData.familiarPeople,
      unfamiliarPeople: formData.unfamiliarPeople,
      housetrained: formData.housetrained,
      likesToDo: formData.likesToDo,
      likeAboutDog: formData.likeAboutDog,
      mostChallenging: formData.mostChallenging,
      howGood: formData.howGood,
      favouriteRewards: formData.favouriteRewards,
      howBad: formData.howBad,
      effectOfBad: formData.effectOfBad,
      professionalTraining: formData.professionalTraining,
      sociabilityDogs: formData.sociabilityDogs,
      sociabilityPeople: formData.sociabilityPeople,
      anythingElseToKnow: formData.anythingElseToKnow,
      timePerWeek: formData.timePerWeek,
      submittedAt: new Date()
    };

    if (shouldCreateClient) {
      // Create new client first
      const newClientData = clientToDbRow({
        firstName: formData.ownerFirstName,
        lastName: formData.ownerLastName,
        dogName: formData.dogName,
        phone: formData.contactNumber,
        email: formData.email,
        address: `${formData.address1}${formData.address2 ? ', ' + formData.address2 : ''}, ${formData.city}, ${formData.stateProvince} ${formData.zipPostalCode}, ${formData.country}`,
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
      
      // Update questionnaire data with actual client ID
      questionnaireData.clientId = client.id;
    }

    // Create the behaviour questionnaire
    const dbRow = behaviourQuestionnaireToDbRow(questionnaireData);
    const { data: createdQuestionnaire, error: questionnaireError } = await supabaseServiceRole
      .from('behaviour_questionnaires')
      .insert(dbRow)
      .select()
      .single();

    if (questionnaireError) throw questionnaireError;

    // Update client's dog name to match owner's spelling from questionnaire
    if (existingClient) {
      const questionnaireDogName = formData.dogName.trim();
      const currentPrimaryDog = existingClient.dogName?.trim() || '';
      const currentOtherDogs = existingClient.otherDogs || [];

      // Check if questionnaire dog matches primary dog (case-insensitive)
      if (currentPrimaryDog && currentPrimaryDog.toLowerCase() === questionnaireDogName.toLowerCase()) {
        // Update primary dog name to match owner's spelling
        if (currentPrimaryDog !== questionnaireDogName) {
          await supabaseServiceRole
            .from('clients')
            .update({
              dog_name: questionnaireDogName,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingClient.id);

          console.log(`Updated primary dog name from "${currentPrimaryDog}" to "${questionnaireDogName}" for client ${existingClient.id}`);
        }
      }
      // Check if questionnaire dog matches any dog in other_dogs (case-insensitive)
      else {
        const matchingDogIndex = currentOtherDogs.findIndex(
          dog => dog.toLowerCase().trim() === questionnaireDogName.toLowerCase()
        );

        if (matchingDogIndex !== -1) {
          // Update the matching dog's spelling in other_dogs array
          const updatedOtherDogs = [...currentOtherDogs];
          updatedOtherDogs[matchingDogIndex] = questionnaireDogName;

          await supabaseServiceRole
            .from('clients')
            .update({
              other_dogs: updatedOtherDogs,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingClient.id);

          console.log(`Updated other dog name from "${currentOtherDogs[matchingDogIndex]}" to "${questionnaireDogName}" for client ${existingClient.id}`);
        }
        // Dog doesn't exist - add to other_dogs or set as primary if none exists
        else if (!currentPrimaryDog) {
          // No primary dog - set this as primary
          await supabaseServiceRole
            .from('clients')
            .update({
              dog_name: questionnaireDogName,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingClient.id);

          console.log(`Set "${questionnaireDogName}" as primary dog for client ${existingClient.id}`);
        } else {
          // Add to other_dogs array
          const updatedOtherDogs = [...currentOtherDogs, questionnaireDogName];

          await supabaseServiceRole
            .from('clients')
            .update({
              other_dogs: updatedOtherDogs,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingClient.id);

          console.log(`Added "${questionnaireDogName}" to other_dogs for client ${existingClient.id}`);
        }
      }
    }

    // NEW: Populate client address if blank and this is for an existing client
    if (existingClient && (!existingClient.address || existingClient.address.trim() === '')) {
      const fullAddress = `${formData.address1}${formData.address2 ? ', ' + formData.address2 : ''}, ${formData.city}, ${formData.stateProvince} ${formData.zipPostalCode}, ${formData.country}`;

      console.log('Populating blank address for existing client:', {
        clientId: existingClient.id,
        clientName: `${existingClient.firstName} ${existingClient.lastName}`,
        address: fullAddress
      });

      await supabaseServiceRole
        .from('clients')
        .update({
          address: fullAddress,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingClient.id);
    }

    // Forward to Lovable app (non-blocking)
    fetch('https://project--c09ec361-f2b1-4b43-9d0a-df480ab13b35.lovable.app/api/public/intake/behaviour-questionnaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    }).catch(err => console.error('[QUESTIONNAIRE] Lovable forward failed:', err));

    return NextResponse.json({
      success: true,
      client: client,
      questionnaire: createdQuestionnaire
    });

  } catch (error) {
    console.error('Error submitting behaviour questionnaire:', error);
    
    let errorMessage = 'There was an error submitting your questionnaire. Please try again.';
    
    if (error instanceof Error) {
      if (error.message.includes('violates check constraint')) {
        if (error.message.includes('sex')) {
          errorMessage = 'Please select a valid sex for your dog (Male or Female).';
        } else if (error.message.includes('sociability')) {
          errorMessage = 'Please select valid sociability options.';
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
