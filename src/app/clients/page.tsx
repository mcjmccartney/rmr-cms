
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Client, Session, BehaviouralBrief, BehaviourQuestionnaire, Address, EditableClientData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Edit, Trash2, Info, FileQuestion, ArrowLeft, SquareCheck, CalendarDays as CalendarIconLucide, Filter, Check, UserPlus, Save, Eye, FileText, X } from 'lucide-react';
import Image from 'next/image';
import { format, parseISO, isValid } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatFullNameAndDogName, formatPhoneNumber } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
// API functions
const getClients = async () => {
  const response = await fetch('/api/clients');
  if (!response.ok) throw new Error('Failed to fetch clients');
  return response.json().then(data => data.data);
};

const getSessions = async () => {
  const response = await fetch('/api/sessions');
  if (!response.ok) throw new Error('Failed to fetch sessions');
  return response.json().then(data => data.data);
};

const addClient = async (client: any) => {
  const response = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(client),
  });
  if (!response.ok) throw new Error('Failed to add client');
  return response.json().then(data => data.data);
};

const updateClient = async (id: string, updates: any) => {
  const response = await fetch(`/api/clients?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update client');
  return response.json();
};

const deleteClient = async (id: string) => {
  const response = await fetch(`/api/clients?id=${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete client');
  return response.json();
};

// Placeholder functions for behavioural briefs and questionnaires
const getBehaviouralBrief = async (briefId: string) => {
  console.warn('getBehaviouralBrief not yet implemented');
  return null;
};

const getBehaviourQuestionnaire = async (questionnaireId: string) => {
  console.warn('getBehaviourQuestionnaire not yet implemented');
  return null;
};


const internalClientFormSchema = z.object({
  ownerFirstName: z.string().min(1, { message: "First name is required." }),
  ownerLastName: z.string().min(1, { message: "Last name is required." }),
  dogName: z.string().optional(),
  contactEmail: z.string().email({ message: "Invalid email address." }),
  contactNumber: z.string().min(5, { message: "Contact number is required." }),
  fullAddress: z.string().optional(),
  postcode: z.string().min(3, { message: "Postcode is required." }),
  isMember: z.boolean().optional(),
  isActive: z.boolean().optional(),
  submissionDate: z.string().optional(),
});
type InternalClientFormValues = z.infer<typeof internalClientFormSchema>;

type MemberFilterType = 'all' | 'members' | 'nonMembers';

const DetailRow: React.FC<{ label: string; value?: string | number | null | React.ReactNode; className?: string; }> = ({ label, value, className }) => {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }
  return (
    <div className={cn("flex justify-between items-start py-3", className)}>
      <span className="text-sm text-muted-foreground pr-2">{label}</span>
      <span className="text-sm text-foreground text-right break-words whitespace-pre-wrap">{value}</span>
    </div>
  );
};


export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmittingSheet, setIsSubmittingSheet] = useState<boolean>(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddClientSheetOpen, setIsAddClientSheetOpen] = useState(false);

  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [clientForViewSheet, setClientForViewSheet] = useState<Client | null>(null);
  const [sheetViewMode, setSheetViewMode] = useState<'clientInfo' | 'behaviouralBrief' | 'behaviourQuestionnaire'>('clientInfo');

  const [briefForSheet, setBriefForSheet] = useState<BehaviouralBrief | null>(null);
  const [isLoadingBriefForSheet, setIsLoadingBriefForSheet] = useState<boolean>(false);

  const [questionnaireForSheet, setQuestionnaireForSheet] = useState<BehaviourQuestionnaire | null>(null);
  const [isLoadingQuestionnaireForSheet, setIsLoadingQuestionnaireForSheet] = useState<boolean>(false);

  const [clientSessionsForView, setClientSessionsForView] = useState<Session[]>([]);
  const [memberFilter, setMemberFilter] = useState<MemberFilterType>('all');



  const addClientForm = useForm<InternalClientFormValues>({
    resolver: zodResolver(internalClientFormSchema),
     defaultValues: {
      ownerFirstName: '',
      ownerLastName: '',
      dogName: '',
      contactEmail: '',
      contactNumber: '',
      fullAddress: '',
      postcode: '',
      isMember: false,
      isActive: true,
      submissionDate: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    }
  });

  const editClientForm = useForm<InternalClientFormValues>({
    resolver: zodResolver(internalClientFormSchema),
    defaultValues: {
      ownerFirstName: '',
      ownerLastName: '',
      dogName: '',
      contactEmail: '',
      contactNumber: '',
      fullAddress: '',
      postcode: '',
      isMember: false,
      isActive: true,
    }
  });

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [clientsData, sessionsData] = await Promise.all([
        getClients(),
        getSessions()
      ]);
      setClients(clientsData.sort((a, b) => {
          const nameA = formatFullNameAndDogName(`${a.ownerFirstName} ${a.ownerLastName}`, a.dogName).toLowerCase();
          const nameB = formatFullNameAndDogName(`${b.ownerFirstName} ${b.ownerLastName}`, b.dogName).toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        }));
      setAllSessions(sessionsData);
    } catch (err) {
      console.error("Error fetching data:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load data.";
      setError(errorMessage);

    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAddClientSheetOpen) {
        addClientForm.reset({
            ownerFirstName: '',
            ownerLastName: '',
            dogName: '',
            contactEmail: '',
            contactNumber: '',
            fullAddress: '',
            postcode: '',
            isMember: false,
            isActive: true,
            submissionDate: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        });
    }
  }, [isAddClientSheetOpen, addClientForm]);


  useEffect(() => {
    if (clientToEdit) {
      editClientForm.reset({
        ownerFirstName: clientToEdit.ownerFirstName,
        ownerLastName: clientToEdit.ownerLastName,
        dogName: clientToEdit.dogName || '',
        contactEmail: clientToEdit.contactEmail,
        contactNumber: formatPhoneNumber(clientToEdit.contactNumber) || '',
        fullAddress: clientToEdit.fullAddress || '',
        postcode: clientToEdit.postcode,
        isMember: clientToEdit.isMember || false,
        isActive: clientToEdit.isActive === undefined ? true : clientToEdit.isActive,
        submissionDate: clientToEdit.submissionDate,
      });
    }
  }, [clientToEdit, editClientForm]);

  const handleAddClientSubmit: SubmitHandler<InternalClientFormValues> = async (data) => {
    setIsSubmittingSheet(true);
    try {
      const clientDataForFirestore: Omit<Client, 'id' | 'behaviouralBriefId' | 'behaviourQuestionnaireId' | 'createdAt' | 'address' | 'howHeardAboutServices' | 'lastSession' | 'nextSession'> & { dogName?: string; isMember?: boolean; isActive?: boolean; submissionDate?: string; fullAddress?: string } = {
        ownerFirstName: data.ownerFirstName,
        ownerLastName: data.ownerLastName,
        contactEmail: data.contactEmail,
        contactNumber: formatPhoneNumber(data.contactNumber),
        fullAddress: data.fullAddress || undefined,
        postcode: data.postcode,
        dogName: data.dogName || undefined,
        isMember: data.isMember || false,
        isActive: data.isActive === undefined ? true : data.isActive,
        submissionDate: data.submissionDate || format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      };
      const newClient = await addClient(clientDataForFirestore);
      setClients(prevClients => [...prevClients, newClient].sort((a, b) => {
          const nameA = formatFullNameAndDogName(`${a.ownerFirstName} ${a.ownerLastName}`, a.dogName).toLowerCase();
          const nameB = formatFullNameAndDogName(`${b.ownerFirstName} ${b.ownerLastName}`, b.dogName).toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        }));

      addClientForm.reset();
      setIsAddClientSheetOpen(false);
    } catch (err) {
      console.error("Error adding client to Firestore:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to add client.";

    } finally {
      setIsSubmittingSheet(false);
    }
  };

  const handleUpdateClient: SubmitHandler<InternalClientFormValues> = async (data) => {
    if (!clientToEdit) return;
    setIsSubmittingSheet(true);
    try {
        const updateData: EditableClientData = {
            ownerFirstName: data.ownerFirstName,
            ownerLastName: data.ownerLastName,
            dogName: data.dogName || undefined,
            contactEmail: data.contactEmail,
            contactNumber: formatPhoneNumber(data.contactNumber),
            fullAddress: data.fullAddress || undefined,
            postcode: data.postcode,
            isMember: data.isMember || false,
            isActive: data.isActive === undefined ? true : data.isActive,
        };
        await updateClient(clientToEdit.id, updateData);
        setClients(prevClients => prevClients.map(c => c.id === clientToEdit.id ? { ...c, ...updateData, contactNumber: formatPhoneNumber(data.contactNumber) || data.contactNumber } : c)
        .sort((a, b) => {
          const nameA = formatFullNameAndDogName(`${a.ownerFirstName} ${a.ownerLastName}`, a.dogName).toLowerCase();
          const nameB = formatFullNameAndDogName(`${b.ownerFirstName} ${b.ownerLastName}`, b.dogName).toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        })
        );

      setIsEditSheetOpen(false);
      setClientToEdit(null);
    } catch (err) {
        console.error("Error updating client:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to update client.";

    } finally {
        setIsSubmittingSheet(false);
    }
  };

  const handleDeleteClientRequest = (client: Client) => {
    setClientToDelete(client);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsProcessingDelete(true);
    try {
      await deleteClient(clientToDelete.id);
      setClients(prev => prev.filter(c => c.id !== clientToDelete.id));

      if (clientForViewSheet && clientForViewSheet.id === clientToDelete.id) {
        setIsViewSheetOpen(false);
        setClientForViewSheet(null);
      }
    } catch (err) {
      console.error("Error deleting client:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete client.";

    } finally {
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
      setIsProcessingDelete(false);
    }
  };

  useEffect(() => {
    if (isViewSheetOpen && clientForViewSheet) {
      setSheetViewMode('clientInfo');
      setBriefForSheet(null);
      setQuestionnaireForSheet(null);
      const sessionsForThisClient = allSessions.filter(s => s.clientId === clientForViewSheet.id);
      setClientSessionsForView(sessionsForThisClient);
    }
  }, [isViewSheetOpen, clientForViewSheet, allSessions]);

  const handleViewBrief = async () => {
    if (!clientForViewSheet || !clientForViewSheet.behaviouralBriefId) return;
    setIsLoadingBriefForSheet(true);
    try {
      const brief = await getBehaviouralBrief(clientForViewSheet.behaviouralBriefId);
      setBriefForSheet(brief);
      setSheetViewMode('behaviouralBrief');
    } catch (error) {
      console.error("Error fetching brief:", error);

    } finally {
      setIsLoadingBriefForSheet(false);
    }
  };

  const handleViewQuestionnaire = async () => {
    if (!clientForViewSheet || !clientForViewSheet.behaviourQuestionnaireId) return;
    setIsLoadingQuestionnaireForSheet(true);
    try {
      const questionnaire = await getBehaviourQuestionnaire(clientForViewSheet.behaviourQuestionnaireId);
      setQuestionnaireForSheet(questionnaire);
      setSheetViewMode('behaviourQuestionnaire');
    } catch (error) {
      console.error("Error fetching questionnaire:", error);

    } finally {
      setIsLoadingQuestionnaireForSheet(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (memberFilter === 'all') return clients;
    return clients.filter(client => memberFilter === 'members' ? client.isMember : !client.isMember);
  }, [clients, memberFilter]);


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Clients</h1>
        <div className="flex items-center gap-2">
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 focus:ring-0 focus:ring-offset-0">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">Filter Clients</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Membership</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={memberFilter} onValueChange={(value) => setMemberFilter(value as MemberFilterType)}>
                  <DropdownMenuRadioItem value="all">Show: All Clients</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="members">Show: Members Only</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="nonMembers">Show: Non-Members Only</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Sheet open={isAddClientSheetOpen} onOpenChange={setIsAddClientSheetOpen}>
                <SheetTrigger asChild>
                  <Button size="sm" className="sm:px-3">
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">New Client</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col h-full sm:max-w-md bg-card">
                    <SheetHeader>
                      <SheetTitle>New Client</SheetTitle>
                      <Separator />
                    </SheetHeader>
                    <ScrollArea className="flex-1">
                      <div className="py-4 space-y-4">
                        <form onSubmit={addClientForm.handleSubmit(handleAddClientSubmit)} id="addClientFormInSheet" className="space-y-4">
                          <div className="space-y-1.5">
                              <Label htmlFor="add-ownerFirstName">First Name</Label>
                              <Input id="add-ownerFirstName" {...addClientForm.register("ownerFirstName")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.ownerFirstName ? "border-destructive" : "")} disabled={isSubmittingSheet} />
                              {addClientForm.formState.errors.ownerFirstName && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.ownerFirstName.message}</p>}
                          </div>
                          <div className="space-y-1.5">
                              <Label htmlFor="add-ownerLastName">Last Name</Label>
                              <Input id="add-ownerLastName" {...addClientForm.register("ownerLastName")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.ownerLastName ? "border-destructive" : "")} disabled={isSubmittingSheet} />
                              {addClientForm.formState.errors.ownerLastName && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.ownerLastName.message}</p>}
                          </div>
                          <div className="space-y-1.5">
                              <Label htmlFor="add-dogName">Dog's Name</Label>
                              <Input id="add-dogName" {...addClientForm.register("dogName")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.dogName ? "border-destructive" : "")} disabled={isSubmittingSheet} />
                              {addClientForm.formState.errors.dogName && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.dogName.message}</p>}
                          </div>
                          <div className="space-y-1.5">
                              <Label htmlFor="add-contactEmail">Email</Label>
                              <Input id="add-contactEmail" type="email" {...addClientForm.register("contactEmail")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.contactEmail ? "border-destructive" : "")} disabled={isSubmittingSheet} />
                              {addClientForm.formState.errors.contactEmail && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.contactEmail.message}</p>}
                          </div>
                          <div className="space-y-1.5">
                              <Label htmlFor="add-contactNumber">Contact Number</Label>
                              <Input id="add-contactNumber" type="tel" {...addClientForm.register("contactNumber")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.contactNumber ? "border-destructive" : "")} disabled={isSubmittingSheet} />
                              {addClientForm.formState.errors.contactNumber && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.contactNumber.message}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="add-fullAddress">Address</Label>
                            <Textarea id="add-fullAddress" {...addClientForm.register("fullAddress")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.fullAddress ? "border-destructive" : "")} disabled={isSubmittingSheet} rows={3}/>
                            {addClientForm.formState.errors.fullAddress && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.fullAddress.message}</p>}
                          </div>
                          <div className="space-y-1.5">
                              <Label htmlFor="add-postcode">Postcode</Label>
                              <Input id="add-postcode" {...addClientForm.register("postcode")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.postcode ? "border-destructive" : "")} disabled={isSubmittingSheet} />
                              {addClientForm.formState.errors.postcode && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.postcode.message}</p>}
                          </div>
                          <div className="flex items-center space-x-4 pt-2">
                            <div className="flex items-center space-x-2">
                                <Controller
                                name="isMember"
                                control={addClientForm.control}
                                render={({ field }) => (
                                    <Checkbox
                                    id="add-isMember"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmittingSheet}
                                    className="focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                )}
                                />
                                <Label htmlFor="add-isMember" className="text-sm font-normal">Membership</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Controller
                                name="isActive"
                                control={addClientForm.control}
                                render={({ field }) => (
                                    <Checkbox
                                    id="add-isActive"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmittingSheet}
                                    className="focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                )}
                                />
                                <Label htmlFor="add-isActive" className="text-sm font-normal">Active</Label>
                            </div>
                          </div>
                          <input type="hidden" {...addClientForm.register("submissionDate")} />
                        </form>
                      </div>
                    </ScrollArea>
                    <SheetFooter className="border-t pt-4">
                        <Button
                          type="submit"
                          form="addClientFormInSheet"
                          className="w-full"
                          disabled={isSubmittingSheet}
                        >
                          {isSubmittingSheet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Client
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading clients...</p>
        </div>
      )}
      {!isLoading && error && (
        <div className="text-destructive text-center py-10">
          <p>Error loading clients: {error}</p>
          <p>Please ensure Firebase is configured correctly and you are online.</p>
        </div>
      )}
      {!isLoading && !error && filteredClients.length === 0 && (
        <p className="text-muted-foreground text-center py-10">No clients found. Add a new client or adjust your filter.</p>
      )}
      {!isLoading && !error && filteredClients.length > 0 && (
        <div className="space-y-2">
          {filteredClients.map(client => {
            const displayName = formatFullNameAndDogName(`${client.ownerFirstName} ${client.ownerLastName}`, client.dogName);
            return (
              <div
                key={client.id}
                className="bg-card shadow-sm rounded-md border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => { setClientForViewSheet(client); setIsViewSheetOpen(true); }}
              >
                <div className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Image
                        src="https://iili.io/34300ox.md.jpg"
                        alt="RMR Logo"
                        width={32}
                        height={32}
                        className="rounded-md"
                        data-ai-hint="company logo"
                      />
                      <div>
                        <h3 className="text-sm font-semibold">{displayName}</h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

        <Sheet open={isEditSheetOpen} onOpenChange={(isOpen) => {setIsEditSheetOpen(isOpen); if(!isOpen) setClientToEdit(null); }}>
          <SheetContent className="flex flex-col h-full sm:max-w-md bg-card">
            <SheetHeader>
              <SheetTitle>Edit Client</SheetTitle>
              <Separator />
            </SheetHeader>
            <ScrollArea className="flex-1">
              <div className="py-4 space-y-4">
              {clientToEdit && (
                <form onSubmit={editClientForm.handleSubmit(handleUpdateClient)} id="editClientFormInSheet" className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-ownerFirstName">First Name</Label>
                    <Input id="edit-ownerFirstName" {...editClientForm.register("ownerFirstName")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientForm.formState.errors.ownerFirstName ? "border-destructive" : "")} disabled={isSubmittingSheet}/>
                    {editClientForm.formState.errors.ownerFirstName && <p className="text-xs text-destructive mt-1">{editClientForm.formState.errors.ownerFirstName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-ownerLastName">Last Name</Label>
                    <Input id="edit-ownerLastName" {...editClientForm.register("ownerLastName")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientForm.formState.errors.ownerLastName ? "border-destructive" : "")} disabled={isSubmittingSheet}/>
                    {editClientForm.formState.errors.ownerLastName && <p className="text-xs text-destructive mt-1">{editClientForm.formState.errors.ownerLastName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-dogName">Dog's Name</Label>
                    <Input id="edit-dogName" {...editClientForm.register("dogName")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientForm.formState.errors.dogName ? "border-destructive" : "")} disabled={isSubmittingSheet}/>
                    {editClientForm.formState.errors.dogName && <p className="text-xs text-destructive mt-1">{editClientForm.formState.errors.dogName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-contactEmail">Email</Label>
                    <Input id="edit-contactEmail" type="email" {...editClientForm.register("contactEmail")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientForm.formState.errors.contactEmail ? "border-destructive" : "")} disabled={isSubmittingSheet}/>
                    {editClientForm.formState.errors.contactEmail && <p className="text-xs text-destructive mt-1">{editClientForm.formState.errors.contactEmail.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-contactNumber">Contact Number</Label>
                    <Input id="edit-contactNumber" type="tel" {...editClientForm.register("contactNumber")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientForm.formState.errors.contactNumber ? "border-destructive" : "")} disabled={isSubmittingSheet}/>
                    {editClientForm.formState.errors.contactNumber && <p className="text-xs text-destructive mt-1">{editClientForm.formState.errors.contactNumber.message}</p>}
                  </div>
                   <div className="space-y-1.5">
                    <Label htmlFor="edit-fullAddress">Address</Label>
                    <Textarea id="edit-fullAddress" {...editClientForm.register("fullAddress")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientForm.formState.errors.fullAddress ? "border-destructive" : "")} disabled={isSubmittingSheet} rows={3}/>
                    {editClientForm.formState.errors.fullAddress && <p className="text-xs text-destructive mt-1">{editClientForm.formState.errors.fullAddress.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-postcode">Postcode</Label>
                    <Input id="edit-postcode" {...editClientForm.register("postcode")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientForm.formState.errors.postcode ? "border-destructive" : "")} disabled={isSubmittingSheet}/>
                   {editClientForm.formState.errors.postcode && <p className="text-xs text-destructive mt-1">{editClientForm.formState.errors.postcode.message}</p>}
                  </div>
                  <div className="flex items-center space-x-4 pt-2">
                    <div className="flex items-center space-x-2">
                        <Controller
                        name="isMember"
                        control={editClientForm.control}
                        render={({ field }) => (
                            <Checkbox id="edit-isMember" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmittingSheet} className="focus-visible:ring-0 focus-visible:ring-offset-0"/>
                        )}
                        />
                        <Label htmlFor="edit-isMember" className="text-sm font-normal">Membership</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Controller
                        name="isActive"
                        control={editClientForm.control}
                        render={({ field }) => (
                            <Checkbox id="edit-isActive" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmittingSheet} className="focus-visible:ring-0 focus-visible:ring-offset-0"/>
                        )}
                        />
                        <Label htmlFor="edit-isActive" className="text-sm font-normal">Active</Label>
                    </div>
                  </div>
                </form>
                )}
              </div>
            </ScrollArea>
            <SheetFooter className="border-t pt-4">
              <Button
                type="submit"
                form="editClientFormInSheet"
                className="w-full"
                disabled={isSubmittingSheet}
              >
                {isSubmittingSheet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Sheet open={isViewSheetOpen} onOpenChange={(isOpen) => { setIsViewSheetOpen(isOpen); if (!isOpen) { setClientForViewSheet(null); setSheetViewMode('clientInfo'); } }}>
            <SheetContent className="flex flex-col h-full sm:max-w-lg bg-card">
                <SheetHeader>
                     <SheetTitle>{clientForViewSheet ? formatFullNameAndDogName(clientForViewSheet.ownerFirstName + " " + clientForViewSheet.ownerLastName, clientForViewSheet.dogName) : "Client Details"}</SheetTitle>
                </SheetHeader>
                <Separator className="mb-4"/>
                <ScrollArea className="flex-1">
                  <div className="py-4">
                    {clientForViewSheet && (
                      <>
                        {sheetViewMode === 'clientInfo' && (
                            <div>
                                <DetailRow label="Email:" value={clientForViewSheet.contactEmail} />
                                <DetailRow label="Contact Number:" value={formatPhoneNumber(clientForViewSheet.contactNumber)} />

                                {clientForViewSheet.address ? (
                                <>
                                    <DetailRow label="Address L1:" value={clientForViewSheet.address.addressLine1} />
                                    {clientForViewSheet.address.addressLine2 && <DetailRow label="Address L2:" value={clientForViewSheet.address.addressLine2} />}
                                    <DetailRow label="City:" value={clientForViewSheet.address.city} />
                                    <DetailRow label="Country:" value={clientForViewSheet.address.country} />
                                    <DetailRow label="Postcode:" value={clientForViewSheet.postcode} />
                                </>
                                ) : clientForViewSheet.fullAddress ? (
                                <>
                                    <DetailRow label="Address:" value={clientForViewSheet.fullAddress} />
                                    <DetailRow label="Postcode:" value={clientForViewSheet.postcode} />
                                </>
                                ) : (
                                    <DetailRow label="Postcode:" value={clientForViewSheet.postcode} />
                                )}
                                <DetailRow label="Membership:" value={clientForViewSheet.isMember ? "Active Member" : "Not a Member"} />
                                <DetailRow label="Status:" value={clientForViewSheet.isActive ? "Active Client" : "Inactive Client"} />

                                {clientForViewSheet.howHeardAboutServices && <DetailRow label="Heard Via:" value={clientForViewSheet.howHeardAboutServices} />}
                                {clientForViewSheet.submissionDate && <DetailRow label="Submitted:" value={isValid(parseISO(clientForViewSheet.submissionDate)) ? format(parseISO(clientForViewSheet.submissionDate), 'PPP p') : clientForViewSheet.submissionDate} />}

                                <div className="mt-6 space-y-2">
                                  {clientForViewSheet.behaviouralBriefId && (
                                      <Button
                                        onClick={handleViewBrief}
                                        className="w-full"
                                        variant="outline"
                                        disabled={isLoadingBriefForSheet}
                                      >
                                        {isLoadingBriefForSheet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        View Behavioural Brief
                                      </Button>
                                  )}
                                  {clientForViewSheet.behaviourQuestionnaireId && (
                                      <Button
                                        onClick={handleViewQuestionnaire}
                                        className="w-full"
                                        variant="outline"
                                        disabled={isLoadingQuestionnaireForSheet}
                                      >
                                        {isLoadingQuestionnaireForSheet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        View Behaviour Questionnaire
                                      </Button>
                                  )}
                                </div>

                                 <Tabs defaultValue="sessions" className="w-full mt-6">
                                     <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full border">
                                        <TabsTrigger value="sessions"  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground">
                                        Sessions ({clientSessionsForView.length})
                                        </TabsTrigger>
                                        <TabsTrigger value="membership" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground">
                                        Membership
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="sessions" className="pt-4">
                                        <ul className="space-y-0">
                                            {clientSessionsForView.length > 0 ? clientSessionsForView.map(session => (
                                            <li key={session.id} className="bg-card border border-border rounded-md p-3 mb-2">
                                                <div className="text-sm font-medium text-foreground">
                                                  {isValid(parseISO(session.date)) ? format(parseISO(session.date), 'PPP') : session.date} at {session.time}
                                                </div>
                                                 <div className="text-xs text-muted-foreground">
                                                  {session.sessionType} {session.amount ? `- £${session.amount.toFixed(2)}` : ''}
                                                </div>
                                            </li>
                                            )) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">No sessions recorded for this client.</p>
                                            )}
                                        </ul>
                                      </TabsContent>
                                    <TabsContent value="membership" className="pt-4">
                                      <p className="text-sm text-muted-foreground text-center py-4">Membership details are not yet available.</p>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        )}

                        {sheetViewMode === 'behaviouralBrief' && briefForSheet && (
                            <div>
                                <div className="flex justify-center items-center mb-3">
                                    <h4 className="text-lg font-semibold">Behavioural Brief</h4>
                                </div>
                                <Separator className="mb-3" />
                                <DetailRow label="Dog Name:" value={briefForSheet.dogName} />
                                <DetailRow label="Dog Sex:" value={briefForSheet.dogSex} />
                                <DetailRow label="Dog Breed:" value={briefForSheet.dogBreed} />
                                <DetailRow label="Life & Help Needed:" value={briefForSheet.lifeWithDogAndHelpNeeded} />
                                <DetailRow label="Best Outcome:" value={briefForSheet.bestOutcome} />
                                <DetailRow label="Ideal Sessions:" value={briefForSheet.idealSessionTypes?.join(', ')} />
                                {briefForSheet.submissionDate && <DetailRow label="Submitted:" value={isValid(parseISO(briefForSheet.submissionDate)) ? format(parseISO(briefForSheet.submissionDate), 'PPP p') : briefForSheet.submissionDate} />}
                            </div>
                        )}
                        {isLoadingBriefForSheet && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}


                        {sheetViewMode === 'behaviourQuestionnaire' && questionnaireForSheet && (
                            <div>
                                <div className="flex justify-center items-center mb-3">
                                    <h4 className="text-lg font-semibold">Behaviour Questionnaire</h4>
                                </div>
                                <Separator className="mb-3" />
                                <DetailRow label="Dog Name:" value={questionnaireForSheet.dogName} />
                                <DetailRow label="Dog Age:" value={questionnaireForSheet.dogAge} />
                                <DetailRow label="Dog Sex:" value={questionnaireForSheet.dogSex} />
                                <DetailRow label="Dog Breed:" value={questionnaireForSheet.dogBreed} />
                                <DetailRow label="Neutered/Spayed:" value={questionnaireForSheet.neuteredSpayedDetails} />
                                <DetailRow label="Main Problem:" value={questionnaireForSheet.mainProblem} />
                                <DetailRow label="Problem First Noticed:" value={questionnaireForSheet.problemTendencyFirstNoticed} />
                                <DetailRow label="Problem Frequency:" value={questionnaireForSheet.problemFrequencyDetails} />
                                <DetailRow label="Problem Recent Changes:" value={questionnaireForSheet.problemRecentChanges} />
                                <DetailRow label="Problem Anticipation:" value={questionnaireForSheet.problemAnticipationDetails} />
                                <DetailRow label="Dog Motivation (Problem):" value={questionnaireForSheet.dogMotivationForProblem} />
                                <DetailRow label="Problem Attempts:" value={questionnaireForSheet.problemAddressingAttempts} />
                                <DetailRow label="Ideal Outcome:" value={questionnaireForSheet.idealTrainingOutcome} />
                                {questionnaireForSheet.otherHelpNeeded && <DetailRow label="Other Help Needed:" value={questionnaireForSheet.otherHelpNeeded} />}
                                {questionnaireForSheet.medicalHistory && <DetailRow label="Medical History:" value={questionnaireForSheet.medicalHistory} />}
                                {questionnaireForSheet.vetConsultationDetails && <DetailRow label="Vet Consultation:" value={questionnaireForSheet.vetConsultationDetails} />}
                                {questionnaireForSheet.dogOrigin && <DetailRow label="Dog Origin:" value={questionnaireForSheet.dogOrigin} />}
                                {questionnaireForSheet.rescueBackground && <DetailRow label="Rescue Background:" value={questionnaireForSheet.rescueBackground} />}
                                {questionnaireForSheet.dogAgeWhenAcquired && <DetailRow label="Age Acquired:" value={questionnaireForSheet.dogAgeWhenAcquired} />}
                                {questionnaireForSheet.dietDetails && <DetailRow label="Diet:" value={questionnaireForSheet.dietDetails} />}
                                {questionnaireForSheet.foodMotivationLevel && <DetailRow label="Food Motivation:" value={questionnaireForSheet.foodMotivationLevel} />}
                                {questionnaireForSheet.mealtimeRoutine && <DetailRow label="Mealtime Routine:" value={questionnaireForSheet.mealtimeRoutine} />}
                                {questionnaireForSheet.treatRoutine && <DetailRow label="Treat Routine:" value={questionnaireForSheet.treatRoutine} />}
                                {questionnaireForSheet.externalTreatsConsent && <DetailRow label="External Treats Consent:" value={questionnaireForSheet.externalTreatsConsent} />}
                                {questionnaireForSheet.playEngagement && <DetailRow label="Play Engagement:" value={questionnaireForSheet.playEngagement} />}
                                {questionnaireForSheet.affectionResponse && <DetailRow label="Affection Response:" value={questionnaireForSheet.affectionResponse} />}
                                {questionnaireForSheet.exerciseRoutine && <DetailRow label="Exercise Routine:" value={questionnaireForSheet.exerciseRoutine} />}
                                {questionnaireForSheet.muzzleUsage && <DetailRow label="Muzzle Usage:" value={questionnaireForSheet.muzzleUsage} />}
                                {questionnaireForSheet.reactionToFamiliarPeople && <DetailRow label="Reaction to Familiar People:" value={questionnaireForSheet.reactionToFamiliarPeople} />}
                                {questionnaireForSheet.reactionToUnfamiliarPeople && <DetailRow label="Reaction to Unfamiliar People:" value={questionnaireForSheet.reactionToUnfamiliarPeople} />}
                                {questionnaireForSheet.housetrainedStatus && <DetailRow label="Housetrained Status:" value={questionnaireForSheet.housetrainedStatus} />}
                                {questionnaireForSheet.activitiesAsideFromWalks && <DetailRow label="Other Activities:" value={questionnaireForSheet.activitiesAsideFromWalks} />}
                                {questionnaireForSheet.dogLikes && <DetailRow label="Dog Likes:" value={questionnaireForSheet.dogLikes} />}
                                <DetailRow label="Dog Challenges:" value={questionnaireForSheet.dogChallenges} />
                                <DetailRow label="Positive Reinforcement:" value={questionnaireForSheet.positiveReinforcementMethods} />
                                <DetailRow label="Favorite Rewards:" value={questionnaireForSheet.favoriteRewards} />
                                <DetailRow label="Correction Methods:" value={questionnaireForSheet.correctionMethods} />
                                <DetailRow label="Correction Effects:" value={questionnaireForSheet.correctionEffects} />
                                <DetailRow label="Previous Training:" value={questionnaireForSheet.previousProfessionalTraining} />
                                <DetailRow label="Previous Methods Used:" value={questionnaireForSheet.previousTrainingMethodsUsed} />
                                <DetailRow label="Previous Training Results:" value={questionnaireForSheet.previousTrainingExperienceResults} />
                                {questionnaireForSheet.sociabilityWithDogs && <DetailRow label="Sociability (Dogs):" value={questionnaireForSheet.sociabilityWithDogs} />}
                                {questionnaireForSheet.sociabilityWithPeople && <DetailRow label="Sociability (People):" value={questionnaireForSheet.sociabilityWithPeople} />}
                                {questionnaireForSheet.additionalInformation && <DetailRow label="Additional Info:" value={questionnaireForSheet.additionalInformation} />}
                                {questionnaireForSheet.timeDedicatedToTraining && <DetailRow label="Time for Training:" value={questionnaireForSheet.timeDedicatedToTraining} />}
                                {questionnaireForSheet.submissionDate && <DetailRow label="Submitted:" value={isValid(parseISO(questionnaireForSheet.submissionDate)) ? format(parseISO(questionnaireForSheet.submissionDate), 'PPP p') : questionnaireForSheet.submissionDate} />}
                            </div>
                        )}
                        {isLoadingQuestionnaireForSheet && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                      </>
                    )}
                  </div>
                </ScrollArea>
                <SheetFooter className="border-t pt-4 flex-row gap-2">
                    {sheetViewMode === 'clientInfo' ? (
                        <>
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    if (clientForViewSheet) {
                                    setClientToEdit(clientForViewSheet);
                                    setIsEditSheetOpen(true);
                                    setIsViewSheetOpen(false);
                                    }
                                }}
                                disabled={isProcessingDelete}
                            >
                                Edit Contact
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={() => clientForViewSheet && handleDeleteClientRequest(clientForViewSheet)}
                                disabled={isProcessingDelete}
                            >
                                  {isProcessingDelete && clientToDelete && clientToDelete.id === clientForViewSheet?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Delete Client
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setSheetViewMode('clientInfo')}
                            >
                            Back to Client Details
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This will permanently delete the client: {clientToDelete ? formatFullNameAndDogName(clientToDelete.ownerFirstName + " " + clientToDelete.ownerLastName, clientToDelete.dogName) : ''}.
                This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} disabled={isProcessingDelete}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteClient} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isProcessingDelete}>
                {isProcessingDelete && clientToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Confirm Delete
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
