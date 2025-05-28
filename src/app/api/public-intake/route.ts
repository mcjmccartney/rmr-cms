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
        .eq('contactEmail', data.contactEmail)
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
          ownerFirstName: data.ownerFirstName,
          ownerLastName: data.ownerLastName,
          contactEmail: data.contactEmail,
          contactNumber: data.contactNumber,
          postcode: data.postcode,
          dogName: data.dogName,
          submissionDate: data.submissionDate,
          isMember: false,
          isActive: true,
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
        clientId,
        dogName: data.dogName,
        dogSex: data.dogSex,
        dogBreed: data.dogBreed,
        lifeWithDogAndHelpNeeded: data.lifeWithDogAndHelpNeeded,
        bestOutcome: data.bestOutcome,
        idealSessionTypes: data.idealSessionTypes,
        submissionDate: data.submissionDate,
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
        .update({ behaviouralBriefId: newBrief.id })
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
        .eq('contactEmail', data.contactEmail)
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
          ownerFirstName: data.ownerFirstName,
          ownerLastName: data.ownerLastName,
          contactEmail: data.contactEmail,
          contactNumber: data.contactNumber,
          postcode: data.postcode,
          dogName: data.dogName,
          submissionDate: data.submissionDate,
          isMember: false,
          isActive: true,
          address: {
            addressLine1: data.addressLine1,
            addressLine2: data.addressLine2,
            city: data.city,
            country: data.country,
          },
          howHeardAboutServices: data.howHeardAboutServices,
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
        clientId,
        dogName: data.dogName,
        dogAge: data.dogAge,
        dogSex: data.dogSex,
        dogBreed: data.dogBreed,
        neuteredSpayedDetails: data.neuteredSpayedDetails,
        mainProblem: data.mainProblem,
        problemTendencyFirstNoticed: data.problemTendencyFirstNoticed,
        problemFrequencyDetails: data.problemFrequencyDetails,
        problemRecentChanges: data.problemRecentChanges,
        problemAnticipationDetails: data.problemAnticipationDetails,
        dogMotivationForProblem: data.dogMotivationForProblem,
        problemAddressingAttempts: data.problemAddressingAttempts,
        idealTrainingOutcome: data.idealTrainingOutcome,
        otherHelpNeeded: data.otherHelpNeeded,
        medicalHistory: data.medicalHistory,
        vetConsultationDetails: data.vetConsultationDetails,
        dogOrigin: data.dogOrigin,
        rescueBackground: data.rescueBackground,
        dogAgeWhenAcquired: data.dogAgeWhenAcquired,
        dietDetails: data.dietDetails,
        foodMotivationLevel: data.foodMotivationLevel,
        mealtimeRoutine: data.mealtimeRoutine,
        treatRoutine: data.treatRoutine,
        externalTreatsConsent: data.externalTreatsConsent,
        playEngagement: data.playEngagement,
        affectionResponse: data.affectionResponse,
        exerciseRoutine: data.exerciseRoutine,
        muzzleUsage: data.muzzleUsage,
        reactionToFamiliarPeople: data.reactionToFamiliarPeople,
        reactionToUnfamiliarPeople: data.reactionToUnfamiliarPeople,
        housetrainedStatus: data.housetrainedStatus,
        activitiesAsideFromWalks: data.activitiesAsideFromWalks,
        dogLikes: data.dogLikes,
        dogChallenges: data.dogChallenges,
        positiveReinforcementMethods: data.positiveReinforcementMethods,
        favoriteRewards: data.favoriteRewards,
        correctionMethods: data.correctionMethods,
        correctionEffects: data.correctionEffects,
        previousProfessionalTraining: data.previousProfessionalTraining,
        previousTrainingMethodsUsed: data.previousTrainingMethodsUsed,
        previousTrainingExperienceResults: data.previousTrainingExperienceResults,
        sociabilityWithDogs: data.sociabilityWithDogs,
        sociabilityWithPeople: data.sociabilityWithPeople,
        additionalInformation: data.additionalInformation,
        timeDedicatedToTraining: data.timeDedicatedToTraining,
        submissionDate: data.submissionDate,
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
        .update({ behaviourQuestionnaireId: newQuestionnaire.id })
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
