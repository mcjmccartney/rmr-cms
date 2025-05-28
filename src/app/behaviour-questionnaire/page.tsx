
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
// Removed useSearchParams as it's no longer needed for clientId from URL

const addressSchema = z.object({
  addressLine1: z.string().min(1, "Address Line 1 is required."),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City / Town is required."),
  country: z.string().min(1, "Country is required."),
  postcode: z.string().min(1, "Postcode is required."),
});

const behaviourQuestionnaireSchema = z.object({
  ownerFirstName: z.string().min(1, { message: "First Name is required." }),
  ownerLastName: z.string().min(1, { message: "Last Name is required." }),
  contactEmail: z.string().email({ message: "Please enter a valid email address." }),
  contactNumber: z.string().min(1, { message: "Contact Number is required." }),
  addressLine1: z.string().min(1, "Address Line 1 is required."),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City / Town is required."),
  country: z.string().min(1, "Country is required."),
  postcode: z.string().min(1, "Postcode is required."),
  howHeardAboutServices: z.string().optional(),

  dogName: z.string().min(1, { message: "Dog Name is required." }),
  dogAge: z.string().min(1, { message: "Age is required." }),
  dogSex: z.enum(['Male', 'Female', ''], { required_error: "Sex is required." }).refine(val => val !== '', { message: "Sex is required."}),
  dogBreed: z.string().min(1, { message: "Dog breed is required." }),
  neuteredSpayedDetails: z.string().min(1, { message: "Neutered/Spayed status and age is required." }),
  mainProblem: z.string().min(1, { message: "This field is required." }),
  problemTendencyFirstNoticed: z.string().min(1, { message: "This field is required." }),
  problemFrequencyDetails: z.string().min(1, { message: "This field is required." }),
  problemRecentChanges: z.string().min(1, { message: "This field is required." }),
  problemAnticipationDetails: z.string().min(1, { message: "This field is required." }),
  dogMotivationForProblem: z.string().min(1, { message: "This field is required." }),
  problemAddressingAttempts: z.string().min(1, { message: "This field is required." }),
  idealTrainingOutcome: z.string().min(1, { message: "This field is required." }),
  otherHelpNeeded: z.string().optional(),

  medicalHistory: z.string().optional(),
  vetConsultationDetails: z.string().optional(),

  dogOrigin: z.string().optional(),
  rescueBackground: z.string().optional(),
  dogAgeWhenAcquired: z.string().optional(),

  dietDetails: z.string().optional(),
  foodMotivationLevel: z.string().optional(),
  mealtimeRoutine: z.string().optional(),
  treatRoutine: z.string().optional(),
  externalTreatsConsent: z.string().optional(),

  playEngagement: z.string().optional(),
  affectionResponse: z.string().optional(),
  exerciseRoutine: z.string().optional(),
  muzzleUsage: z.string().optional(),
  reactionToFamiliarPeople: z.string().optional(),
  reactionToUnfamiliarPeople: z.string().optional(),
  housetrainedStatus: z.string().optional(),
  activitiesAsideFromWalks: z.string().optional(),

  dogLikes: z.string().optional(),
  dogChallenges: z.string().min(1, { message: "This field is required." }),

  positiveReinforcementMethods: z.string().min(1, { message: "This field is required." }),
  favoriteRewards: z.string().min(1, { message: "This field is required." }),
  correctionMethods: z.string().min(1, { message: "This field is required." }),
  correctionEffects: z.string().min(1, { message: "This field is required." }),
  previousProfessionalTraining: z.string().min(1, { message: "This field is required." }),
  previousTrainingMethodsUsed: z.string().min(1, { message: "This field is required." }),
  previousTrainingExperienceResults: z.string().min(1, { message: "This field is required." }),

  sociabilityWithDogs: z.enum(['Sociable', 'Nervous', 'Reactive', 'Disinterested', ''], {invalid_type_error: "Select a valid option for dog sociability."}).optional(),
  sociabilityWithPeople: z.enum(['Sociable', 'Nervous', 'Reactive', 'Disinterested', ''], {invalid_type_error: "Select a valid option for people sociability."}).optional(),
  additionalInformation: z.string().optional(),
  timeDedicatedToTraining: z.string().optional(),

  submissionDate: z.string().min(1, {message: "Submission date is required."}),
});

const countryOptions = [
    { value: "GB", label: "United Kingdom" },
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
    { value: "AU", label: "Australia" },
    { value: "IE", label: "Ireland" },
    { value: "Other", label: "Other" },
];

const foodMotivationOptions = Array.from({length: 10}, (_, i) => ({ value: (i+1).toString(), label: (i+1).toString() }));
const sociabilityOptions = ["Sociable", "Nervous", "Reactive", "Disinterested"];

export default function BehaviourQuestionnairePage() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentSubmissionDate, setCurrentSubmissionDate] = useState('');

  // Removed searchParams and existingClientId as linking is now email-based

  useEffect(() => {
    setCurrentSubmissionDate(format(new Date(), "yyyy-MM-dd HH:mm:ss"));
  }, []);

  const memoizedDefaultValues = useMemo<BehaviourQuestionnaireFormValues>(() => ({
    ownerFirstName: '',
    ownerLastName: '',
    contactEmail: '',
    contactNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    country: 'GB',
    postcode: '',
    howHeardAboutServices: '',
    dogName: '',
    dogAge: '',
    dogSex: '',
    dogBreed: '',
    neuteredSpayedDetails: '',
    mainProblem: '',
    problemTendencyFirstNoticed: '',
    problemFrequencyDetails: '',
    problemRecentChanges: '',
    problemAnticipationDetails: '',
    dogMotivationForProblem: '',
    problemAddressingAttempts: '',
    idealTrainingOutcome: '',
    otherHelpNeeded: '',
    medicalHistory: '',
    vetConsultationDetails: '',
    dogOrigin: '',
    rescueBackground: '',
    dogAgeWhenAcquired: '',
    dietDetails: '',
    foodMotivationLevel: '',
    mealtimeRoutine: '',
    treatRoutine: '',
    externalTreatsConsent: '',
    playEngagement: '',
    affectionResponse: '',
    exerciseRoutine: '',
    muzzleUsage: '',
    reactionToFamiliarPeople: '',
    reactionToUnfamiliarPeople: '',
    housetrainedStatus: '',
    activitiesAsideFromWalks: '',
    dogLikes: '',
    dogChallenges: '',
    positiveReinforcementMethods: '',
    favoriteRewards: '',
    correctionMethods: '',
    correctionEffects: '',
    previousProfessionalTraining: '',
    previousTrainingMethodsUsed: '',
    previousTrainingExperienceResults: '',
    sociabilityWithDogs: '',
    sociabilityWithPeople: '',
    additionalInformation: '',
    timeDedicatedToTraining: '',
    submissionDate: '',
  }), []);

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<BehaviourQuestionnaireFormValues>({
    resolver: zodResolver(behaviourQuestionnaireSchema),
    defaultValues: memoizedDefaultValues
  });

  useEffect(() => {
    if (currentSubmissionDate) {
      setValue("submissionDate", currentSubmissionDate, { shouldValidate: false, shouldDirty: false });
    }
  }, [currentSubmissionDate, setValue]);

  const handleFormSubmit: SubmitHandler<BehaviourQuestionnaireFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const submissionTimestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const submissionData: BehaviourQuestionnaireFormValues = {
        ...data,
        submissionDate: submissionTimestamp,
      };

      await addClientAndBehaviourQuestionnaireToFirestore(submissionData);

      const newDateForNextForm = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      setCurrentSubmissionDate(newDateForNextForm);
      reset({ ...memoizedDefaultValues, submissionDate: newDateForNextForm });
    } catch (err) {
      console.error("Error submitting behaviour questionnaire:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const SectionTitle: React.FC<{ title: string, description?: string }> = ({ title, description }) => (
    <>
      <div className="pt-4 pb-2">
        <h2 className="text-lg font-semibold uppercase text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <Separator className="mb-4 bg-black" />
    </>
  );

  const FormFieldWrapper: React.FC<{
    label?: string;
    htmlForProp?: keyof BehaviourQuestionnaireFormValues | string;
    error?: string | boolean;
    children: React.ReactNode;
    required?: boolean;
    description?: string;
    className?: string;
  }> = ({ label, htmlForProp, error, children, required, description, className }) => (
    <div className={cn("space-y-1.5 mb-5", className)}>
      {label && (
        <Label htmlFor={htmlForProp as string | undefined} className="font-medium text-foreground text-sm">
          {label}
          {required && <span className="text-xs text-muted-foreground ml-1">(required)</span>}
        </Label>
      )}
      {description && <p className="text-xs text-muted-foreground -mt-1 mb-1.5">{description}</p>}
      {children}
      {typeof error === 'string' && error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );

  const inputClassName = "border-black bg-[#ebeadf] focus-visible:ring-black";
  const errorInputClassName = "border-destructive";

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="flex justify-center items-center gap-4 mb-10">
        <Image
          src="https://iili.io/34300ox.md.jpg"
          alt="RMR Logo"
          width={60}
          height={60}
          className="rounded-sm"
          data-ai-hint="company logo"
        />
        <Image
          src="https://iili.io/3PLgIHu.png"
          alt="Behaviour Questionnaire Title"
          width={630}
          height={70}
          data-ai-hint="form title"
        />
      </div>
      <Card className="w-full max-w-3xl shadow-2xl bg-[#ebeadf]">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-0">

            <SectionTitle title="OWNER INFORMATION" />
            <FormFieldWrapper label="Owner Name" htmlForProp="ownerFirstName" error={errors.ownerFirstName?.message || errors.ownerLastName?.message} required>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ownerFirstName" className="text-xs text-muted-foreground">First Name</Label>
                  <Input id="ownerFirstName" {...register("ownerFirstName")} className={cn(inputClassName, errors.ownerFirstName && errorInputClassName)} disabled={isSubmitting} />
                  {errors.ownerFirstName && <p className="text-xs text-destructive mt-1">{errors.ownerFirstName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="ownerLastName" className="text-xs text-muted-foreground">Last Name</Label>
                  <Input id="ownerLastName" {...register("ownerLastName")} className={cn(inputClassName, errors.ownerLastName && errorInputClassName)} disabled={isSubmitting} />
                  {errors.ownerLastName && <p className="text-xs text-destructive mt-1">{errors.ownerLastName.message}</p>}
                </div>
              </div>
            </FormFieldWrapper>
            <FormFieldWrapper label="Email" htmlForProp="contactEmail" error={errors.contactEmail?.message} required>
              <Input id="contactEmail" type="email" {...register("contactEmail")} className={cn(inputClassName, errors.contactEmail && errorInputClassName)} disabled={isSubmitting} />
            </FormFieldWrapper>
            <FormFieldWrapper label="Contact Number" htmlForProp="contactNumber" error={errors.contactNumber?.message} required>
              <Input id="contactNumber" type="tel" {...register("contactNumber")} className={cn(inputClassName, errors.contactNumber && errorInputClassName)} disabled={isSubmitting}/>
            </FormFieldWrapper>

            <FormFieldWrapper label="Address" htmlForProp="addressLine1" error={errors.addressLine1?.message || errors.city?.message || errors.postcode?.message || errors.country?.message} required>
                <div>
                    <Label htmlFor="addressLine1" className="text-xs text-muted-foreground">Address Line 1</Label>
                    <Input id="addressLine1" {...register("addressLine1")} className={cn(inputClassName, errors.addressLine1 && errorInputClassName)} disabled={isSubmitting}/>
                    {errors.addressLine1 && <p className="text-xs text-destructive mt-1">{errors.addressLine1.message}</p>}
                </div>
                <div className="mt-2">
                    <Label htmlFor="addressLine2" className="text-xs text-muted-foreground">Address Line 2 (Optional)</Label>
                    <Input id="addressLine2" {...register("addressLine2")} className={cn(inputClassName, errors.addressLine2 && errorInputClassName)} disabled={isSubmitting}/>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                        <Label htmlFor="city" className="text-xs text-muted-foreground">City / Town</Label>
                        <Input id="city" {...register("city")} className={cn(inputClassName, errors.city && errorInputClassName)} disabled={isSubmitting}/>
                        {errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="postcode" className="text-xs text-muted-foreground">Postcode</Label>
                        <Input id="postcode" {...register("postcode")} className={cn(inputClassName, errors.postcode && errorInputClassName)} disabled={isSubmitting}/>
                        {errors.postcode && <p className="text-xs text-destructive mt-1">{errors.postcode.message}</p>}
                    </div>
                </div>
                 <div className="mt-2">
                    <Label htmlFor="country" className="text-xs text-muted-foreground">Country</Label>
                     <Controller
                        name="country"
                        control={control}
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <SelectTrigger className={cn(inputClassName, errors.country && errorInputClassName)}>
                            <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#ebeadf]">
                            {countryOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        )}
                    />
                    {errors.country && <p className="text-xs text-destructive mt-1">{errors.country.message}</p>}
                </div>
            </FormFieldWrapper>

            <FormFieldWrapper label="How did you hear about my services?" htmlForProp="howHeardAboutServices" error={errors.howHeardAboutServices?.message}>
              <Textarea id="howHeardAboutServices" {...register("howHeardAboutServices")} className={cn(inputClassName, errors.howHeardAboutServices && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>


            <SectionTitle title="DOG INFORMATION" description="If you are inquiring about more than one dog please complete an additional form."/>
            <FormFieldWrapper label="Dog Name" htmlForProp="dogName" error={errors.dogName?.message} required>
              <Input id="dogName" {...register("dogName")} className={cn(inputClassName, errors.dogName && errorInputClassName)} disabled={isSubmitting} />
            </FormFieldWrapper>
            <FormFieldWrapper label="Age" htmlForProp="dogAge" error={errors.dogAge?.message} required>
              <Input id="dogAge" {...register("dogAge")} className={cn(inputClassName, errors.dogAge && errorInputClassName)} disabled={isSubmitting} />
            </FormFieldWrapper>
            <FormFieldWrapper label="Sex" htmlForProp="dogSex" error={errors.dogSex?.message} required>
              <Controller
                name="dogSex"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <SelectTrigger className={cn(inputClassName, errors.dogSex && errorInputClassName)}><SelectValue placeholder="Please Select" /></SelectTrigger>
                    <SelectContent className="bg-[#ebeadf]"><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                  </Select>
                )}
              />
            </FormFieldWrapper>
            <FormFieldWrapper label="What breed is your dog?" htmlForProp="dogBreed" error={errors.dogBreed?.message} required>
              <Input id="dogBreed" {...register("dogBreed")} className={cn(inputClassName, errors.dogBreed && errorInputClassName)} disabled={isSubmitting} />
            </FormFieldWrapper>
            <FormFieldWrapper label="Neutered/Spayed? At what age?" htmlForProp="neuteredSpayedDetails" error={errors.neuteredSpayedDetails?.message} required>
              <Input id="neuteredSpayedDetails" {...register("neuteredSpayedDetails")} className={cn(inputClassName, errors.neuteredSpayedDetails && errorInputClassName)} disabled={isSubmitting} />
            </FormFieldWrapper>
             <FormFieldWrapper label="What is the main thing you would like help with?" htmlForProp="mainProblem" error={errors.mainProblem?.message} required>
              <Textarea id="mainProblem" {...register("mainProblem")} className={cn(inputClassName, errors.mainProblem && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="When did you first notice tendencies of this behaviour?" htmlForProp="problemTendencyFirstNoticed" error={errors.problemTendencyFirstNoticed?.message} required>
              <Textarea id="problemTendencyFirstNoticed" {...register("problemTendencyFirstNoticed")} className={cn(inputClassName, errors.problemTendencyFirstNoticed && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="When, where and how often does it happen? Be specific" htmlForProp="problemFrequencyDetails" error={errors.problemFrequencyDetails?.message} required>
              <Textarea id="problemFrequencyDetails" {...register("problemFrequencyDetails")} className={cn(inputClassName, errors.problemFrequencyDetails && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="Has there been a recent change in the behaviour?" description="More frequent? More intense? Different circumstances?" htmlForProp="problemRecentChanges" error={errors.problemRecentChanges?.message} required>
              <Textarea id="problemRecentChanges" {...register("problemRecentChanges")} className={cn(inputClassName, errors.problemRecentChanges && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="Can you anticipate when it is likely to happen?" description="Location, who is present, trigger, etc." htmlForProp="problemAnticipationDetails" error={errors.problemAnticipationDetails?.message} required>
              <Textarea id="problemAnticipationDetails" {...register("problemAnticipationDetails")} className={cn(inputClassName, errors.problemAnticipationDetails && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="Why do you think your dog is doing this?" htmlForProp="dogMotivationForProblem" error={errors.dogMotivationForProblem?.message} required>
              <Textarea id="dogMotivationForProblem" {...register("dogMotivationForProblem")} className={cn(inputClassName, errors.dogMotivationForProblem && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="What have you done so far to address this problem? With what effect?" htmlForProp="problemAddressingAttempts" error={errors.problemAddressingAttempts?.message} required>
              <Textarea id="problemAddressingAttempts" {...register("problemAddressingAttempts")} className={cn(inputClassName, errors.problemAddressingAttempts && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="What would you consider your ideal goal/outcome of a training program?" htmlForProp="idealTrainingOutcome" error={errors.idealTrainingOutcome?.message} required>
              <Textarea id="idealTrainingOutcome" {...register("idealTrainingOutcome")} className={cn(inputClassName, errors.idealTrainingOutcome && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="Is there anything else you would like help with if possible?" htmlForProp="otherHelpNeeded" error={errors.otherHelpNeeded?.message}>
              <Textarea id="otherHelpNeeded" {...register("otherHelpNeeded")} className={cn(inputClassName, errors.otherHelpNeeded && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>

            <SectionTitle title="HEALTH AND VETERINARY INFORMATION" />
            <FormFieldWrapper label="Does your dog have any past relevant medical or health conditions or important medical history? If yes, please describe." description="Allergies, medication, injury etc." htmlForProp="medicalHistory" error={errors.medicalHistory?.message}>
                <Textarea id="medicalHistory" {...register("medicalHistory")} className={cn(inputClassName, errors.medicalHistory && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="Have you specifically asked your Veterinarian about any of your dog’s training and behaviour concerns? If yes, what was their advice?" htmlForProp="vetConsultationDetails" error={errors.vetConsultationDetails?.message}>
                <Textarea id="vetConsultationDetails" {...register("vetConsultationDetails")} className={cn(inputClassName, errors.vetConsultationDetails && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>

            <SectionTitle title="BACKGROUND INFORMATION" />
            <FormFieldWrapper label="Where did you get your dog from?" description="E.g. breeder, rescue centre, ex-street dog" htmlForProp="dogOrigin" error={errors.dogOrigin?.message}>
                <Textarea id="dogOrigin" {...register("dogOrigin")} className={cn(inputClassName, errors.dogOrigin && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="If your dog was a rescue, what do you know about their background?" htmlForProp="rescueBackground" error={errors.rescueBackground?.message}>
                <Textarea id="rescueBackground" {...register("rescueBackground")} className={cn(inputClassName, errors.rescueBackground && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="How old was your dog when you got him/her?" htmlForProp="dogAgeWhenAcquired" error={errors.dogAgeWhenAcquired?.message}>
                <Input id="dogAgeWhenAcquired" {...register("dogAgeWhenAcquired")} className={cn(inputClassName, errors.dogAgeWhenAcquired && errorInputClassName)} disabled={isSubmitting}/>
            </FormFieldWrapper>

            <SectionTitle title="DIET AND FEEDING" />
            <FormFieldWrapper label="What do you feed your dog? Please be specific" description="Brand, variety, canned, dried, raw, home cooked, etc." htmlForProp="dietDetails" error={errors.dietDetails?.message}>
                <Textarea id="dietDetails" {...register("dietDetails")} className={cn(inputClassName, errors.dietDetails && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="How food motivated is your dog?" description="1 - 10 (10 being highly food motivated)" htmlForProp="foodMotivationLevel" error={errors.foodMotivationLevel?.message}>
                <Controller
                    name="foodMotivationLevel"
                    control={control}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}>
                        <SelectTrigger className={cn(inputClassName, errors.foodMotivationLevel && errorInputClassName)}><SelectValue placeholder="Select an option" /></SelectTrigger>
                        <SelectContent className="bg-[#ebeadf]">
                        {foodMotivationOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    )}
                />
            </FormFieldWrapper>
            <FormFieldWrapper label="Please describe your dog’s mealtime." description="Where, when, how often, who feeds, special routine, etc." htmlForProp="mealtimeRoutine" error={errors.mealtimeRoutine?.message}>
                <Textarea id="mealtimeRoutine" {...register("mealtimeRoutine")} className={cn(inputClassName, errors.mealtimeRoutine && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="Please describe any treat routine your dog has." description="Who, what kind of treat, etc." htmlForProp="treatRoutine" error={errors.treatRoutine?.message}>
                <Textarea id="treatRoutine" {...register("treatRoutine")} className={cn(inputClassName, errors.treatRoutine && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="If applicable, are you happy for me to give your dog treats I bring along? If no, please have some to hand that you are happy for me to use." htmlForProp="externalTreatsConsent" error={errors.externalTreatsConsent?.message}>
                <Textarea id="externalTreatsConsent" {...register("externalTreatsConsent")} className={cn(inputClassName, errors.externalTreatsConsent && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>

            <SectionTitle title="ROUTINES" />
            <FormFieldWrapper label="What types of play do you engage in with your dog? Do they enjoy it?" htmlForProp="playEngagement" error={errors.playEngagement?.message}>
                <Textarea id="playEngagement" {...register("playEngagement")} className={cn(inputClassName, errors.playEngagement && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
             <FormFieldWrapper label="Are you affectionate with your dog? Do they enjoy it?" htmlForProp="affectionResponse" error={errors.affectionResponse?.message}>
                <Textarea id="affectionResponse" {...register("affectionResponse")} className={cn(inputClassName, errors.affectionResponse && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
             <FormFieldWrapper label="What types of exercise does your dog regularly get?" htmlForProp="exerciseRoutine" error={errors.exerciseRoutine?.message}>
                <Textarea id="exerciseRoutine" {...register("exerciseRoutine")} className={cn(inputClassName, errors.exerciseRoutine && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
             <FormFieldWrapper label="Does your dog use a muzzle for any reason?" htmlForProp="muzzleUsage" error={errors.muzzleUsage?.message}>
                <Textarea id="muzzleUsage" {...register("muzzleUsage")} className={cn(inputClassName, errors.muzzleUsage && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
             <FormFieldWrapper label="How does your dog react when familiar people come to your home? Please describe." description="Bark, jump, mouth, calm, etc." htmlForProp="reactionToFamiliarPeople" error={errors.reactionToFamiliarPeople?.message}>
                <Textarea id="reactionToFamiliarPeople" {...register("reactionToFamiliarPeople")} className={cn(inputClassName, errors.reactionToFamiliarPeople && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
             <FormFieldWrapper label="How does your dog react when unfamiliar people come to your home? Please describe." description="Bark, jump, mouth, calm, etc." htmlForProp="reactionToUnfamiliarPeople" error={errors.reactionToUnfamiliarPeople?.message}>
                <Textarea id="reactionToUnfamiliarPeople" {...register("reactionToUnfamiliarPeople")} className={cn(inputClassName, errors.reactionToUnfamiliarPeople && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
             <FormFieldWrapper label="Is your dog fully housetrained?" htmlForProp="housetrainedStatus" error={errors.housetrainedStatus?.message}>
                <Textarea id="housetrainedStatus" {...register("housetrainedStatus")} className={cn(inputClassName, errors.housetrainedStatus && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
             <FormFieldWrapper label="What does your dog like to do aside from walks?" description="Enrichment, games, jobs, etc." htmlForProp="activitiesAsideFromWalks" error={errors.activitiesAsideFromWalks?.message}>
                <Textarea id="activitiesAsideFromWalks" {...register("activitiesAsideFromWalks")} className={cn(inputClassName, errors.activitiesAsideFromWalks && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>

            <SectionTitle title="TEMPERAMENT" />
             <FormFieldWrapper label="What do you like about your dog?" htmlForProp="dogLikes" error={errors.dogLikes?.message}>
                <Textarea id="dogLikes" {...register("dogLikes")} className={cn(inputClassName, errors.dogLikes && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
             <FormFieldWrapper label="What do you find most challenging about your dog?" htmlForProp="dogChallenges" error={errors.dogChallenges?.message} required>
                <Textarea id="dogChallenges" {...register("dogChallenges")} className={cn(inputClassName, errors.dogChallenges && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>

            <SectionTitle title="TRAINING" />
            <FormFieldWrapper label="How do you let your dog know when they have done something &quot;good&quot;?" htmlForProp="positiveReinforcementMethods" error={errors.positiveReinforcementMethods?.message} required>
                <Textarea id="positiveReinforcementMethods" {...register("positiveReinforcementMethods")} className={cn(inputClassName, errors.positiveReinforcementMethods && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="What are your dog’s favourite rewards?" htmlForProp="favoriteRewards" error={errors.favoriteRewards?.message} required>
                <Textarea id="favoriteRewards" {...register("favoriteRewards")} className={cn(inputClassName, errors.favoriteRewards && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="Do you let your dog know when they have done something “bad”? How?" htmlForProp="correctionMethods" error={errors.correctionMethods?.message} required>
                <Textarea id="correctionMethods" {...register("correctionMethods")} className={cn(inputClassName, errors.correctionMethods && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="What effect does your method of telling them they've done something bad have?" description="ie: no change, stopped behaviour, got worse, only worked with certain person, etc." htmlForProp="correctionEffects" error={errors.correctionEffects?.message} required>
                <Textarea id="correctionEffects" {...register("correctionEffects")} className={cn(inputClassName, errors.correctionEffects && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="Has your dog participated in any professional training before? If yes, please describe." htmlForProp="previousProfessionalTraining" error={errors.previousProfessionalTraining?.message} required>
                <Textarea id="previousProfessionalTraining" {...register("previousProfessionalTraining")} className={cn(inputClassName, errors.previousProfessionalTraining && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="What type of methods were used?" htmlForProp="previousTrainingMethodsUsed" error={errors.previousTrainingMethodsUsed?.message} required>
                <Textarea id="previousTrainingMethodsUsed" {...register("previousTrainingMethodsUsed")} className={cn(inputClassName, errors.previousTrainingMethodsUsed && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="How was your experience and the results?" htmlForProp="previousTrainingExperienceResults" error={errors.previousTrainingExperienceResults?.message} required>
                <Textarea id="previousTrainingExperienceResults" {...register("previousTrainingExperienceResults")} className={cn(inputClassName, errors.previousTrainingExperienceResults && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>

            <SectionTitle title="SOCIABILITY" />
            <FormFieldWrapper label="How would you describe your dog’s sociability with other dogs in general?" description="Interactions with Dogs" htmlForProp="sociabilityWithDogs" error={!!errors.sociabilityWithDogs}>
                 <Controller
                    name="sociabilityWithDogs"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup onValueChange={field.onChange} value={field.value || ''} className="flex flex-col space-y-1">
                        {sociabilityOptions.map(opt => (
                            <div key={`dog-${opt}`} className="flex items-center space-x-2">
                                <RadioGroupItem value={opt} id={`dog-${opt}`} className={cn(inputClassName, errors.sociabilityWithDogs && errorInputClassName)} />
                                <Label htmlFor={`dog-${opt}`} className="font-normal">{opt}</Label>
                            </div>
                        ))}
                        </RadioGroup>
                    )}
                />
                {errors.sociabilityWithDogs && <p className="text-xs text-destructive mt-1">{errors.sociabilityWithDogs.message}</p>}
            </FormFieldWrapper>
            <FormFieldWrapper label="How would you describe your dog’s sociability with other people in general?" description="Interactions with People" htmlForProp="sociabilityWithPeople" error={!!errors.sociabilityWithPeople}>
                 <Controller
                    name="sociabilityWithPeople"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup onValueChange={field.onChange} value={field.value || ''} className="flex flex-col space-y-1">
                        {sociabilityOptions.map(opt => (
                            <div key={`people-${opt}`} className="flex items-center space-x-2">
                                <RadioGroupItem value={opt} id={`people-${opt}`} className={cn(inputClassName, errors.sociabilityWithPeople && errorInputClassName)} />
                                <Label htmlFor={`people-${opt}`} className="font-normal">{opt}</Label>
                            </div>
                        ))}
                        </RadioGroup>
                    )}
                />
                 {errors.sociabilityWithPeople && <p className="text-xs text-destructive mt-1">{errors.sociabilityWithPeople.message}</p>}
            </FormFieldWrapper>
            <FormFieldWrapper label="Is there anything else that you would like me to know about your situation or your dog?" htmlForProp="additionalInformation" error={errors.additionalInformation?.message}>
                <Textarea id="additionalInformation" {...register("additionalInformation")} className={cn(inputClassName, errors.additionalInformation && errorInputClassName)} disabled={isSubmitting} rows={3}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="How much time per week total are you able to dedicate to training?" htmlForProp="timeDedicatedToTraining" error={errors.timeDedicatedToTraining?.message}>
                <Input id="timeDedicatedToTraining" {...register("timeDedicatedToTraining")} className={cn(inputClassName, errors.timeDedicatedToTraining && errorInputClassName)} disabled={isSubmitting}/>
            </FormFieldWrapper>

            <input type="hidden" {...register("submissionDate")} />

            <div className="pt-6 flex justify-center">
              <Button
                type="submit"
                size="lg"
                className="bg-[#4f6749] text-[#ebeadf] hover:bg-[#4f6749]/90"
                disabled={isSubmitting}
                tooltip="Submit Questionnaire"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



