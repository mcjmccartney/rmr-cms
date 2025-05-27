
// Removed Firebase dependency - using standard Date/string types

// Primarily contact information and links to behavioural forms
export interface Client {
  id: string; // System managed

  // CONTACT INFORMATION
  ownerFirstName: string;
  ownerLastName: string;
  contactEmail: string;
  contactNumber: string;
  fullAddress?: string; // New simple address field
  address?: { // Structured address, populated by detailed forms
    addressLine1: string;
    addressLine2?: string;
    city: string;
    country: string;
  };
  postcode: string;
  howHeardAboutServices?: string;

  dogName?: string; // Primary dog's name for quick display
  isMember?: boolean; // Tracks membership status
  isActive?: boolean; // Tracks if the client is active

  // Link to the Behavioural Brief
  behaviouralBriefId?: string;
  behaviourQuestionnaireId?: string;

  // System Fields
  submissionDate: string;
  lastSession?: string;
  nextSession?: string;
  createdAt?: Date | string;
}

// Detailed dog and behavioural information from the "Behavioural Brief" form
export interface BehaviouralBrief {
  id: string;
  clientId: string;

  // DOG INFORMATION from the form
  dogName: string;
  dogSex: 'Male' | 'Female' | '';
  dogBreed: string;
  lifeWithDogAndHelpNeeded: string;
  bestOutcome: string;
  idealSessionTypes?: string[];

  // System Fields
  submissionDate: string;
  createdAt?: Date | string;
}

// Data from the new "Behaviour Questionnaire" form
export interface BehaviourQuestionnaire {
  id: string;
  clientId: string;

  // DOG INFORMATION (from questionnaire)
  dogName: string;
  dogAge: string;
  dogSex: 'Male' | 'Female' | '';
  dogBreed: string;
  neuteredSpayedDetails: string;
  mainProblem: string;
  problemTendencyFirstNoticed: string;
  problemFrequencyDetails: string;
  problemRecentChanges: string;
  problemAnticipationDetails: string;
  dogMotivationForProblem: string;
  problemAddressingAttempts: string;
  idealTrainingOutcome: string;
  otherHelpNeeded?: string;

  // HEALTH AND VETERINARY INFORMATION
  medicalHistory?: string;
  vetConsultationDetails?: string;

  // BACKGROUND INFORMATION
  dogOrigin?: string;
  rescueBackground?: string;
  dogAgeWhenAcquired?: string;

  // DIET AND FEEDING
  dietDetails?: string;
  foodMotivationLevel?: string;
  mealtimeRoutine?: string;
  treatRoutine?: string;
  externalTreatsConsent?: string;

  // ROUTINES
  playEngagement?: string;
  affectionResponse?: string;
  exerciseRoutine?: string;
  muzzleUsage?: string;
  reactionToFamiliarPeople?: string;
  reactionToUnfamiliarPeople?: string;
  housetrainedStatus?: string;
  activitiesAsideFromWalks?: string;

  // TEMPERAMENT
  dogLikes?: string;
  dogChallenges?: string;

  // TRAINING
  positiveReinforcementMethods?: string;
  favoriteRewards?: string;
  correctionMethods?: string;
  correctionEffects?: string;
  previousProfessionalTraining?: string;
  previousTrainingMethodsUsed?: string;
  previousTrainingExperienceResults?: string;

  // SOCIABILITY
  sociabilityWithDogs?: 'Sociable' | 'Nervous' | 'Reactive' | 'Disinterested' | '';
  sociabilityWithPeople?: 'Sociable' | 'Nervous' | 'Reactive' | 'Disinterested' | '';
  additionalInformation?: string;
  timeDedicatedToTraining?: string;

  // System Fields
  submissionDate: string;
  createdAt?: Date | string;
}


export interface Session {
  id: string;
  clientId: string;
  clientName: string; // Denormalized for easier display
  dogName?: string;    // Denormalized for easier display
  date: string; // Should be in 'yyyy-MM-dd' format
  time: string; // Should be in 'HH:MM' (24-hour) format
  sessionType: string;
  amount?: number;
  createdAt?: Date | string; // ISO string/Date for client-side
}

export interface FinancialTransaction {
  id:string;
  date: string;
  description: string;
  type: 'Income' | 'Expense';
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Pending';
  clientId?: string;
  clientName?: string;
  createdAt?: Date | string;
}

// This is the type for the address object specifically
export interface Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  country: string;
  // Postcode is part of client.postcode, but can be shown as part of a full address display
}
