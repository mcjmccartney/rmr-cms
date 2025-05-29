import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  console.log('🔧 Supabase Config Check:');
  console.log('📍 URL:', supabaseUrl ? 'present' : 'missing');
  console.log('🔐 Service Key:', supabaseServiceKey ? 'present' : 'missing');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration is missing - please check your .env.local file');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { type, data } = await request.json();

    console.log('🔍 Public intake submission:', { type, data });

    if (type === 'behavioural-brief') {
      // First, check if client exists by email
      console.log('🔍 Searching for existing client with email:', data.contactEmail);
      const { data: existingClients, error: clientSearchError } = await supabase
        .from('clients')
        .select('id')
        .eq('contact_email', data.contactEmail)
        .limit(1);

      if (clientSearchError) {
        console.error('❌ Client search error:', clientSearchError);
        throw new Error(`Failed to search for existing client: ${clientSearchError.message}`);
      }

      console.log('✅ Client search result:', existingClients);

      let clientId: string;

      if (existingClients && existingClients.length > 0) {
        // Client exists, use existing ID
        clientId = existingClients[0].id;
        console.log('✅ Using existing client ID:', clientId);
      } else {
        // Create new client
        console.log('➕ Creating new client...');
        const clientData = {
          owner_first_name: data.ownerFirstName,
          owner_last_name: data.ownerLastName,
          contact_email: data.contactEmail,
          contact_number: data.contactNumber,
          postcode: data.postcode,
          dog_name: data.dogName,
          submission_date: data.submissionDate,
          is_member: false,
          is_active: true,
        };

        console.log('📝 Client data to insert:', clientData);

        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert([clientData])
          .select()
          .single();

        if (clientError) {
          console.error('❌ Client creation error:', clientError);
          throw new Error(`Failed to create client: ${clientError.message}`);
        }

        clientId = newClient.id;
        console.log('✅ New client created with ID:', clientId);
      }

      // Create behavioural brief
      console.log('📝 Creating behavioural brief for client ID:', clientId);
      const briefData = {
        client_id: clientId,
        dog_name: data.dogName,
        dog_sex: data.dogSex,
        dog_breed: data.dogBreed,
        life_with_dog_and_help_needed: data.lifeWithDogAndHelpNeeded,
        best_outcome: data.bestOutcome,
        ideal_session_types: data.idealSessionTypes,
        submission_date: data.submissionDate,
      };

      console.log('📝 Brief data to insert:', briefData);

      const { data: newBrief, error: briefError } = await supabase
        .from('behavioural_briefs')
        .insert([briefData])
        .select()
        .single();

      if (briefError) {
        console.error('❌ Behavioural brief creation error:', briefError);
        throw new Error(`Failed to create behavioural brief: ${briefError.message}`);
      }

      console.log('✅ Behavioural brief created:', newBrief);

      // Update client with behavioural brief ID
      console.log('🔗 Linking behavioural brief to client...');
      const { error: updateError } = await supabase
        .from('clients')
        .update({ behavioural_brief_id: newBrief.id })
        .eq('id', clientId);

      if (updateError) {
        console.error('❌ Client update error:', updateError);
        throw new Error(`Failed to link behavioural brief to client: ${updateError.message}`);
      }

      console.log('✅ Behavioural brief linked to client successfully');
      return NextResponse.json({ success: true, clientId, briefId: newBrief.id });

    } else if (type === 'behaviour-questionnaire') {
      // First, check if client exists by email
      const { data: existingClients, error: clientSearchError } = await supabase
        .from('clients')
        .select('id')
        .eq('contact_email', data.contactEmail)
        .limit(1);

      if (clientSearchError) {
        throw new Error(`Failed to search for existing client: ${clientSearchError.message}`);
      }

      let clientId: string;

      if (existingClients && existingClients.length > 0) {
        // Client exists, use existing ID and update their address
        clientId = existingClients[0].id;

        // Format address for existing client
        const addressParts = [
          data.addressLine1,
          data.addressLine2 && data.addressLine2.trim() ? data.addressLine2 : null,
          data.city,
          data.country
        ].filter(Boolean); // Remove null/empty values

        const formattedAddress = addressParts.join(',\n');

        // Update existing client with new address information
        const { error: updateClientError } = await supabase
          .from('clients')
          .update({
            full_address: formattedAddress,
            postcode: data.postcode,
            contact_number: data.contactNumber
          })
          .eq('id', clientId);

        if (updateClientError) {
          console.error('❌ Failed to update existing client address:', updateClientError);
          // Don't throw error, just log it - questionnaire submission should still proceed
        }
      } else {
        // Create new client with formatted address
        const addressParts = [
          data.addressLine1,
          data.addressLine2 && data.addressLine2.trim() ? data.addressLine2 : null,
          data.city,
          data.country
        ].filter(Boolean); // Remove null/empty values

        const formattedAddress = addressParts.join(',\n');

        const clientData = {
          owner_first_name: data.ownerFirstName,
          owner_last_name: data.ownerLastName,
          contact_email: data.contactEmail,
          contact_number: data.contactNumber,
          postcode: data.postcode,
          dog_name: data.dogName,
          submission_date: data.submissionDate,
          is_member: false,
          is_active: true,
          full_address: formattedAddress,
          how_heard_about_services: data.howHeardAboutServices,
        };

        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert([clientData])
          .select()
          .single();

        if (clientError) {
          throw new Error(`Failed to create client: ${clientError.message}`);
        }

        clientId = newClient.id;
      }

      // Create behaviour questionnaire
      const questionnaireData = {
        client_id: clientId,
        dog_name: data.dogName,
        dog_age: data.dogAge,
        dog_sex: data.dogSex,
        dog_breed: data.dogBreed,
        neutered_spayed_details: data.neuteredSpayedDetails,
        main_problem: data.mainProblem,
        problem_tendency_first_noticed: data.problemTendencyFirstNoticed,
        problem_frequency_details: data.problemFrequencyDetails,
        problem_recent_changes: data.problemRecentChanges,
        problem_anticipation_details: data.problemAnticipationDetails,
        dog_motivation_for_problem: data.dogMotivationForProblem,
        problem_addressing_attempts: data.problemAddressingAttempts,
        ideal_training_outcome: data.idealTrainingOutcome,
        other_help_needed: data.otherHelpNeeded,
        medical_history: data.medicalHistory,
        vet_consultation_details: data.vetConsultationDetails,
        dog_origin: data.dogOrigin,
        rescue_background: data.rescueBackground,
        dog_age_when_acquired: data.dogAgeWhenAcquired,
        diet_details: data.dietDetails,
        food_motivation_level: data.foodMotivationLevel,
        mealtime_routine: data.mealtimeRoutine,
        treat_routine: data.treatRoutine,
        external_treats_consent: data.externalTreatsConsent,
        play_engagement: data.playEngagement,
        affection_response: data.affectionResponse,
        exercise_routine: data.exerciseRoutine,
        muzzle_usage: data.muzzleUsage,
        reaction_to_familiar_people: data.reactionToFamiliarPeople,
        reaction_to_unfamiliar_people: data.reactionToUnfamiliarPeople,
        housetrained_status: data.housetrainedStatus,
        activities_aside_from_walks: data.activitiesAsideFromWalks,
        dog_likes: data.dogLikes,
        dog_challenges: data.dogChallenges,
        positive_reinforcement_methods: data.positiveReinforcementMethods,
        favorite_rewards: data.favoriteRewards,
        correction_methods: data.correctionMethods,
        correction_effects: data.correctionEffects,
        previous_professional_training: data.previousProfessionalTraining,
        previous_training_methods_used: data.previousTrainingMethodsUsed,
        previous_training_experience_results: data.previousTrainingExperienceResults,
        sociability_with_dogs: data.sociabilityWithDogs,
        sociability_with_people: data.sociabilityWithPeople,
        additional_information: data.additionalInformation,
        time_dedicated_to_training: data.timeDedicatedToTraining,
        submission_date: data.submissionDate,
      };

      const { data: newQuestionnaire, error: questionnaireError } = await supabase
        .from('behaviour_questionnaires')
        .insert([questionnaireData])
        .select()
        .single();

      if (questionnaireError) {
        throw new Error(`Failed to create behaviour questionnaire: ${questionnaireError.message}`);
      }

      // Update client with behaviour questionnaire ID
      const { error: updateError } = await supabase
        .from('clients')
        .update({ behaviour_questionnaire_id: newQuestionnaire.id })
        .eq('id', clientId);

      if (updateError) {
        throw new Error(`Failed to link behaviour questionnaire to client: ${updateError.message}`);
      }

      return NextResponse.json({ success: true, clientId, questionnaireId: newQuestionnaire.id });

    } else {
      return NextResponse.json({ error: 'Invalid submission type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Public intake submission error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
