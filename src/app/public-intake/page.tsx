
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; // Removed CardHeader, CardDescription
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { addClientAndBriefToFirestore, type BehaviouralBriefFormValues } from '@/lib/dataService';
import { Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


// Schema based on the Squarespace form structure from the provided HTML
const behaviouralBriefSchema = z.object({
  ownerFirstName: z.string().min(1, { message: "First Name is required." }),
  ownerLastName: z.string().min(1, { message: "Last Name is required." }),
  contactEmail: z.string().email({ message: "Please enter a valid email address." }),
  contactNumber: z.string().min(1, { message: "Contact Number is required." }),
  postcode: z.string().min(1, { message: "Postcode is required." }),

  dogName: z.string().min(1, { message: "Dog Name is required." }),
  dogSex: z.enum(['Male', 'Female'], { required_error: "Sex is required." }),
  dogBreed: z.string().min(1, { message: "Dog breed is required." }),
  lifeWithDogAndHelpNeeded: z.string().min(1, { message: "This field is required." }),
  bestOutcome: z.string().min(1, { message: "This field is required." }),
  idealSessionTypes: z.array(z.string()).optional(), // Optional based on HTML (no 'required' on fieldset)
  submissionDate: z.string().min(1, {message: "Submission date is required."}), // Will be set automatically
});


const sessionTypeOptions = [
  { id: "online", label: "Online Session" },
  { id: "in-person", label: "In-Person Session" },
  { id: "rescue-remedy", label: "Rescue Remedy Session (Dog Club members & current clients only)" },
];


export default function BehaviouralBriefPage() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentSubmissionDate, setCurrentSubmissionDate] = useState(''); // Initialized to empty string
  const { toast } = useToast();

  useEffect(() => {
    // Set initial date on client-side to avoid hydration mismatch
    setCurrentSubmissionDate(format(new Date(), "yyyy-MM-dd HH:mm:ss"));
  }, []);

  const memoizedDefaultValues = useMemo<BehaviouralBriefFormValues>(() => ({
    ownerFirstName: '',
    ownerLastName: '',
    contactEmail: '',
    contactNumber: '',
    postcode: '',
    dogName: '',
    dogSex: undefined as 'Male' | 'Female' | undefined, // Important for Select placeholder
    dogBreed: '',
    lifeWithDogAndHelpNeeded: '',
    bestOutcome: '',
    idealSessionTypes: [],
    submissionDate: '', // This will be updated by useEffect and before submission
  }), []);

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<BehaviouralBriefFormValues>({
    resolver: zodResolver(behaviouralBriefSchema),
    defaultValues: memoizedDefaultValues
  });

  // Sync currentSubmissionDate (client-side generated) with the form's submissionDate field
  useEffect(() => {
    if (currentSubmissionDate) {
      setValue("submissionDate", currentSubmissionDate, { shouldValidate: false, shouldDirty: false });
    }
  }, [currentSubmissionDate, setValue]);


  const handleFormSubmit: SubmitHandler<BehaviouralBriefFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      // Ensure the submissionDate is the most current at the time of submission
      const submissionTimestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const submissionDataWithPreciseTimestamp: BehaviouralBriefFormValues = {
        ...data,
        submissionDate: submissionTimestamp,
      };

      await addClientAndBriefToFirestore(submissionDataWithPreciseTimestamp);
      toast({
        title: "Submission Successful!",
        description: "Thank you for submitting your Behavioural Brief. We will be in touch shortly.",
      });

      // Reset form and update currentSubmissionDate for the next potential form use
      const newDateForNextForm = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      setCurrentSubmissionDate(newDateForNextForm); // Update state for next render
      reset({ // Pass the full default object, including the new submissionDate
        ...memoizedDefaultValues,
        submissionDate: newDateForNextForm, // Ensure this is part of the reset
      });
    } catch (err) {
      console.error("Error submitting behavioural brief:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({
        title: "Submission Error",
        description: `There was a problem submitting your form: ${errorMessage}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper component for section titles based on Squarespace form structure
  const SectionTitle: React.FC<{ title: string, description?: string }> = ({ title, description }) => (
    <>
      <div className="pt-4 pb-2"> {/* Added pt-4 to match Squarespace section spacing */}
        <h2 className="text-lg font-semibold uppercase text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <Separator className="mb-4 bg-black" />
    </>
  );

  // Helper component for consistent form field layout
  const FormFieldWrapper: React.FC<{
    label?: string;
    htmlForProp?: keyof BehaviouralBriefFormValues | string; // To allow string for sub-labels
    error?: string | boolean; // Accept boolean for cases where only styling changes
    children: React.ReactNode;
    required?: boolean;
    description?: string;
    className?: string; // Allow additional classes for specific fields
  }> = ({ label, htmlForProp, error, children, required, description, className }) => (
    <div className={cn("space-y-1.5 mb-5", className)}> {/* Default bottom margin for spacing */}
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


  return (
    // Removed bg-[#4f6749] as it's now handled by the layout
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-[#ebeadf] text-center mb-10">
        Behavioural Brief
      </h1>
      <Card className="w-full max-w-3xl shadow-2xl bg-[#ebeadf]">
        <CardContent className="p-6 sm:p-8"> {/* Added sm:p-8 for slightly more padding on larger screens */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-0"> {/* Removed space-y-6 to use FormFieldWrapper's margin */}

            <SectionTitle title="CONTACT INFORMATION" />

            {/* Owner Name - Split into First and Last Name */}
            <FormFieldWrapper
              label="Owner Name"
              htmlForProp="ownerFirstName" // Points to the first input in the group
              error={errors.ownerFirstName?.message || errors.ownerLastName?.message}
              required
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ownerFirstName" className="text-xs text-muted-foreground">First Name</Label>
                  <Input
                    id="ownerFirstName"
                    {...register("ownerFirstName")}
                    className={cn(
                      errors.ownerFirstName ? "border-destructive" : "border-black",
                      "bg-[#ebeadf] focus-visible:ring-black"
                    )}
                    disabled={isSubmitting} />
                  {errors.ownerFirstName && <p className="text-xs text-destructive mt-1">{errors.ownerFirstName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="ownerLastName" className="text-xs text-muted-foreground">Last Name</Label>
                  <Input
                    id="ownerLastName"
                    {...register("ownerLastName")}
                    className={cn(
                      errors.ownerLastName ? "border-destructive" : "border-black",
                      "bg-[#ebeadf] focus-visible:ring-black"
                    )}
                    disabled={isSubmitting} />
                  {errors.ownerLastName && <p className="text-xs text-destructive mt-1">{errors.ownerLastName.message}</p>}
                </div>
              </div>
            </FormFieldWrapper>

            <FormFieldWrapper label="Email" htmlForProp="contactEmail" error={errors.contactEmail?.message} required>
              <Input
                id="contactEmail"
                type="email"
                {...register("contactEmail")}
                className={cn(
                  errors.contactEmail ? "border-destructive" : "border-black",
                  "bg-[#ebeadf] focus-visible:ring-black"
                )}
                disabled={isSubmitting} />
            </FormFieldWrapper>
            <FormFieldWrapper label="Contact Number" htmlForProp="contactNumber" error={errors.contactNumber?.message} required>
              <Input
                id="contactNumber"
                type="tel"
                {...register("contactNumber")}
                className={cn(
                  errors.contactNumber ? "border-destructive" : "border-black",
                  "bg-[#ebeadf] focus-visible:ring-black"
                )}
                disabled={isSubmitting}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="Postcode" htmlForProp="postcode" error={errors.postcode?.message} required>
              <Input
                id="postcode"
                {...register("postcode")}
                className={cn(
                  errors.postcode ? "border-destructive" : "border-black",
                  "bg-[#ebeadf] focus-visible:ring-black"
                )}
                disabled={isSubmitting}/>
            </FormFieldWrapper>

            <SectionTitle title="DOG INFORMATION" description="If you are inquiring about more than one dog please complete an additional form." />
            <FormFieldWrapper label="Dog Name" htmlForProp="dogName" error={errors.dogName?.message} required>
              <Input
                id="dogName"
                {...register("dogName")}
                className={cn(
                  errors.dogName ? "border-destructive" : "border-black",
                  "bg-[#ebeadf] focus-visible:ring-black"
                )}
                disabled={isSubmitting} />
            </FormFieldWrapper>
            <FormFieldWrapper label="Sex" htmlForProp="dogSex" error={errors.dogSex?.message} required>
              <Controller
                name="dogSex"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <SelectTrigger
                      className={cn(
                        errors.dogSex ? "border-destructive" : "border-black",
                        "bg-[#ebeadf] focus-visible:ring-black"
                      )}
                    >
                      <SelectValue placeholder="Please Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#ebeadf]">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormFieldWrapper>
            <FormFieldWrapper label="What breed is your dog?" htmlForProp="dogBreed" error={errors.dogBreed?.message} required description="Unknown/mixed is fine :-)">
              <Input
                id="dogBreed"
                {...register("dogBreed")}
                className={cn(
                  errors.dogBreed ? "border-destructive" : "border-black",
                  "bg-[#ebeadf] focus-visible:ring-black"
                )}
                disabled={isSubmitting} />
            </FormFieldWrapper>
            <FormFieldWrapper label="In general, how is life with your dog, and what would you like help with?" htmlForProp="lifeWithDogAndHelpNeeded" error={errors.lifeWithDogAndHelpNeeded?.message} required description="New puppy, new dog, new rescue, general training, behaviour concern, etc.">
              <Textarea
                id="lifeWithDogAndHelpNeeded"
                {...register("lifeWithDogAndHelpNeeded")}
                className={cn(
                  errors.lifeWithDogAndHelpNeeded ? "border-destructive" : "border-black",
                  "bg-[#ebeadf] focus-visible:ring-black"
                )}
                disabled={isSubmitting}
                rows={4}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="What would be the best outcome for you and your dog?" htmlForProp="bestOutcome" error={errors.bestOutcome?.message} required description="E.g. a better relationship, a happier dog, an easier home life, more relaxed walks, etc.">
              <Textarea
                id="bestOutcome"
                {...register("bestOutcome")}
                className={cn(
                  errors.bestOutcome ? "border-destructive" : "border-black",
                  "bg-[#ebeadf] focus-visible:ring-black"
                )}
                disabled={isSubmitting}
                rows={4}/>
            </FormFieldWrapper>
            {/* Which type of session would you ideally like? - Checkbox Group */}
            <FormFieldWrapper label="Which type of session would you ideally like?" htmlForProp="idealSessionTypes" error={errors.idealSessionTypes?.message} className="mb-6">
              <Controller
                name="idealSessionTypes"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2.5">
                    {sessionTypeOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sessionType-${option.id}`}
                          checked={field.value?.includes(option.label)}
                          onCheckedChange={(checked) => {
                            const currentValue = field.value || [];
                            return checked
                              ? field.onChange([...currentValue, option.label])
                              : field.onChange(
                                  currentValue.filter(
                                    (value) => value !== option.label
                                  )
                                );
                          }}
                          disabled={isSubmitting}
                          className="border-black data-[state=checked]:bg-primary data-[state=checked]:border-black focus-visible:ring-black"
                        />
                        <Label htmlFor={`sessionType-${option.id}`} className="font-normal text-sm text-foreground">{option.label}</Label>
                      </div>
                    ))}
                  </div>
                )}
              />
            </FormFieldWrapper>

            {/* Hidden input for submissionDate, automatically populated */}
            <input type="hidden" {...register("submissionDate")} />

            <div className="pt-6 flex justify-center"> {/* Spacing for the submit button */}
              <Button
                type="submit"
                size="lg"
                className="bg-[#4f6749] text-black hover:bg-[#4f6749]/90"
                disabled={isSubmitting}
                tooltip="Submit Behavioural Brief"
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


