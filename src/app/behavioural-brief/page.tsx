
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
import { addClientAndBriefToFirestore, type BehaviouralBriefFormValues } from '@/lib/dataService';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';


const behaviouralBriefSchema = z.object({
  ownerFirstName: z.string().min(1, { message: "First Name is required." }),
  ownerLastName: z.string().min(1, { message: "Last Name is required." }),
  contactEmail: z.string().email({ message: "Please enter a valid email address." }),
  contactNumber: z.string().min(1, { message: "Contact Number is required." }),
  postcode: z.string().min(1, { message: "Postcode is required." }),

  dogName: z.string().min(1, { message: "Dog Name is required." }),
  dogSex: z.enum(['Male', 'Female', ''], { required_error: "Sex is required." }).refine(val => val !== '', { message: "Sex is required."}),
  dogBreed: z.string().min(1, { message: "Dog breed is required." }),
  lifeWithDogAndHelpNeeded: z.string().min(1, { message: "This field is required." }),
  bestOutcome: z.string().min(1, { message: "This field is required." }),
  idealSessionTypes: z.array(z.string()).optional(),
  submissionDate: z.string().min(1, {message: "Submission date is required."}),
});

const sessionTypeOptions = [
  { id: "online", label: "Online Session" },
  { id: "in-person", label: "In-Person Session" },
  { id: "rescue-remedy", label: "Rescue Remedy Session (Dog Club members & current clients only)" },
];

export default function BehaviouralBriefPage() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentSubmissionDate, setCurrentSubmissionDate] = useState('');

  const memoizedDefaultValues = useMemo<BehaviouralBriefFormValues>(() => ({
    ownerFirstName: '',
    ownerLastName: '',
    contactEmail: '',
    contactNumber: '',
    postcode: '',
    dogName: '',
    dogSex: '' as 'Male' | 'Female' | '',
    dogBreed: '',
    lifeWithDogAndHelpNeeded: '',
    bestOutcome: '',
    idealSessionTypes: [],
    submissionDate: '',
  }), []);

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<BehaviouralBriefFormValues>({
    resolver: zodResolver(behaviouralBriefSchema),
    defaultValues: memoizedDefaultValues
  });

  useEffect(() => {
    setCurrentSubmissionDate(format(new Date(), "yyyy-MM-dd HH:mm:ss"));
  }, []);

  useEffect(() => {
    if (currentSubmissionDate) {
      setValue("submissionDate", currentSubmissionDate, { shouldValidate: false, shouldDirty: false });
    }
  }, [currentSubmissionDate, setValue]);

  const handleFormSubmit: SubmitHandler<BehaviouralBriefFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const submissionTimestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const submissionDataWithPreciseTimestamp: BehaviouralBriefFormValues = {
        ...data,
        submissionDate: submissionTimestamp,
      };

      await addClientAndBriefToFirestore(submissionDataWithPreciseTimestamp);

      const newDateForNextForm = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      setCurrentSubmissionDate(newDateForNextForm);
      reset({
        ...memoizedDefaultValues,
        submissionDate: newDateForNextForm,
      });
    } catch (err) {
      console.error("Error submitting behavioural brief to Firestore:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
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
    htmlForProp?: keyof BehaviouralBriefFormValues | string;
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
          src="https://iili.io/3PLgTAb.png"
          alt="Behavioural Brief Title"
          width={450}
          height={75}
          data-ai-hint="form title"
        />
      </div>
      <Card className="w-full max-w-3xl shadow-2xl bg-[#ebeadf]">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-0">

            <SectionTitle title="CONTACT INFORMATION" />

            <FormFieldWrapper
              label="Owner Name"
              htmlForProp="ownerFirstName"
              error={errors.ownerFirstName?.message || errors.ownerLastName?.message}
              required
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ownerFirstName" className="text-xs text-muted-foreground">First Name</Label>
                  <Input
                    id="ownerFirstName"
                    {...register("ownerFirstName")}
                    className={cn(inputClassName, errors.ownerFirstName && errorInputClassName)}
                    disabled={isSubmitting} />
                  {errors.ownerFirstName && <p className="text-xs text-destructive mt-1">{errors.ownerFirstName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="ownerLastName" className="text-xs text-muted-foreground">Last Name</Label>
                  <Input
                    id="ownerLastName"
                    {...register("ownerLastName")}
                    className={cn(inputClassName, errors.ownerLastName && errorInputClassName)}
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
                className={cn(inputClassName, errors.contactEmail && errorInputClassName)}
                disabled={isSubmitting} />
            </FormFieldWrapper>
            <FormFieldWrapper label="Contact Number" htmlForProp="contactNumber" error={errors.contactNumber?.message} required>
              <Input
                id="contactNumber"
                type="tel"
                {...register("contactNumber")}
                className={cn(inputClassName, errors.contactNumber && errorInputClassName)}
                disabled={isSubmitting}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="Postcode" htmlForProp="postcode" error={errors.postcode?.message} required>
              <Input
                id="postcode"
                {...register("postcode")}
                className={cn(inputClassName, errors.postcode && errorInputClassName)}
                disabled={isSubmitting}/>
            </FormFieldWrapper>

            <SectionTitle title="DOG INFORMATION" description="If you are inquiring about more than one dog please complete an additional form." />
            <FormFieldWrapper label="Dog Name" htmlForProp="dogName" error={errors.dogName?.message} required>
              <Input
                id="dogName"
                {...register("dogName")}
                className={cn(inputClassName, errors.dogName && errorInputClassName)}
                disabled={isSubmitting} />
            </FormFieldWrapper>
            <FormFieldWrapper label="Sex" htmlForProp="dogSex" error={errors.dogSex?.message} required>
              <Controller
                name="dogSex"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <SelectTrigger
                      className={cn(inputClassName, errors.dogSex && errorInputClassName)}
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
                className={cn(inputClassName, errors.dogBreed && errorInputClassName)}
                disabled={isSubmitting} />
            </FormFieldWrapper>
            <FormFieldWrapper label="In general, how is life with your dog, and what would you like help with?" htmlForProp="lifeWithDogAndHelpNeeded" error={errors.lifeWithDogAndHelpNeeded?.message} required description="New puppy, new dog, new rescue, general training, behaviour concern, etc.">
              <Textarea
                id="lifeWithDogAndHelpNeeded"
                {...register("lifeWithDogAndHelpNeeded")}
                className={cn(inputClassName, errors.lifeWithDogAndHelpNeeded && errorInputClassName)}
                disabled={isSubmitting}
                rows={4}/>
            </FormFieldWrapper>
            <FormFieldWrapper label="What would be the best outcome for you and your dog?" htmlForProp="bestOutcome" error={errors.bestOutcome?.message} required description="E.g. a better relationship, a happier dog, an easier home life, more relaxed walks, etc.">
              <Textarea
                id="bestOutcome"
                {...register("bestOutcome")}
                className={cn(inputClassName, errors.bestOutcome && errorInputClassName)}
                disabled={isSubmitting}
                rows={4}/>
            </FormFieldWrapper>
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

            <input type="hidden" {...register("submissionDate")} />

            <div className="pt-6">
              <Button
                type="submit"
                className="w-full h-12 text-base bg-[#4f6749] text-[#ebeadf] hover:bg-[#4f6749]/90"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Submit Behavioural Brief
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


