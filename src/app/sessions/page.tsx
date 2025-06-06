
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Session, Client, BehaviouralBrief, BehaviourQuestionnaire } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { format, parseISO, isValid, parse } from 'date-fns';
import { Edit, Trash2, Clock, CalendarDays as CalendarIconLucide, DollarSign, MoreHorizontal, Loader2, Info, Tag as TagIcon, ChevronLeft, CalendarPlus, Search, X, Check, User } from 'lucide-react';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
  SheetClose
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as ShadCalendar } from "@/components/ui/calendar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn, formatFullNameAndDogName, formatTimeWithoutSeconds } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
// Supabase API functions
const getClients = async () => {
  const response = await fetch('/api/clients');
  if (!response.ok) throw new Error('Failed to fetch clients');
  return response.json();
};

const getSessions = async () => {
  const response = await fetch('/api/sessions');
  if (!response.ok) throw new Error('Failed to fetch sessions');
  return response.json();
};

const addSession = async (sessionData: any) => {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData),
  });
  if (!response.ok) throw new Error('Failed to add session');
  return response.json();
};

const updateSession = async (id: string, updateData: any) => {
  try {
    const response = await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Session with ID ${id} not found`);
        throw new Error('Session not found');
      }
      throw new Error(`Failed to update session: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
};

const deleteSession = async (id: string) => {
  try {
    const response = await fetch(`/api/sessions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Session with ID ${id} not found`);
        throw new Error('Session not found');
      }
      throw new Error(`Failed to delete session: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};

const getClientById = async (id: string) => {
  try {
    const response = await fetch(`/api/clients/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Client with ID ${id} not found`);
        return null;
      }
      throw new Error(`Failed to fetch client: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching client:', error);
    return null;
  }
};

const getBehaviouralBrief = async (id: string) => {
  const response = await fetch(`/api/behavioural-briefs/${id}`);
  if (!response.ok) throw new Error('Failed to fetch behavioural brief');
  return response.json();
};

const getBehaviourQuestionnaire = async (id: string) => {
  const response = await fetch(`/api/behaviour-questionnaires/${id}`);
  if (!response.ok) throw new Error('Failed to fetch behaviour questionnaire');
  return response.json();
};

const updateClient = async (id: string, updateData: any) => {
  try {
    const response = await fetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Client with ID ${id} not found`);
        throw new Error('Client not found');
      }
      throw new Error(`Failed to update client: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
};

const sessionFormSchema = z.object({
  clientId: z.string().min(1, { message: "Client selection is required." }),
  date: z.date().optional(),
  time: z.string().optional(),
  sessionType: z.string().optional(),
  amount: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : parseFloat(String(val))),
    z.number().nonnegative({ message: 'Quote must be a positive number.' }).optional()
  ),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

// Client form schema for editing - all fields optional except essential identifiers
const clientFormSchema = z.object({
  ownerFirstName: z.string().min(1, { message: "First name is required." }),
  ownerLastName: z.string().min(1, { message: "Last name is required." }),
  dogName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactNumber: z.string().optional(),
  fullAddress: z.string().optional(),
  postcode: z.string().optional(),
  isMember: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

const sessionTypeOptions = [
  "In-Person",
  "Online",
  "Training",
  "Online Catchup",
  "Group",
  "Phone Call",
  "RMR Live",
  "Coaching"
];

interface GroupedSessions {
  [monthYear: string]: Session[];
}

const DetailRow: React.FC<{ label: string; value?: string | number | null | React.ReactNode; className?: string; }> = ({ label, value, className }) => {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }
  return (
    <div className={cn("flex justify-between items-start py-3 border-b border-border", className)}>
      <span className="text-sm text-muted-foreground pr-2">{label}</span>
      <span className="text-sm text-foreground text-right break-words whitespace-pre-wrap">{value}</span>
    </div>
  );
};

const hourOptions = Array.from({ length: 24 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: String(i).padStart(2, '0') }));
const minuteOptions = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => ({ value: m, label: m }));

export default function SessionsPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddSessionSheetOpen, setIsAddSessionSheetOpen] = useState(false);
  const [isSubmittingSheet, setIsSubmittingSheet] = useState<boolean>(false);

  const [selectedSessionForSheet, setSelectedSessionForSheet] = useState<Session | null>(null);
  const [isSessionSheetOpen, setIsSessionSheetOpen] = useState(false);
  const [clientForSelectedSession, setClientForSelectedSession] = useState<Client | null>(null);
  const [isLoadingClientForSession, setIsLoadingClientForSession] = useState<boolean>(false);
  const [sessionSheetViewMode, setSessionSheetViewMode] = useState<'sessionInfo' | 'behaviouralBrief' | 'behaviourQuestionnaire'>('sessionInfo');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [briefForSessionSheet, setBriefForSessionSheet] = useState<BehaviouralBrief | null>(null);
  const [isLoadingBriefForSessionSheet, setIsLoadingBriefForSessionSheet] = useState<boolean>(false);
  const [questionnaireForSessionSheet, setQuestionnaireForSessionSheet] = useState<BehaviourQuestionnaire | null>(null);
  const [isLoadingQuestionnaireForSessionSheet, setIsLoadingQuestionnaireForSessionSheet] = useState<boolean>(false);


  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [isSessionDeleteDialogOpen, setIsSessionDeleteDialogOpen] = useState(false);

  const [isEditSessionSheetOpen, setIsEditSessionSheetOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);

  // Track if user has manually edited the price to prevent auto-overwrite
  const [hasManuallyEditedAddPrice, setHasManuallyEditedAddPrice] = useState(false);
  const [hasManuallyEditedEditPrice, setHasManuallyEditedEditPrice] = useState(false);

  // Client editing state
  const [isEditClientSheetOpen, setIsEditClientSheetOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);



  const addSessionForm = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
        clientId: '',
        date: undefined,
        time: '',
        sessionType: '',
        amount: undefined,
    }
  });

  const {
    watch: watchAddSessionForm,
    setValue: setAddSessionValue,
    control: addSessionFormControl,
    reset: resetAddSessionForm,
    formState: { errors: addSessionFormErrors },
    handleSubmit: handleAddSessionSubmitHook
  } = addSessionForm;

 useEffect(() => {
    if (isAddSessionSheetOpen) {
      resetAddSessionForm({
        clientId: '',
        date: new Date(),
        time: format(new Date(), "HH:mm"),
        sessionType: '',
        amount: undefined,
      });
      // Reset manual edit flag when opening the form
      setHasManuallyEditedAddPrice(false);
    }
  }, [isAddSessionSheetOpen, resetAddSessionForm]);

  const watchedClientIdForAddSession = watchAddSessionForm("clientId");
  const watchedSessionTypeForAddSession = watchAddSessionForm("sessionType");

 useEffect(() => {
    // Only auto-set price if user hasn't manually edited it
    if (isAddSessionSheetOpen && watchedClientIdForAddSession && watchedSessionTypeForAddSession && clients.length > 0 && !hasManuallyEditedAddPrice) {
      const client = clients.find(c => c.id === watchedClientIdForAddSession);
      if (client) {
        let newAmount: number | undefined = undefined;
        const isMember = client.isMember;

        if (watchedSessionTypeForAddSession === "In-Person") newAmount = isMember ? 75 : 95;
        else if (watchedSessionTypeForAddSession === "Online") newAmount = isMember ? 50 : 60;
        else if (watchedSessionTypeForAddSession === "Online Catchup") newAmount = 30;
        else if (watchedSessionTypeForAddSession === "Training") newAmount = isMember ? 50 : 60;

        setAddSessionValue("amount", newAmount);
      }
    }
  }, [isAddSessionSheetOpen, watchedClientIdForAddSession, watchedSessionTypeForAddSession, clients, setAddSessionValue, hasManuallyEditedAddPrice]);

  const editSessionForm = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
     defaultValues: {
        clientId: '',
        date: undefined,
        time: '',
        sessionType: '',
        amount: undefined,
    }
  });

  const {
    watch: watchEditSessionForm,
    setValue: setEditSessionValue,
    control: editSessionFormControl,
    reset: resetEditSessionForm,
    formState: { errors: editSessionFormErrors },
    handleSubmit: handleEditSessionSubmitHook,
  } = editSessionForm;

  // Client editing form
  const editClientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
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

  const {
    control: editClientFormControl,
    reset: resetEditClientForm,
    formState: { errors: editClientFormErrors },
    handleSubmit: handleEditClientSubmitHook,
    register: editClientFormRegister,
  } = editClientForm;

  useEffect(() => {
    if (isEditSessionSheetOpen && sessionToEdit) {
      resetEditSessionForm({
        clientId: sessionToEdit.clientId,
        date: parseISO(sessionToEdit.date),
        time: sessionToEdit.time,
        sessionType: sessionToEdit.sessionType || '',
        amount: sessionToEdit.amount,
      });
      // Reset manual edit flag when opening the edit form
      setHasManuallyEditedEditPrice(false);
    }
  }, [isEditSessionSheetOpen, sessionToEdit, resetEditSessionForm]);

  const watchedClientIdForEditSession = watchEditSessionForm("clientId");
  const watchedSessionTypeForEditSession = watchEditSessionForm("sessionType");

  useEffect(() => {
    // Only auto-set price if user hasn't manually edited it
    if (isEditSessionSheetOpen && watchedClientIdForEditSession && watchedSessionTypeForEditSession && clients.length > 0 && !hasManuallyEditedEditPrice) {
      const client = clients.find(c => c.id === watchedClientIdForEditSession);
      if (client) {
        let newAmount: number | undefined = undefined;
        const isMember = client.isMember;
        if (watchedSessionTypeForEditSession === "In-Person") newAmount = isMember ? 75 : 95;
        else if (watchedSessionTypeForEditSession === "Online") newAmount = isMember ? 50 : 60;
        else if (watchedSessionTypeForEditSession === "Online Catchup") newAmount = 30;
        else if (watchedSessionTypeForEditSession === "Training") newAmount = isMember ? 50 : 60;
        setEditSessionValue("amount", newAmount);
      }
    }
  }, [isEditSessionSheetOpen, watchedClientIdForEditSession, watchedSessionTypeForEditSession, clients, setEditSessionValue, hasManuallyEditedEditPrice]);

  // Client editing useEffect
  useEffect(() => {
    if (clientToEdit) {
      resetEditClientForm({
        ownerFirstName: clientToEdit.ownerFirstName,
        ownerLastName: clientToEdit.ownerLastName,
        dogName: clientToEdit.dogName || '',
        contactEmail: clientToEdit.contactEmail,
        contactNumber: clientToEdit.contactNumber || '',
        fullAddress: clientToEdit.fullAddress || '',
        postcode: clientToEdit.postcode,
        isMember: clientToEdit.isMember || false,
        isActive: clientToEdit.isActive === undefined ? true : clientToEdit.isActive,
      });
    }
  }, [clientToEdit, resetEditClientForm]);

 useEffect(() => {
    if (isSessionSheetOpen && selectedSessionForSheet && selectedSessionForSheet.clientId) {
      setSessionSheetViewMode('sessionInfo');
      setBriefForSessionSheet(null);
      setQuestionnaireForSessionSheet(null);
      setIsLoadingClientForSession(true);
      getClientById(selectedSessionForSheet.clientId)
        .then(client => {
          if (client) {
            setClientForSelectedSession(client);
          } else {
            // Client not found, but don't show error toast - just log it
            console.warn(`Client not found for session ${selectedSessionForSheet.id}`);
            setClientForSelectedSession(null);
          }
          setIsLoadingClientForSession(false);
        })
        .catch(error => {
          console.error("Error fetching client for session:", error);
          setClientForSelectedSession(null);
          setIsLoadingClientForSession(false);
          // Only show toast for actual errors, not missing clients
          if (!error.message.includes('not found')) {
            toast({ title: "Error", description: "Could not load client details for this session.", variant: "destructive" });
          }
        });
    } else {
      setClientForSelectedSession(null);
    }
  }, [isSessionSheetOpen, selectedSessionForSheet]);


  const handleViewBriefForSession = async () => {
    if (!clientForSelectedSession || !clientForSelectedSession.behaviouralBriefId) return;
    setIsLoadingBriefForSessionSheet(true);
    try {
      const brief = await getBehaviouralBrief(clientForSelectedSession.behaviouralBriefId);
      setBriefForSessionSheet(brief);
      setSessionSheetViewMode('behaviouralBrief');
    } catch (error) {
      console.error("Error fetching brief:", error);
      toast({ title: "Error", description: "Could not load behavioural brief.", variant: "destructive" });
    } finally {
      setIsLoadingBriefForSessionSheet(false);
    }
  };

  const handleViewQuestionnaireForSession = async () => {
    if (!clientForSelectedSession || !clientForSelectedSession.behaviourQuestionnaireId) return;
    setIsLoadingQuestionnaireForSessionSheet(true);
    try {
      const questionnaire = await getBehaviourQuestionnaire(clientForSelectedSession.behaviourQuestionnaireId);
      setQuestionnaireForSessionSheet(questionnaire);
      setSessionSheetViewMode('behaviourQuestionnaire');
    } catch (error) {
      console.error("Error fetching questionnaire:", error);
      toast({ title: "Error", description: "Could not load behaviour questionnaire.", variant: "destructive" });
    } finally {
      setIsLoadingQuestionnaireForSessionSheet(false);
    }
  };


  useEffect(() => {
    const fetchData = async () => {
      // Supabase configuration is handled in the HTTP client
      try {
        setIsLoading(true);
        setError(null);
        const [supabaseSessionsResponse, supabaseClientsResponse] = await Promise.all([
          getSessions(),
          getClients()
        ]);

        // Extract the data arrays from the API responses
        const supabaseSessions = supabaseSessionsResponse.data || [];
        const supabaseClients = supabaseClientsResponse.data || [];

        setSessions(supabaseSessions.sort((a, b) => {
            // Parse YYYY-MM-DD format dates
            const dateA = parseISO(a.date);
            const dateB = parseISO(b.date);

            if (!isValid(dateA) && !isValid(dateB)) return 0;
            if (!isValid(dateA)) return 1;
            if (!isValid(dateB)) return -1;

            const dateTimeA = isValid(dateA) ? new Date(`${format(dateA, 'yyyy-MM-dd')}T${a.time || '00:00'}:00`) : new Date(0);
            const dateTimeB = isValid(dateB) ? new Date(`${format(dateB, 'yyyy-MM-dd')}T${b.time || '00:00'}:00`) : new Date(0);

            if (!isValid(dateTimeA) && !isValid(dateTimeB)) return 0;
            if (!isValid(dateTimeA)) return 1;
            if (!isValid(dateTimeB)) return -1;

            return dateTimeB.getTime() - dateTimeA.getTime();
        }));
        setClients(supabaseClients.sort((a, b) => {
          const nameA = formatFullNameAndDogName(a.ownerFirstName + " " + a.ownerLastName, a.dogName).toLowerCase();
          const nameB = formatFullNameAndDogName(b.ownerFirstName + " " + b.ownerLastName, b.dogName).toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        }));
      } catch (err) {
        console.error("Error fetching data:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load data.";
        setError(errorMessage);
        toast({ title: "Error Loading Data", description: errorMessage, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddSessionSubmit: SubmitHandler<SessionFormValues> = async (data) => {
    setIsSubmittingSheet(true);
    const selectedClient = clients.find(c => c.id === data.clientId);
    if (!selectedClient) {
      toast({ title: "Error", description: "Selected client not found.", variant: "destructive" });
      setIsSubmittingSheet(false);
      return;
    }

    const sessionData: Omit<Session, 'id' | 'createdAt'> = {
      clientId: data.clientId,
      // Removed denormalized fields - will be populated via JOIN
      date: data.date ? format(data.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      time: data.time || '09:00',
      sessionType: data.sessionType || 'General Session',
      amount: data.amount,
    };

    try {
      const newSession = await addSession(sessionData);
      if (newSession) {
        setSessions(prevSessions => [...prevSessions, newSession].sort((a, b) => {
        // Parse YYYY-MM-DD format dates
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);

        if (!isValid(dateA) && !isValid(dateB)) return 0;
        if (!isValid(dateA)) return 1;
        if (!isValid(dateB)) return -1;

        const dateTimeA = isValid(dateA) ? new Date(`${format(dateA, 'yyyy-MM-dd')}T${a.time || '00:00'}:00`) : new Date(0);
        const dateTimeB = isValid(dateB) ? new Date(`${format(dateB, 'yyyy-MM-dd')}T${b.time || '00:00'}:00`) : new Date(0);

        if (!isValid(dateTimeA) && !isValid(dateTimeB)) return 0;
        if (!isValid(dateTimeA)) return 1;
        if (!isValid(dateTimeB)) return -1;
        return dateTimeB.getTime() - dateTimeA.getTime();
        }));

        // Send webhook to Make.com for email automation
        try {
          const webhookData = {
            sessionId: newSession.id,
            clientId: selectedClient.id,
            clientName: `${selectedClient.ownerFirstName} ${selectedClient.ownerLastName}`,
            clientEmail: selectedClient.contactEmail,
            dogName: selectedClient.dogName,
            sessionType: data.sessionType,
            sessionDate: format(data.date, 'yyyy-MM-dd'),
            sessionTime: data.time,
            amount: data.amount,
            isMember: selectedClient.isMember,
            ownerFirstName: selectedClient.ownerFirstName,
            ownerLastName: selectedClient.ownerLastName,
          };

          console.log('🚀 Sending webhook to Make.com:', webhookData);

          const webhookResponse = await fetch('https://hook.eu1.make.com/lipggo8kcd8kwq2vp6j6mr3gnxbx12h7', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData),
          });

          console.log('📡 Webhook response status:', webhookResponse.status);

          if (webhookResponse.ok) {
            console.log('✅ Webhook sent successfully to Make.com');
          } else {
            console.error('❌ Webhook failed with status:', webhookResponse.status);
            const errorText = await webhookResponse.text();
            console.error('Webhook error response:', errorText);
          }
        } catch (webhookError) {
          console.error('❌ Webhook error (non-blocking):', webhookError);
          // Don't show error to user as this is a background process
        }
      }

      toast({
        title: "Session Added",
        description: `Session with ${formatFullNameAndDogName(sessionData.clientName || '', sessionData.dogName)} on ${format(data.date, 'PPP')} at ${data.time} has been scheduled.`,
      });
      setIsAddSessionSheetOpen(false);
      resetAddSessionForm();
    } catch (err) {
      console.error("Error adding session to Firestore:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to add session.";
      toast({ title: "Error Adding Session", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmittingSheet(false);
    }
  };

  const handleUpdateSession: SubmitHandler<SessionFormValues> = async (data) => {
    if (!sessionToEdit) return;
    setIsSubmittingSheet(true);

    const sessionDataToUpdate: Partial<Omit<Session, 'id' | 'createdAt' | 'clientName' | 'dogName'>> = {
      clientId: data.clientId,
      date: format(data.date, 'yyyy-MM-dd'),
      time: data.time,
      sessionType: data.sessionType,
      amount: data.amount,
    };

    const selectedClient = clients.find(c => c.id === data.clientId);

    try {
      await updateSession(sessionToEdit.id, sessionDataToUpdate);
      setSessions(prevSessions =>
        prevSessions.map(s =>
          s.id === sessionToEdit.id
            ? {
                ...s,
                ...sessionDataToUpdate,
                clientName: selectedClient ? `${selectedClient.ownerFirstName} ${selectedClient.ownerLastName}` : s.clientName,
                dogName: selectedClient ? selectedClient.dogName : s.dogName,
              }
            : s
        ).sort((a, b) => {
             // Parse YYYY-MM-DD format dates
             const dateA = parseISO(a.date);
             const dateB = parseISO(b.date);

             if (!isValid(dateA) && !isValid(dateB)) return 0;
             if (!isValid(dateA)) return 1;
             if (!isValid(dateB)) return -1;

             const dateTimeA = isValid(dateA) ? new Date(`${format(dateA, 'yyyy-MM-dd')}T${a.time || '00:00'}:00`) : new Date(0);
             const dateTimeB = isValid(dateB) ? new Date(`${format(dateB, 'yyyy-MM-dd')}T${b.time || '00:00'}:00`) : new Date(0);

             if (!isValid(dateTimeA) && !isValid(dateTimeB)) return 0;
             if (!isValid(dateTimeA)) return 1;
             if (!isValid(dateTimeB)) return -1;
             return dateTimeB.getTime() - dateTimeA.getTime();
        })
      );
      toast({ title: "Session Updated", description: `Session on ${format(data.date, 'PPP')} at ${data.time} updated.` });
      setIsEditSessionSheetOpen(false);
      setSessionToEdit(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update session.";
      toast({ title: "Error Updating Session", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmittingSheet(false);
    }
  };


  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return sessions;

    const searchLower = searchTerm.toLowerCase();
    return sessions.filter(session => {
      const clientName = session.clientName?.toLowerCase() || '';
      const dogName = session.dogName?.toLowerCase() || '';
      const sessionType = session.sessionType?.toLowerCase() || '';
      const date = session.date?.toLowerCase() || '';
      const time = session.time?.toLowerCase() || '';

      return clientName.includes(searchLower) ||
             dogName.includes(searchLower) ||
             sessionType.includes(searchLower) ||
             date.includes(searchLower) ||
             time.includes(searchLower);
    });
  }, [sessions, searchTerm]);

  const groupSessionsByYear = (sessionsToGroup: Session[]) => {
    const currentYear = new Date().getFullYear();

    return sessionsToGroup.reduce((acc, session) => {
      const sessionDate = parseISO(session.date);
      if (!isValid(sessionDate)) return acc;

      const year = sessionDate.getFullYear();
      const monthYear = format(sessionDate, 'MMMM yyyy');

      if (!acc[year]) {
        acc[year] = {};
      }
      if (!acc[year][monthYear]) {
        acc[year][monthYear] = [];
      }
      acc[year][monthYear].push(session);
      return acc;
    }, {} as Record<number, GroupedSessions>);
  };

  const groupSessionsByMonth = (sessionsToGroup: Session[]): GroupedSessions => {
    return sessionsToGroup.reduce((acc, session) => {
      // Parse YYYY-MM-DD format dates
      const sessionDate = parseISO(session.date);
      if (!isValid(sessionDate)) return acc;

      const monthYear = format(sessionDate, 'MMMM yyyy');
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(session);
      return acc;
    }, {} as GroupedSessions);
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSessionForSheet(session);
    setIsSessionSheetOpen(true);
  };

  const handleDeleteSessionRequest = (session: Session | null) => {
    if (!session) return;
    setSessionToDelete(session);
    setIsSessionDeleteDialogOpen(true);
  };

  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsSubmittingSheet(true);
    try {
      await deleteSession(sessionToDelete.id);
      setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionToDelete.id));
      toast({
        title: "Session Deleted",
        description: `Session with ${formatFullNameAndDogName(sessionToDelete.clientName || '', sessionToDelete.dogName)} on ${(() => {
          const sessionDate = parseISO(sessionToDelete.date);
          return isValid(sessionDate) ? format(sessionDate, 'dd/MM/yyyy') : '';
        })()} has been deleted.`,
      });
      if (selectedSessionForSheet && selectedSessionForSheet.id === sessionToDelete.id) {
        setSelectedSessionForSheet(null);
        setIsSessionSheetOpen(false);
      }
    } catch (err) {
      console.error("Error deleting session from Firestore:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete session.";
      toast({ title: "Error Deleting Session", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSessionDeleteDialogOpen(false);
      setSessionToDelete(null);
      setIsSubmittingSheet(false);
    }
  };

  // Handle client update
  const handleUpdateClient: SubmitHandler<ClientFormValues> = async (data) => {
    if (!clientToEdit) return;
    setIsSubmittingSheet(true);
    try {
      const updateData = {
        ownerFirstName: data.ownerFirstName,
        ownerLastName: data.ownerLastName,
        dogName: data.dogName || undefined,
        contactEmail: data.contactEmail || undefined,
        contactNumber: data.contactNumber || undefined,
        fullAddress: data.fullAddress || undefined,
        postcode: data.postcode || undefined,
        isMember: data.isMember || false,
        isActive: data.isActive === undefined ? true : data.isActive,
      };

      await updateClient(clientToEdit.id, updateData);

      // Update clients state
      setClients(prevClients =>
        prevClients.map(c =>
          c.id === clientToEdit.id
            ? { ...c, ...updateData }
            : c
        ).sort((a, b) => {
          const nameA = formatFullNameAndDogName(`${a.ownerFirstName} ${a.ownerLastName}`, a.dogName).toLowerCase();
          const nameB = formatFullNameAndDogName(`${b.ownerFirstName} ${b.ownerLastName}`, b.dogName).toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        })
      );

      // Update clientForSelectedSession if it's the same client
      if (clientForSelectedSession && clientForSelectedSession.id === clientToEdit.id) {
        setClientForSelectedSession({ ...clientForSelectedSession, ...updateData });
      }

      setIsEditClientSheetOpen(false);
      setClientToEdit(null);

      toast({
        title: "Client Updated",
        description: `${data.ownerFirstName} ${data.ownerLastName}'s details have been updated.`,
      });
    } catch (err) {
      console.error("Error updating client:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update client.";
      toast({ title: "Error Updating Client", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmittingSheet(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const groupedByYear = groupSessionsByYear(filteredSessions);
  const groupedSessions = groupSessionsByMonth(filteredSessions);

  // Separate current year and previous years
  const currentYearSessions = groupedByYear[currentYear] || {};
  const previousYears = Object.keys(groupedByYear)
    .map(Number)
    .filter(year => year < currentYear)
    .sort((a, b) => b - a); // Most recent previous years first

  const sortedMonthKeys = Object.keys(groupedSessions).sort((a, b) => {
    try {
      const dateA = parse(a, 'MMMM yyyy', new Date());
      const dateB = parse(b, 'MMMM yyyy', new Date());
      if (!isValid(dateA) || !isValid(dateB)) return 0;
      return dateB.getTime() - dateA.getTime();
    } catch (e) {
      console.error("Error parsing month keys for sorting:", a, b, e);
      return 0;
    }
  });

  // Filter current year months
  const currentYearMonths = sortedMonthKeys.filter(monthYear => {
    const date = parse(monthYear, 'MMMM yyyy', new Date());
    return isValid(date) && date.getFullYear() === currentYear;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sessions</h1>
          <div className="flex items-center gap-2">

            <Sheet open={isAddSessionSheetOpen} onOpenChange={setIsAddSessionSheetOpen}>
          <SheetTrigger asChild>
            <Button className="h-10 w-10 min-w-10 max-w-10 flex-shrink-0">
              <CalendarPlus className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col h-full sm:max-w-md bg-card">
            <SheetHeader>
              <SheetTitle>New Session</SheetTitle>
              <Separator />
            </SheetHeader>
            <ScrollArea className="flex-1">
             <div className="py-4 space-y-4">
              <form onSubmit={handleAddSessionSubmitHook(handleAddSessionSubmit)} id="addSessionFormInSheetSessions" className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="clientId-sessionpage">Client</Label>
                    <Controller
                        name="clientId"
                        control={addSessionFormControl}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmittingSheet || isLoading}>
                            <SelectTrigger id="clientId-sessionpage" className={cn("w-full focus:ring-0 focus:ring-offset-0", addSessionFormErrors.clientId && "border-destructive")}>
                                <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                <SelectLabel>Clients</SelectLabel>
                                {clients.map(client => (
                                    <SelectItem key={client.id} value={client.id}>
                                    {formatFullNameAndDogName(client.ownerFirstName + " " + client.ownerLastName, client.dogName)}
                                    </SelectItem>
                                ))}
                                </SelectGroup>
                            </SelectContent>
                            </Select>
                        )}
                        />
                    {addSessionFormErrors.clientId && <p className="text-xs text-destructive mt-1">{addSessionFormErrors.clientId.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="date-sessionpage">Booking Date</Label>
                    <div className={cn("flex justify-center w-full", addSessionFormErrors.date && "border-destructive border rounded-md")}>
                      <Controller
                        name="date"
                        control={addSessionFormControl}
                        render={({ field }) => (
                          <ShadCalendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            disabled={isSubmittingSheet}
                            id="date-sessionpage"
                            className={cn("!p-1", addSessionFormErrors.date && "border-destructive")}
                            classNames={{
                                day_selected: "bg-[#92351f] text-white focus:bg-[#92351f] focus:text-white !rounded-md",
                                day_today: "ring-2 ring-custom-ring-color rounded-md ring-offset-background ring-offset-1 text-custom-ring-color font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none",
                                day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-[#92351f] hover:text-white focus-visible:outline-none !rounded-md")
                            }}
                          />
                        )}
                      />
                    </div>
                    {addSessionFormErrors.date && <p className="text-xs text-destructive mt-1">{addSessionFormErrors.date.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="time-sessionpage-hours">Booking Time</Label>
                    <div className="flex gap-2 w-full">
                        <Controller
                            name="time"
                            control={addSessionFormControl}
                            render={({ field }) => (
                                <div className="flex-1">
                                <Select
                                    value={field.value?.split(':')[0] || ''}
                                    onValueChange={(hour) => {
                                    const currentMinute = field.value?.split(':')[1] || '00';
                                    field.onChange(`${hour}:${currentMinute}`);
                                    }}
                                    disabled={isSubmittingSheet}
                                >
                                    <SelectTrigger className="w-full focus:ring-0 focus:ring-offset-0">
                                    <SelectValue placeholder="HH" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {hourOptions.map(opt => <SelectItem key={`add-hr-s-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                </div>
                            )}
                        />
                        <Controller
                            name="time"
                            control={addSessionFormControl}
                            render={({ field }) => (
                                <div className="flex-1">
                                <Select
                                    value={field.value?.split(':')[1] || ''}
                                    onValueChange={(minute) => {
                                    const currentHour = field.value?.split(':')[0] || '00';
                                    field.onChange(`${currentHour}:${minute}`);
                                    }}
                                    disabled={isSubmittingSheet}
                                >
                                    <SelectTrigger className="w-full focus:ring-0 focus:ring-offset-0">
                                    <SelectValue placeholder="MM" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {minuteOptions.map(opt => <SelectItem key={`add-min-s-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                </div>
                            )}
                        />
                    </div>
                    {addSessionFormErrors.time && <p className="text-xs text-destructive mt-1">{addSessionFormErrors.time.message}</p>}
                </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sessionType-sessionpage">Session Type</Label>
                    <Controller
                      name="sessionType"
                      control={addSessionFormControl}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmittingSheet}>
                          <SelectTrigger id="sessionType-sessionpage" className={cn("w-full focus:ring-0 focus:ring-offset-0", addSessionFormErrors.sessionType ? "border-destructive" : "")}>
                            <SelectValue placeholder="Select session type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Session Types</SelectLabel>
                              {sessionTypeOptions.map(type => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {addSessionFormErrors.sessionType && <p className="text-xs text-destructive mt-1">{addSessionFormErrors.sessionType.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="amount-sessionpage">Quote</Label>
                    <Controller name="amount" control={addSessionFormControl}
                        render={({ field }) => (
                        <Input
                            id="amount-sessionpage"
                            type="number"
                            placeholder="e.g. 75.50"
                            step="0.01"
                            {...field}
                            value={field.value === undefined ? '' : String(field.value)}
                            onChange={e => {
                              field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value));
                              // Mark as manually edited when user types
                              setHasManuallyEditedAddPrice(true);
                            }}
                            className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addSessionFormErrors.amount && "border-destructive")}
                            disabled={isSubmittingSheet}
                        />
                        )}
                    />
                    {addSessionFormErrors.amount && <p className="text-xs text-destructive mt-1">{addSessionFormErrors.amount.message}</p>}
                  </div>
              </form>
              </div>
            </ScrollArea>
            <SheetFooter className="border-t pt-4">
              <Button type="submit" form="addSessionFormInSheetSessions" className="w-full" disabled={isSubmittingSheet}>
                {isSubmittingSheet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
                Save Session
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions by client, dog name, session type, date, or time..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading sessions...</p>
        </div>
      )}
      {!isLoading && error && (
        <div className="text-destructive text-center py-10">
          <p>Error loading sessions: {error}</p>
          <p>Please ensure you are online and try again.</p>
        </div>
      )}
      {!isLoading && !error && sortedMonthKeys.length === 0 && (
        <p className="text-muted-foreground text-center py-10">No sessions scheduled yet. Add a new session to get started.</p>
      )}
      {!isLoading && !error && sortedMonthKeys.length > 0 && (
        <div className="w-full space-y-2">
          {/* Current Year Sessions */}
          {currentYearMonths.length > 0 && (
            <Accordion type="multiple" className="w-full space-y-0" defaultValue={[`year-${currentYear}`]}>
              <AccordionItem value={`year-${currentYear}`} className="bg-card shadow-sm rounded-md mb-2">
                <AccordionTrigger className="text-xl hover:no-underline px-4 py-4 font-bold">
                  {currentYear} ({Object.values(currentYearSessions).reduce((sum, sessions) => sum + sessions.length, 0)} sessions)
                </AccordionTrigger>
                <AccordionContent className="px-0">
                  <Accordion type="multiple" className="w-full space-y-0 px-2" defaultValue={currentYearMonths.length > 0 ? [currentYearMonths[0]] : []}>
                    {currentYearMonths.map((monthYear) => (
                      <AccordionItem value={monthYear} key={monthYear} className="border-b border-border last:border-b-0">
                        <AccordionTrigger className="text-lg hover:no-underline px-4 py-3 font-semibold hover:bg-muted/50">
                          {monthYear} ({groupedSessions[monthYear].length} sessions)
                        </AccordionTrigger>
                  <AccordionContent className="px-0">
                    <div className="space-y-0">
                      {groupedSessions[monthYear]
                        .sort((a, b) => {
                            // Parse YYYY-MM-DD format dates - REVERSE ORDER (latest first)
                            const dateA = parseISO(a.date);
                            const dateB = parseISO(b.date);

                            if (!isValid(dateA) || !isValid(dateB)) return 0;
                            const dayDiff = dateB.getDate() - dateA.getDate(); // Reversed
                            if (dayDiff !== 0) return dayDiff;

                            try {
                                const timeA = parse(a.time, 'HH:mm', new Date());
                                const timeB = parse(b.time, 'HH:mm', new Date());
                                return timeB.getTime() - timeA.getTime(); // Reversed
                            } catch { return 0; }
                        })
                        .map(session => {
                          const displayName = session.sessionType === 'Group'
                            ? 'Group Session'
                            : session.sessionType === 'RMR Live'
                            ? 'RMR Live'
                            : formatFullNameAndDogName(session.clientName, session.dogName);
                          return (
                          <div
                            key={session.id}
                            className="py-3 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSessionClick(session)}
                          >
                            <div className="flex justify-between items-center px-4">
                               <div className="flex items-center gap-3 flex-grow">
                                 <Image
                                    src="https://iili.io/34300ox.md.jpg"
                                    alt="RMR Logo"
                                    width={32}
                                    height={32}
                                    className="rounded-md"
                                    data-ai-hint="company logo"
                                  />
                                <div>
                                   <h3 className="font-semibold text-sm">{displayName}</h3>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        <span className="flex items-center">
                                          {(() => {
                                            const sessionDate = parseISO(session.date);
                                            return isValid(sessionDate) ? format(sessionDate, 'dd/MM/yyyy') : session.date;
                                          })()}
                                        </span>
                                        {session.time && <span className="sm:inline">•</span>}
                                        {session.time && (
                                            <span className="flex items-center">
                                              {formatTimeWithoutSeconds(session.time)}
                                            </span>
                                        )}
                                        {session.amount !== undefined && <span className="sm:inline">•</span>}
                                        {session.amount !== undefined && (
                                            <span className="flex items-center">
                                                £{session.amount.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className={cn("mt-1 whitespace-nowrap hidden sm:inline-flex")}>
                                    {session.sessionType}
                                </Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" className="h-8 w-8 p-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSessionClick(session) }}>
                                      <Info className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        setSessionToEdit(session);
                                        setIsEditSessionSheetOpen(true);
                                        setIsSessionSheetOpen(false);
                                    }}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Session
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:bg-destructive focus:text-destructive-foreground data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground"
                                      onClick={(e) => { e.stopPropagation(); handleDeleteSessionRequest(session); }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Session
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        );
                        })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Previous Years Sessions */}
          {previousYears.map(year => {
            const yearSessions = groupedByYear[year];
            const totalYearSessions = Object.values(yearSessions).reduce((sum, sessions) => sum + sessions.length, 0);
            const yearMonths = Object.keys(yearSessions).sort((a, b) => {
              const dateA = parse(a, 'MMMM yyyy', new Date());
              const dateB = parse(b, 'MMMM yyyy', new Date());
              if (!isValid(dateA) || !isValid(dateB)) return 0;
              return dateB.getTime() - dateA.getTime();
            });

            return (
              <Accordion key={year} type="multiple" className="w-full space-y-0">
                <AccordionItem value={`year-${year}`} className="bg-card shadow-sm rounded-md mb-2">
                  <AccordionTrigger className="text-xl hover:no-underline px-4 py-4 font-bold">
                    {year} ({totalYearSessions} sessions)
                  </AccordionTrigger>
                  <AccordionContent className="px-0">
                    <Accordion type="multiple" className="w-full space-y-0 px-2">
                      {yearMonths.map((monthYear) => (
                        <AccordionItem value={monthYear} key={monthYear} className="border-b border-border last:border-b-0">
                          <AccordionTrigger className="text-lg hover:no-underline px-4 py-3 font-semibold hover:bg-muted/50">
                            {monthYear} ({yearSessions[monthYear].length} sessions)
                          </AccordionTrigger>
                          <AccordionContent className="px-0">
                            <div className="space-y-0">
                              {yearSessions[monthYear]
                                .sort((a, b) => {
                                    // Parse YYYY-MM-DD format dates - REVERSE ORDER (latest first)
                                    const dateA = parseISO(a.date);
                                    const dateB = parseISO(b.date);

                                    if (!isValid(dateA) || !isValid(dateB)) return 0;
                                    const dayDiff = dateB.getDate() - dateA.getDate(); // Reversed
                                    if (dayDiff !== 0) return dayDiff;

                                    try {
                                        const timeA = parse(a.time, 'HH:mm', new Date());
                                        const timeB = parse(b.time, 'HH:mm', new Date());
                                        return timeB.getTime() - timeA.getTime(); // Reversed
                                    } catch { return 0; }
                                })
                                .map(session => {
                                  const displayName = session.sessionType === 'Group'
                                    ? 'Group Session'
                                    : session.sessionType === 'RMR Live'
                                    ? 'RMR Live'
                                    : formatFullNameAndDogName(session.clientName, session.dogName);
                                  return (
                                  <div
                                    key={session.id}
                                    className="py-3 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleSessionClick(session)}
                                  >
                                    <div className="flex justify-between items-center px-4">
                                       <div className="flex items-center gap-3 flex-grow">
                                         <Image
                                            src="https://iili.io/34300ox.md.jpg"
                                            alt="RMR Logo"
                                            width={32}
                                            height={32}
                                            className="rounded-md"
                                            data-ai-hint="company logo"
                                          />
                                        <div>
                                           <h3 className="font-semibold text-sm">{displayName}</h3>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                <span className="flex items-center">
                                                  {(() => {
                                                    const sessionDate = parseISO(session.date);
                                                    return isValid(sessionDate) ? format(sessionDate, 'dd/MM/yyyy') : session.date;
                                                  })()}
                                                </span>
                                                {session.time && <span className="sm:inline">•</span>}
                                                {session.time && (
                                                    <span className="flex items-center">
                                                      {formatTimeWithoutSeconds(session.time)}
                                                    </span>
                                                )}
                                                {session.amount !== undefined && <span className="sm:inline">•</span>}
                                                {session.amount !== undefined && (
                                                    <span className="flex items-center">
                                                        £{session.amount.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="default" className={cn("mt-1 whitespace-nowrap hidden sm:inline-flex")}>
                                            {session.sessionType}
                                        </Badge>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" className="h-8 w-8 p-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                                              <span className="sr-only">Open menu</span>
                                              <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSessionClick(session) }}>
                                              <Info className="mr-2 h-4 w-4" />
                                              View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation();
                                                setSessionToEdit(session);
                                                setIsEditSessionSheetOpen(true);
                                                setIsSessionSheetOpen(false);
                                            }}>
                                              <Edit className="mr-2 h-4 w-4" />
                                              Edit Session
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              className="text-destructive focus:bg-destructive focus:text-destructive-foreground data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground"
                                              onClick={(e) => { e.stopPropagation(); handleDeleteSessionRequest(session); }}
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Delete Session
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  </div>
                                );
                                })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          })}
        </div>
      )}

      <Sheet open={isSessionSheetOpen} onOpenChange={(isOpen) => {setIsSessionSheetOpen(isOpen); if(!isOpen) {setSelectedSessionForSheet(null); setClientForSelectedSession(null); setSessionSheetViewMode('sessionInfo'); }}}>
        <SheetContent className="flex flex-col h-full sm:max-w-lg bg-card">
           <SheetHeader>
                <SheetTitle>Session Details</SheetTitle>
                <Separator/>
            </SheetHeader>
            <ScrollArea className="flex-1">
              <div className="py-4">
                {selectedSessionForSheet && sessionSheetViewMode === 'sessionInfo' && (
                    <>
                        <DetailRow label="Client:" value={
                          selectedSessionForSheet.sessionType === 'Group'
                            ? 'Group Session'
                            : selectedSessionForSheet.sessionType === 'RMR Live'
                            ? 'RMR Live'
                            : formatFullNameAndDogName(selectedSessionForSheet.clientName, selectedSessionForSheet.dogName)
                        } />
                        <DetailRow label="Date:" value={(() => {
                          const sessionDate = parseISO(selectedSessionForSheet.date);
                          return isValid(sessionDate) ? format(sessionDate, 'dd/MM/yyyy') : 'Invalid Date';
                        })()} />
                        <DetailRow label="Time:" value={formatTimeWithoutSeconds(selectedSessionForSheet.time)} />
                        <DetailRow label="Session Type:" value={selectedSessionForSheet.sessionType} />
                        {selectedSessionForSheet.amount !== undefined && <DetailRow label="Quote:" value={`£${selectedSessionForSheet.amount.toFixed(2)}`} />}

                        {isLoadingClientForSession && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin"/> <span className="ml-2">Loading client info...</span></div>}

                        {clientForSelectedSession && (
                            <div className="mt-6 space-y-2">
                            {clientForSelectedSession.behaviouralBriefId && (
                                <Button onClick={handleViewBriefForSession} className="w-full" variant="outline" disabled={isLoadingBriefForSessionSheet}>
                                {isLoadingBriefForSessionSheet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Info className="mr-2 h-4 w-4" />} View Behavioural Brief
                                </Button>
                            )}
                            {clientForSelectedSession.behaviourQuestionnaireId && (
                                <Button onClick={handleViewQuestionnaireForSession} className="w-full" variant="outline" disabled={isLoadingQuestionnaireForSessionSheet}>
                                {isLoadingQuestionnaireForSessionSheet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TagIcon className="mr-2 h-4 w-4" />} View Behaviour Questionnaire
                                </Button>
                            )}
                            </div>
                        )}
                    </>
                )}
                {sessionSheetViewMode === 'behaviouralBrief' && briefForSessionSheet && (
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <Button variant="ghost" size="sm" onClick={() => setSessionSheetViewMode('sessionInfo')} className="px-2">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Session Info
                        </Button>
                        <h4 className="text-lg font-semibold">Behavioural Brief</h4>
                        <div className="w-36"></div> {/* Spacer */}
                    </div>
                    <Separator className="mb-3" />
                    <DetailRow label="Dog Name:" value={briefForSessionSheet.dogName} />
                    <DetailRow label="Dog Sex:" value={briefForSessionSheet.dogSex} />
                    <DetailRow label="Dog Breed:" value={briefForSessionSheet.dogBreed} />
                    <DetailRow label="Life & Help Needed:" value={briefForSessionSheet.lifeWithDogAndHelpNeeded} />
                    <DetailRow label="Best Outcome:" value={briefForSessionSheet.bestOutcome} />
                    <DetailRow label="Ideal Sessions:" value={briefForSessionSheet.idealSessionTypes?.join(', ')} />
                    {briefForSessionSheet.submissionDate && <DetailRow label="Submitted:" value={isValid(parseISO(briefForSessionSheet.submissionDate)) ? format(parseISO(briefForSessionSheet.submissionDate), 'PPP p') : briefForSessionSheet.submissionDate} />}
                </div>
                )}
                {isLoadingBriefForSessionSheet && sessionSheetViewMode === 'behaviouralBrief' && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}

                {sessionSheetViewMode === 'behaviourQuestionnaire' && questionnaireForSessionSheet && (
                <div>
                    <div className="flex justify-between items-center mb-3">
                         <Button variant="ghost" size="sm" onClick={() => setSessionSheetViewMode('sessionInfo')} className="px-2">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Session Info
                        </Button>
                        <h4 className="text-lg font-semibold">Behaviour Questionnaire</h4>
                        <div className="w-36"></div> {/* Spacer */}
                    </div>
                    <Separator className="mb-3" />
                    <DetailRow label="Dog Name:" value={questionnaireForSessionSheet.dogName} />
                    <DetailRow label="Dog Age:" value={questionnaireForSessionSheet.dogAge} />
                    <DetailRow label="Dog Sex:" value={questionnaireForSessionSheet.dogSex} />
                    <DetailRow label="Dog Breed:" value={questionnaireForSessionSheet.dogBreed} />
                    <DetailRow label="Neutered/Spayed:" value={questionnaireForSessionSheet.neuteredSpayedDetails} />
                    <DetailRow label="Main Problem:" value={questionnaireForSessionSheet.mainProblem} />
                    <DetailRow label="Time for Training:" value={questionnaireForSessionSheet.timeDedicatedToTraining} />
                    {questionnaireForSessionSheet.submissionDate && <DetailRow label="Submitted:" value={isValid(parseISO(questionnaireForSessionSheet.submissionDate)) ? format(parseISO(questionnaireForSessionSheet.submissionDate), 'PPP p') : questionnaireForSessionSheet.submissionDate} />}
                </div>
                )}
                {isLoadingQuestionnaireForSessionSheet && sessionSheetViewMode === 'behaviourQuestionnaire' && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}

              </div>
            </ScrollArea>
            <SheetFooter className="border-t pt-4">
                <div className="flex w-full gap-2">
                    {/* Edit Client Button - only show for non-group sessions */}
                    {selectedSessionForSheet &&
                     selectedSessionForSheet.sessionType !== 'Group' &&
                     selectedSessionForSheet.sessionType !== 'RMR Live' &&
                     clientForSelectedSession && (
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                                setClientToEdit(clientForSelectedSession);
                                setIsEditClientSheetOpen(true);
                                setIsSessionSheetOpen(false);
                            }}
                        >
                            <User className="mr-2 h-4 w-4" />
                            Edit Client
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                            if(selectedSessionForSheet) {
                                setSessionToEdit(selectedSessionForSheet);
                                setIsEditSessionSheetOpen(true);
                                setIsSessionSheetOpen(false);
                            }
                        }}
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Session
                    </Button>
                    <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => selectedSessionForSheet && handleDeleteSessionRequest(selectedSessionForSheet)}
                        disabled={isSubmittingSheet && sessionToDelete !== null && sessionToDelete.id === selectedSessionForSheet?.id}
                    >
                        {isSubmittingSheet && sessionToDelete?.id === selectedSessionForSheet?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete Session
                    </Button>
                </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>

      <Sheet open={isEditSessionSheetOpen} onOpenChange={setIsEditSessionSheetOpen}>
        <SheetContent className="flex flex-col h-full sm:max-w-md bg-card">
          <SheetHeader>
            <SheetTitle>Edit Session</SheetTitle>
            <Separator />
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="py-4 space-y-4">
                <form onSubmit={handleEditSessionSubmitHook(handleUpdateSession)} id="editSessionFormInSheetSessions" className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="edit-clientId-sessions">Client</Label>
                    <Controller name="clientId" control={editSessionFormControl}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmittingSheet || isLoading}>
                        <SelectTrigger id="edit-clientId-sessions" className={cn("w-full focus:ring-0 focus:ring-offset-0", editSessionFormErrors.clientId && "border-destructive")}>
                            <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent><SelectGroup><SelectLabel>Clients</SelectLabel>
                            {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                                {formatFullNameAndDogName(client.ownerFirstName + " " + client.ownerLastName, client.dogName)}
                            </SelectItem>
                            ))}
                        </SelectGroup></SelectContent>
                        </Select>
                    )}
                    />
                    {editSessionFormErrors.clientId && <p className="text-xs text-destructive mt-1">{editSessionFormErrors.clientId.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="edit-date-sessions">Booking Date</Label>
                    <div className={cn("flex justify-center w-full", editSessionFormErrors.date && "border-destructive border rounded-md")}>
                    <Controller name="date" control={editSessionFormControl}
                        render={({ field }) => (
                        <ShadCalendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={isSubmittingSheet} id="edit-date-sessions"
                          className={cn("!p-1", editSessionFormErrors.date && "border-destructive")}
                          classNames={{
                            day_selected: "bg-[#92351f] text-white focus:bg-[#92351f] focus:text-white !rounded-md",
                            day_today: "ring-2 ring-custom-ring-color rounded-md ring-offset-background ring-offset-1 text-custom-ring-color font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none",
                            day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-[#92351f] hover:text-white focus-visible:outline-none !rounded-md")
                          }} />
                        )} />
                    </div>
                    {editSessionFormErrors.date && <p className="text-xs text-destructive mt-1">{editSessionFormErrors.date.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="edit-time-sessions-hours">Booking Time</Label>
                     <div className="flex gap-2 w-full">
                        <Controller
                            name="time"
                            control={editSessionFormControl}
                            render={({ field }) => (
                                <div className="flex-1">
                                <Select
                                    value={field.value?.split(':')[0] || ''}
                                    onValueChange={(hour) => {
                                    const currentMinute = field.value?.split(':')[1] || '00';
                                    field.onChange(`${hour}:${currentMinute}`);
                                    }}
                                    disabled={isSubmittingSheet}
                                >
                                    <SelectTrigger className="w-full focus:ring-0 focus:ring-offset-0">
                                    <SelectValue placeholder="HH" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {hourOptions.map(opt => <SelectItem key={`edit-hr-s-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                </div>
                            )}
                        />
                        <Controller
                            name="time"
                            control={editSessionFormControl}
                            render={({ field }) => (
                                <div className="flex-1">
                                <Select
                                    value={field.value?.split(':')[1] || ''}
                                    onValueChange={(minute) => {
                                    const currentHour = field.value?.split(':')[0] || '00';
                                    field.onChange(`${currentHour}:${minute}`);
                                    }}
                                    disabled={isSubmittingSheet}
                                >
                                    <SelectTrigger className="w-full focus:ring-0 focus:ring-offset-0">
                                    <SelectValue placeholder="MM" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {minuteOptions.map(opt => <SelectItem key={`edit-min-s-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                </div>
                            )}
                        />
                    </div>
                    {editSessionFormErrors.time && <p className="text-xs text-destructive mt-1">{editSessionFormErrors.time.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="edit-sessionType-sessions">Session Type</Label>
                    <Controller name="sessionType" control={editSessionFormControl}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmittingSheet}>
                        <SelectTrigger id="edit-sessionType-sessions" className={cn("w-full focus:ring-0 focus:ring-offset-0",editSessionFormErrors.sessionType && "border-destructive")}>
                            <SelectValue placeholder="Select session type" />
                        </SelectTrigger>
                        <SelectContent><SelectGroup><SelectLabel>Session Types</SelectLabel>
                            {sessionTypeOptions.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                        </SelectGroup></SelectContent>
                        </Select>
                    )}
                    />
                    {editSessionFormErrors.sessionType && <p className="text-xs text-destructive mt-1">{editSessionFormErrors.sessionType.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="edit-amount-sessions">Quote</Label>
                    <Controller name="amount" control={editSessionFormControl}
                    render={({ field }) => (
                        <Input
                            id="edit-amount-sessions"
                            type="number"
                            placeholder="e.g. 75.50"
                            step="0.01"
                            {...field}
                            value={field.value === undefined ? '' : String(field.value)}
                            onChange={e => {
                              field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value));
                              // Mark as manually edited when user types
                              setHasManuallyEditedEditPrice(true);
                            }}
                            className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editSessionFormErrors.amount && "border-destructive")}
                            disabled={isSubmittingSheet}
                        />
                    )} />
                    {editSessionFormErrors.amount && <p className="text-xs text-destructive mt-1">{editSessionFormErrors.amount.message}</p>}
                  </div>
                </form>
            </div>
          </ScrollArea>
          <SheetFooter className="border-t pt-4">
            <Button type="submit" form="editSessionFormInSheetSessions" className="w-full" disabled={isSubmittingSheet}>
              {isSubmittingSheet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Client Sheet */}
      <Sheet open={isEditClientSheetOpen} onOpenChange={(isOpen) => {setIsEditClientSheetOpen(isOpen); if(!isOpen) setClientToEdit(null); }}>
        <SheetContent className="flex flex-col h-full sm:max-w-md bg-card">
          <SheetHeader>
            <SheetTitle>Edit Client</SheetTitle>
            <Separator />
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="py-4 space-y-4">
            {clientToEdit && (
              <form onSubmit={handleEditClientSubmitHook(handleUpdateClient)} id="editClientFormInSheetSessions" className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-ownerFirstName-sessions">First Name</Label>
                  <Input
                    id="edit-ownerFirstName-sessions"
                    {...editClientFormRegister("ownerFirstName")}
                    className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientFormErrors.ownerFirstName ? "border-destructive" : "")}
                    disabled={isSubmittingSheet}
                  />
                  {editClientFormErrors.ownerFirstName && <p className="text-xs text-destructive mt-1">{editClientFormErrors.ownerFirstName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-ownerLastName-sessions">Last Name</Label>
                  <Input
                    id="edit-ownerLastName-sessions"
                    {...editClientFormRegister("ownerLastName")}
                    className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientFormErrors.ownerLastName ? "border-destructive" : "")}
                    disabled={isSubmittingSheet}
                  />
                  {editClientFormErrors.ownerLastName && <p className="text-xs text-destructive mt-1">{editClientFormErrors.ownerLastName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-dogName-sessions">Dog's Name</Label>
                  <Input
                    id="edit-dogName-sessions"
                    {...editClientFormRegister("dogName")}
                    className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientFormErrors.dogName ? "border-destructive" : "")}
                    disabled={isSubmittingSheet}
                  />
                  {editClientFormErrors.dogName && <p className="text-xs text-destructive mt-1">{editClientFormErrors.dogName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-contactEmail-sessions">Email</Label>
                  <Input
                    id="edit-contactEmail-sessions"
                    type="email"
                    {...editClientFormRegister("contactEmail")}
                    className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientFormErrors.contactEmail ? "border-destructive" : "")}
                    disabled={isSubmittingSheet}
                  />
                  {editClientFormErrors.contactEmail && <p className="text-xs text-destructive mt-1">{editClientFormErrors.contactEmail.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-contactNumber-sessions">Phone Number</Label>
                  <Input
                    id="edit-contactNumber-sessions"
                    type="tel"
                    {...editClientFormRegister("contactNumber")}
                    className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientFormErrors.contactNumber ? "border-destructive" : "")}
                    disabled={isSubmittingSheet}
                  />
                  {editClientFormErrors.contactNumber && <p className="text-xs text-destructive mt-1">{editClientFormErrors.contactNumber.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-fullAddress-sessions">Address</Label>
                  <Textarea
                    id="edit-fullAddress-sessions"
                    {...editClientFormRegister("fullAddress")}
                    className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientFormErrors.fullAddress ? "border-destructive" : "")}
                    disabled={isSubmittingSheet}
                    rows={3}
                  />
                  {editClientFormErrors.fullAddress && <p className="text-xs text-destructive mt-1">{editClientFormErrors.fullAddress.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-postcode-sessions">Postcode</Label>
                  <Input
                    id="edit-postcode-sessions"
                    {...editClientFormRegister("postcode")}
                    className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editClientFormErrors.postcode ? "border-destructive" : "")}
                    disabled={isSubmittingSheet}
                  />
                  {editClientFormErrors.postcode && <p className="text-xs text-destructive mt-1">{editClientFormErrors.postcode.message}</p>}
                </div>
                <div className="flex items-center space-x-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <Controller
                      name="isMember"
                      control={editClientFormControl}
                      render={({ field }) => (
                        <Checkbox
                          id="edit-isMember-sessions"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmittingSheet}
                          className="focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      )}
                    />
                    <Label htmlFor="edit-isMember-sessions" className="text-sm font-normal">Membership</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Controller
                      name="isActive"
                      control={editClientFormControl}
                      render={({ field }) => (
                        <Checkbox
                          id="edit-isActive-sessions"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmittingSheet}
                          className="focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      )}
                    />
                    <Label htmlFor="edit-isActive-sessions" className="text-sm font-normal">Active</Label>
                  </div>
                </div>
              </form>
              )}
            </div>
          </ScrollArea>
          <SheetFooter className="border-t pt-4">
            <Button
              type="submit"
              form="editClientFormInSheetSessions"
              className="w-full focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isSubmittingSheet}
            >
              {isSubmittingSheet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isSessionDeleteDialogOpen} onOpenChange={setIsSessionDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the session
              with {sessionToDelete ? (
                sessionToDelete.sessionType === 'Group'
                  ? 'Group Session'
                  : sessionToDelete.sessionType === 'RMR Live'
                  ? 'RMR Live'
                  : formatFullNameAndDogName(sessionToDelete.clientName || '', sessionToDelete.dogName)
              ) : ''} on {sessionToDelete && isValid(parseISO(sessionToDelete.date)) ? format(parseISO(sessionToDelete.date), 'dd/MM/yyyy') : ''}.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setSessionToDelete(null); setIsSessionDeleteDialogOpen(false); }} disabled={isSubmittingSheet}>
              <X className="h-4 w-4" />
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteSession} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmittingSheet}>
              {isSubmittingSheet && sessionToDelete ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
