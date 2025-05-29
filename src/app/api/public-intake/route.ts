import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration is missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { type, data } = await request.json();

    if (type === 'behavioural-brief') {
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
        // Client exists, use existing ID
        clientId = existingClients[0].id;
      } else {
        // Create new client
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

      // Create behavioural brief
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

      const { data: newBrief, error: briefError } = await supabase
        .from('behavioural_briefs')
        .insert([briefData])
        .select()
        .single();

      if (briefError) {
        throw new Error(`Failed to create behavioural brief: ${briefError.message}`);
      }

      // Update client with behavioural brief ID
      const { error: updateError } = await supabase
        .from('clients')
        .update({ behavioural_brief_id: newBrief.id })
        .eq('id', clientId);

      if (updateError) {
        throw new Error(`Failed to link behavioural brief to client: ${updateError.message}`);
      }

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
        // Client exists, use existing ID
        clientId = existingClients[0].id;
      } else {
        // Create new client
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
          address: {
            addressLine1: data.addressLine1,
            addressLine2: data.addressLine2,
            city: data.city,
            country: data.country,
          },
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
