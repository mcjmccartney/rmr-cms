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

// Convert database row to BehaviourQuestionnaire type
function dbRowToBehaviourQuestionnaire(row: any) {
  return {
    id: row.id,
    clientId: row.client_id,
    dogName: row.dog_name,
    dogAge: row.dog_age,
    dogSex: row.dog_sex,
    dogBreed: row.dog_breed,
    neuteredSpayedDetails: row.neutered_spayed_details,
    mainProblem: row.main_problem,
    problemTendencyFirstNoticed: row.problem_tendency_first_noticed,
    problemFrequencyDetails: row.problem_frequency_details,
    problemRecentChanges: row.problem_recent_changes,
    problemAnticipationDetails: row.problem_anticipation_details,
    dogMotivationForProblem: row.dog_motivation_for_problem,
    problemAddressingAttempts: row.problem_addressing_attempts,
    idealTrainingOutcome: row.ideal_training_outcome,
    otherHelpNeeded: row.other_help_needed,
    medicalHistory: row.medical_history,
    vetConsultationDetails: row.vet_consultation_details,
    dogOrigin: row.dog_origin,
    rescueBackground: row.rescue_background,
    dogAgeWhenAcquired: row.dog_age_when_acquired,
    dietDetails: row.diet_details,
    foodMotivationLevel: row.food_motivation_level,
    mealtimeRoutine: row.mealtime_routine,
    treatRoutine: row.treat_routine,
    externalTreatsConsent: row.external_treats_consent,
    playEngagement: row.play_engagement,
    affectionResponse: row.affection_response,
    exerciseRoutine: row.exercise_routine,
    muzzleUsage: row.muzzle_usage,
    reactionToFamiliarPeople: row.reaction_to_familiar_people,
    reactionToUnfamiliarPeople: row.reaction_to_unfamiliar_people,
    housetrainedStatus: row.housetrained_status,
    activitiesAsideFromWalks: row.activities_aside_from_walks,
    dogLikes: row.dog_likes,
    dogChallenges: row.dog_challenges,
    positiveReinforcementMethods: row.positive_reinforcement_methods,
    favoriteRewards: row.favorite_rewards,
    correctionMethods: row.correction_methods,
    correctionEffects: row.correction_effects,
    previousProfessionalTraining: row.previous_professional_training,
    previousTrainingMethodsUsed: row.previous_training_methods_used,
    previousTrainingExperienceResults: row.previous_training_experience_results,
    sociabilityWithDogs: row.sociability_with_dogs,
    sociabilityWithPeople: row.sociability_with_people,
    additionalInformation: row.additional_information,
    timeDedicatedToTraining: row.time_dedicated_to_training,
    submissionDate: row.submission_date,
    createdAt: row.created_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const id = searchParams.get('id');

    let query = supabase
      .from('behaviour_questionnaires')
      .select('*')
      .order('created_at', { ascending: false });

    if (id) {
      query = query.eq('id', id);
    } else if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching behaviour questionnaires:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const questionnaires = data?.map(dbRowToBehaviourQuestionnaire) || [];
    return NextResponse.json({ data: questionnaires });

  } catch (error) {
    console.error('Behaviour questionnaires API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
