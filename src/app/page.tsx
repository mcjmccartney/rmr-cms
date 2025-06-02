
"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { buttonVariants } from "@/components/ui/button";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  CalendarDays as CalendarIconLucide,
  Clock,
  DollarSign,
  Edit,
  Trash2,
  Tag as TagIcon,
  Info,
  Users,
  ArrowLeft,
  UserPlus,
  CalendarPlus,
  FileQuestion,
  SquareCheck
} from 'lucide-react';
import { DayPicker, type DateFormatter, type DayProps } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import type { Session, Client, EditableClientData, BehaviouralBrief, BehaviourQuestionnaire } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  format,
  parseISO,
  isValid,
  startOfDay,
  isSameDay,
  startOfMonth,
  addMonths,
  subMonths,
  isToday,
  isAfter,
  compareAsc,
  parse,
  isWithinInterval,
  addDays,
  subDays,
  eachDayOfInterval,
  isBefore,
  endOfWeek,
  startOfWeek,
  endOfMonth,
} from 'date-fns';
import {
  getClients,
  getClientById,
  getSessions,
  addSession,
  deleteSession,
  addClient,
  updateSession,
  updateClient,
  getBehaviouralBrief,
  getBehaviourQuestionnaire,
} from '@/lib/supabaseService';
import { cn, formatFullNameAndDogName, formatTimeWithoutSeconds } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as ShadCalendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';


const internalClientFormSchema = z.object({
  ownerFirstName: z.string().min(1, { message: "First name is required." }),
  ownerLastName: z.string().min(1, { message: "Last name is required." }),
  contactEmail: z.string().email({ message: "Invalid email address." }),
  contactNumber: z.string().min(5, { message: "Contact number is required." }),
  fullAddress: z.string().optional(),
  postcode: z.string().min(3, { message: "Postcode is required." }),
  dogName: z.string().optional(),
  isMember: z.boolean().optional(),
  isActive: z.boolean().optional(),
  submissionDate: z.string().optional(),
});
type InternalClientFormValuesDash = z.infer<typeof internalClientFormSchema>;

const sessionFormSchema = z.object({
  clientId: z.string().min(1, { message: 'Client selection is required.' }),
  date: z.date({ required_error: 'Booking Date is required.' }),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Invalid time format. Use HH:MM (24-hour).',
  }),
  sessionType: z.string().min(1, { message: 'Session type is required.' }),
  amount: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : parseFloat(String(val))),
    z.number().nonnegative({ message: 'Quote must be a positive number.' }).optional()
  ),
});
type SessionFormValues = z.infer<typeof sessionFormSchema>;

const sessionTypeOptions = [
  'In-Person',
  'Online',
  'Training',
  'Online Catchup',
  'Group',
  'Phone Call',
  'RMR Live',
  'Coaching',
];

const hourOptions = Array.from({ length: 24 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: String(i).padStart(2, '0') }));
const minuteOptions = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => ({ value: m, label: m }));


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


export default function HomePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  const [isAddClientSheetOpen, setIsAddClientSheetOpen] = useState(false);
  const [isAddSessionSheetOpen, setIsAddSessionSheetOpen] = useState(false);
  const [isSubmittingSheet, setIsSubmittingSheet] = useState<boolean>(false);

  const [isEditSessionSheetOpen, setIsEditSessionSheetOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  const [isSessionSheetOpen, setIsSessionSheetOpen] = useState(false);
  const [selectedSessionForSheet, setSelectedSessionForSheet] = useState<Session | null>(null);

  const [clientForSelectedSession, setClientForSelectedSession] = useState<Client | null>(null);
  const [isLoadingClientForSession, setIsLoadingClientForSession] = useState<boolean>(false);
  const [sessionSheetViewMode, setSessionSheetViewMode] = useState<'sessionInfo' | 'behaviouralBrief' | 'behaviourQuestionnaire'>('sessionInfo');
  const [briefForSessionSheet, setBriefForSessionSheet] = useState<BehaviouralBrief | null>(null);
  const [isLoadingBriefForSessionSheet, setIsLoadingBriefForSessionSheet] = useState<boolean>(false);
  const [questionnaireForSessionSheet, setQuestionnaireForSessionSheet] = useState<BehaviourQuestionnaire | null>(null);
  const [isLoadingQuestionnaireForSessionSheet, setIsLoadingQuestionnaireForSessionSheet] = useState<boolean>(false);

  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [isDeleteSessionDialogOpen, setIsDeleteSessionDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');


  const addClientForm = useForm<InternalClientFormValuesDash>({
    resolver: zodResolver(internalClientFormSchema),
    defaultValues: {
      ownerFirstName: '',
      ownerLastName: '',
      contactEmail: '',
      contactNumber: '',
      fullAddress: '',
      postcode: '',
      dogName: '',
      isMember: false,
      isActive: true,
      submissionDate: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    }
  });

  useEffect(() => {
    if (isAddClientSheetOpen) {
      addClientForm.reset({
        ownerFirstName: '',
        ownerLastName: '',
        contactEmail: '',
        contactNumber: '',
        fullAddress: '',
        postcode: '',
        dogName: '',
        isMember: false,
        isActive: true,
        submissionDate: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      });
    }
  }, [isAddClientSheetOpen, addClientForm]);

  const {
    watch: watchAddSessionForm,
    setValue: setAddSessionValue,
    control: addSessionFormControl,
    reset: resetAddSessionForm,
    formState: { errors: addSessionFormErrors },
    handleSubmit: handleAddSessionSubmitHook
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      clientId: '',
      date: undefined,
      time: '',
      sessionType: '',
      amount: undefined,
    }
  });

 useEffect(() => {
    if (isAddSessionSheetOpen) {
       setAddSessionValue("date", new Date());
       setAddSessionValue("time", format(new Date(), "HH:mm"));
    }
  }, [isAddSessionSheetOpen, setAddSessionValue]);

  const watchedClientIdForAddSession = watchAddSessionForm("clientId");
  const watchedSessionTypeForAddSession = watchAddSessionForm("sessionType");

  useEffect(() => {
    if (isAddSessionSheetOpen && watchedClientIdForAddSession && watchedSessionTypeForAddSession && clients.length > 0) {
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
  }, [isAddSessionSheetOpen, watchedClientIdForAddSession, watchedSessionTypeForAddSession, clients, setAddSessionValue]);

  const {
    watch: watchEditSessionForm,
    setValue: setEditSessionValue,
    control: editSessionFormControl,
    reset: resetEditSessionForm,
    formState: { errors: editSessionFormErrors },
    handleSubmit: handleEditSessionSubmitHook,
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
        clientId: '',
        date: undefined,
        time: '',
        sessionType: '',
        amount: undefined,
    }
  });

  useEffect(() => {
    if (isEditSessionSheetOpen && sessionToEdit) {
      resetEditSessionForm({
        clientId: sessionToEdit.clientId,
        date: parseISO(sessionToEdit.date),
        time: sessionToEdit.time,
        sessionType: sessionToEdit.sessionType || '',
        amount: sessionToEdit.amount,
      });
    }
  }, [isEditSessionSheetOpen, sessionToEdit, resetEditSessionForm]);

  const watchedClientIdForEditSession = watchEditSessionForm("clientId");
  const watchedSessionTypeForEditSession = watchEditSessionForm("sessionType");

  useEffect(() => {
    if (isEditSessionSheetOpen && watchedClientIdForEditSession && watchedSessionTypeForEditSession && clients.length > 0) {
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
  }, [isEditSessionSheetOpen, watchedClientIdForEditSession, watchedSessionTypeForEditSession, clients, setEditSessionValue]);

  const fetchDashboardData = async () => {
    try {
      setIsLoadingData(true);

      const [supabaseClients, supabaseSessions] = await Promise.all([
        getClients(),
        getSessions()
      ]);
      setClients(supabaseClients.sort((a, b) => {
        const nameA = formatFullNameAndDogName(a.ownerFirstName + " " + a.ownerLastName, a.dogName).toLowerCase();
        const nameB = formatFullNameAndDogName(b.ownerFirstName + " " + b.ownerLastName, b.dogName).toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      }));
      setSessions(supabaseSessions.sort((a, b) => {
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
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard navigation for calendar months
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with input fields
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setCurrentMonth(subMonths(currentMonth, 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setCurrentMonth(addMonths(currentMonth, 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMonth]);

  // Mobile swipe navigation for calendar months
  useEffect(() => {
    const isMobile = window.innerWidth < 768; // sm breakpoint
    if (!isMobile) return;

    let startX = 0;
    let startY = 0;
    const threshold = 50; // Minimum swipe distance
    const restraint = 100; // Maximum vertical movement

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const distX = endX - startX;
      const distY = endY - startY;

      // Check if it's a horizontal swipe (not vertical scroll)
      if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
        if (distX > 0) {
          // Swipe right - go to previous month
          setCurrentMonth(subMonths(currentMonth, 1));
        } else if (distX < 0) {
          // Swipe left - go to next month
          setCurrentMonth(addMonths(currentMonth, 1));
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentMonth]);

  useEffect(() => {
    if (isSessionSheetOpen && selectedSessionForSheet && selectedSessionForSheet.clientId) {
      setSessionSheetViewMode('sessionInfo');
      setBriefForSessionSheet(null);
      setQuestionnaireForSessionSheet(null);
      setIsLoadingClientForSession(true);
      getClientById(selectedSessionForSheet.clientId)
        .then(client => {
          setClientForSelectedSession(client);
          setIsLoadingClientForSession(false);
        })
        .catch(error => {
          console.error("Error fetching client for session:", error);
          setClientForSelectedSession(null);
          setIsLoadingClientForSession(false);
        });    } else {
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
    } finally {
      setIsLoadingQuestionnaireForSessionSheet(false);
    }
  };


  const filteredSessionsForCalendar = useMemo(() => {
    if (!searchTerm.trim()) return sessions;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return sessions.filter(session => {
      const client = clients.find(c => c.id === session.clientId);
      const ownerFullName = client ? `${client.ownerFirstName} ${client.ownerLastName}` : (session.clientName || '');
      const dogName = client?.dogName || session.dogName || '';

      const nameMatch = formatFullNameAndDogName(ownerFullName, dogName).toLowerCase().includes(lowerSearchTerm);
      return nameMatch;
    });
  }, [sessions, searchTerm, clients]);

  const handleAddClientSubmit: SubmitHandler<InternalClientFormValuesDash> = async (data) => {
    setIsSubmittingSheet(true);
    try {
      const clientDataForFirestore: Omit<Client, 'id' | 'behaviouralBriefId' | 'behaviourQuestionnaireId' | 'createdAt' | 'address' | 'howHeardAboutServices' | 'lastSession' | 'nextSession'> & { dogName?: string; isMember?: boolean; isActive?: boolean; submissionDate?: string; fullAddress?: string } = {
        ownerFirstName: data.ownerFirstName,
        ownerLastName: data.ownerLastName,
        contactEmail: data.contactEmail,
        contactNumber: data.contactNumber,
        fullAddress: data.fullAddress || undefined,
        postcode: data.postcode,
        dogName: data.dogName || undefined,
        isMember: data.isMember || false,
        isActive: data.isActive === undefined ? true : data.isActive,
        submissionDate: data.submissionDate || format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      };
      const newClient = await addClient(clientDataForFirestore);
      if (newClient) {
        setClients(prevClients => [...prevClients, newClient].sort((a, b) => {
          const nameA = formatFullNameAndDogName(a.ownerFirstName + " " + a.ownerLastName, a.dogName).toLowerCase();
          const nameB = formatFullNameAndDogName(b.ownerFirstName + " " + b.ownerLastName, b.dogName).toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        }));
      }
    } finally {
      setIsSubmittingSheet(false);
    }
  };

  const handleAddSessionSubmit: SubmitHandler<SessionFormValues> = async (data) => {
    setIsSubmittingSheet(true);
    try {
      const selectedClient = clients.find(c => c.id === data.clientId);
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      const sessionData = {
        clientId: data.clientId,
        clientName: `${selectedClient.ownerFirstName} ${selectedClient.ownerLastName}`,
        dogName: selectedClient.dogName,
        date: format(data.date, 'yyyy-MM-dd'),
        time: data.time,
        sessionType: data.sessionType,
        amount: data.amount,
      };

      const newSession = await addSession(sessionData);
      setSessions(prev => [newSession, ...prev]);
      setIsAddSessionSheetOpen(false);
      resetAddSessionForm();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add session.";
      console.error("Error adding session:", err);
    } finally {
      setIsSubmittingSheet(false);
    }
  };

  const handleUpdateSession = async (data: SessionFormValues) => {
    if (!sessionToEdit) return;
    setIsSubmittingSheet(true);
    try {
      const selectedClient = clients.find(c => c.id === data.clientId);
      if (!selectedClient) {
        throw new Error("Selected client not found");
      }

      await updateSession(sessionToEdit.id, {
        clientId: data.clientId,
        date: format(data.date, 'yyyy-MM-dd'),
        time: data.time,
        sessionType: data.sessionType,
        amount: data.amount,
      });

      setSessions(prev => prev.map(session =>
        session.id === sessionToEdit.id
          ? {
              ...session,
              clientId: data.clientId,
              clientName: `${selectedClient.ownerFirstName} ${selectedClient.ownerLastName}`,
              dogName: selectedClient.dogName,
              date: format(data.date, 'yyyy-MM-dd'),
              time: data.time,
              sessionType: data.sessionType,
              amount: data.amount,
            }
          : session
      ));
      setIsEditSessionSheetOpen(false);
      setSessionToEdit(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update session.";
      console.error("Error updating session:", err);
    } finally {
      setIsSubmittingSheet(false);
    }
  };

  const handleDeleteSession = async (session: Session) => {
    setIsSubmittingSheet(true);
    try {
      await deleteSession(session.id);
      setSessions(prev => prev.filter(s => s.id !== session.id));
      setIsSessionSheetOpen(false);
      setSelectedSessionForSheet(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete session.";
      console.error("Error deleting session:", err);
    } finally {
      setIsSubmittingSheet(false);
    }
  };

  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return sessions;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return sessions.filter(session => {
      const client = clients.find(c => c.id === session.clientId);
      const ownerFullName = client ? `${client.ownerFirstName} ${client.ownerLastName}` : (session.clientName || '');
      const dogName = client?.dogName || session.dogName || '';

      const nameMatch = formatFullNameAndDogName(ownerFullName, dogName).toLowerCase().includes(lowerSearchTerm);
      return nameMatch;
    });
  }, [sessions, searchTerm, clients]);

  const handleDeleteSessionRequest = (session: Session) => {
    setSessionToDelete(session);
    setIsDeleteSessionDialogOpen(true);
  };

  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    await handleDeleteSession(sessionToDelete);
    setIsDeleteSessionDialogOpen(false);
    setSessionToDelete(null);
  };

  const formatCaption: DateFormatter = (month, options) => {
    return format(month, 'MMMM yyyy', { locale: options?.locale });
  };

  const CustomDayContent = (props: DayProps) => {
    const daySessions = filteredSessions.filter(session => {
      const sessionDate = parseISO(session.date);
      return isValid(sessionDate) && isSameDay(sessionDate, props.date);
    }).sort((a, b) => {
      try {
        const timeA = parse(a.time, 'HH:mm', new Date());
        const timeB = parse(b.time, 'HH:mm', new Date());
        return compareAsc(timeA, timeB);
      } catch {
        return 0;
      }
    });

    return (
      <div className={cn(
          "relative h-full min-h-[7rem] p-1 flex flex-col items-center text-center",
        )}
      >
        <div
          className={cn(
            "w-full text-xs mb-1",
             isToday(props.date) ? "text-custom-ring-color font-semibold" : "text-muted-foreground"
          )}
        >
          {format(props.date, "d")}
        </div>

        {daySessions.length > 0 && (
          <ScrollArea className="w-full mt-5 pr-1">
            <div className="space-y-1">
              {daySessions.map((session) => (
                <Badge
                  key={session.id}
                  className="block w-full text-left text-xs p-1 truncate cursor-pointer bg-primary text-primary-foreground hover:bg-primary/80 rounded-md"
                  onClick={() => {
                    setSelectedSessionForSheet(session);
                    setIsSessionSheetOpen(true);
                  }}
                >
                  {/* Mobile: Show only time */}
                  <span className="sm:hidden">
                    {formatTimeWithoutSeconds(session.time)}
                  </span>
                  {/* Desktop: Show time and client name */}
                  <span className="hidden sm:inline">
                    {formatTimeWithoutSeconds(session.time)} - {
                      session.sessionType === 'Group'
                        ? 'Group Session'
                        : session.sessionType === 'RMR Live'
                        ? 'RMR Live'
                        : formatFullNameAndDogName(session.clientName, session.dogName)
                    }
                  </span>
                </Badge>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center py-10 h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <h2 className="text-lg font-semibold text-center min-w-[120px]">{format(currentMonth, 'MMMM yyyy')}</h2>
                <Button variant="outline" size="icon" className="h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="flex items-center gap-2">

                <Sheet open={isAddClientSheetOpen} onOpenChange={setIsAddClientSheetOpen}>
                  <SheetTrigger asChild>
                      <Button className="h-10 w-10 min-w-10 max-w-10 flex-shrink-0">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                  </SheetTrigger>
                  <SheetContent className="flex flex-col h-full sm:max-w-md bg-card">
                      <SheetHeader>
                          <SheetTitle>New Client</SheetTitle>
                          <Separator />
                      </SheetHeader>
                      <ScrollArea className="flex-1">
                          <div className="py-4 space-y-4">
                          <form onSubmit={addClientForm.handleSubmit(handleAddClientSubmit)} id="addClientFormInSheetDashboard" className="space-y-4">
                              <div className="space-y-1.5">
                                  <Label htmlFor="add-ownerFirstName-dash">First Name</Label>
                                  <Input id="add-ownerFirstName-dash" {...addClientForm.register("ownerFirstName")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.ownerFirstName ? "border-destructive" : "")} disabled={isSubmittingSheet} />
                                  {addClientForm.formState.errors.ownerFirstName && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.ownerFirstName.message}</p>}
                              </div>
                              <div className="space-y-1.5">
                                  <Label htmlFor="add-ownerLastName-dash">Last Name</Label>
                                  <Input id="add-ownerLastName-dash" {...addClientForm.register("ownerLastName")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.ownerLastName ? "border-destructive" : "")} disabled={isSubmittingSheet} />
                                  {addClientForm.formState.errors.ownerLastName && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.ownerLastName.message}</p>}
                              </div>
                              <div className="space-y-1.5">
                                  <Label htmlFor="add-dogName-dash">Dog's Name</Label>
                                  <Input id="add-dogName-dash" {...addClientForm.register("dogName")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.dogName ? "border-destructive" : "")} disabled={isSubmittingSheet} />
                                  {addClientForm.formState.errors.dogName && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.dogName.message}</p>}
                              </div>
                              <div className="space-y-1.5">
                                  <Label htmlFor="add-contactEmail-dash">Email</Label>
                                  <Input id="add-contactEmail-dash" type="email" {...addClientForm.register("contactEmail")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.contactEmail ? "border-destructive" : "")} disabled={isSubmittingSheet} />
                                  {addClientForm.formState.errors.contactEmail && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.contactEmail.message}</p>}
                              </div>
                               <div className="space-y-1.5">
                                <Label htmlFor="add-contactNumber-dash">Contact Number</Label>
                                <Input id="add-contactNumber-dash" type="tel" {...addClientForm.register("contactNumber")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.contactNumber ? "border-destructive" : "")} disabled={isSubmittingSheet} />
                                {addClientForm.formState.errors.contactNumber && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.contactNumber.message}</p>}
                              </div>
                               <div className="space-y-1.5">
                                <Label htmlFor="add-fullAddress-dash">Address</Label>
                                <Textarea id="add-fullAddress-dash" {...addClientForm.register("fullAddress")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.fullAddress ? "border-destructive" : "")} disabled={isSubmittingSheet} rows={3}/>
                                {addClientForm.formState.errors.fullAddress && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.fullAddress.message}</p>}
                              </div>
                              <div className="space-y-1.5">
                                  <Label htmlFor="add-postcode-dash">Postcode</Label>
                                  <Input id="add-postcode-dash" {...addClientForm.register("postcode")} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addClientForm.formState.errors.postcode ? "border-destructive" : "")} disabled={isSubmittingSheet} />
                                  {addClientForm.formState.errors.postcode && <p className="text-xs text-destructive mt-1">{addClientForm.formState.errors.postcode.message}</p>}
                              </div>
                               <div className="flex items-center space-x-4 pt-2">
                                <div className="flex items-center space-x-2">
                                    <Controller
                                        name="isMember"
                                        control={addClientForm.control}
                                        render={({ field }) => (
                                        <Checkbox id="add-isMember-dash" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmittingSheet} className="focus-visible:ring-0 focus-visible:ring-offset-0"/>
                                        )}
                                    />
                                    <Label htmlFor="add-isMember-dash" className="text-sm font-normal">Membership</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Controller
                                        name="isActive"
                                        control={addClientForm.control}
                                        render={({ field }) => (
                                        <Checkbox id="add-isActive-dash" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmittingSheet} className="focus-visible:ring-0 focus-visible:ring-offset-0"/>
                                        )}
                                    />
                                    <Label htmlFor="add-isActive-dash" className="text-sm font-normal">Active</Label>
                                </div>
                              </div>
                              <input type="hidden" {...addClientForm.register("submissionDate")} />
                          </form>
                          </div>
                      </ScrollArea>
                        <SheetFooter className="border-t pt-4">
                          <Button type="submit" form="addClientFormInSheetDashboard" className="w-full" disabled={isSubmittingSheet}>
                          {isSubmittingSheet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                          Save Client
                          </Button>
                      </SheetFooter>
                  </SheetContent>
                </Sheet>
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
                            <form onSubmit={handleAddSessionSubmitHook(handleAddSessionSubmit)} id="addSessionFormInSheetDashboard" className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="clientId-dashboard">Client</Label>
                                    <Controller name="clientId" control={addSessionFormControl}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmittingSheet || isLoadingData}>
                                        <SelectTrigger id="clientId-dashboard" className={cn("w-full focus:ring-0 focus:ring-offset-0", addSessionFormErrors.clientId && "border-destructive")}>
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
                                    {addSessionFormErrors.clientId && <p className="text-xs text-destructive mt-1">{addSessionFormErrors.clientId.message}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="date-dashboard">Booking Date</Label>
                                    <div className={cn("flex justify-center w-full", addSessionFormErrors.date && "border-destructive border rounded-md")}>
                                    <Controller name="date" control={addSessionFormControl}
                                        render={({ field }) => (
                                        <ShadCalendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={isSubmittingSheet} id="date-dashboard"
                                            className={cn("!p-1", addSessionFormErrors.date && "border-destructive")}
                                            classNames={{
                                                day_selected: "bg-[#92351f] text-white focus:bg-[#92351f] focus:text-white !rounded-md",
                                                day_today: "ring-2 ring-custom-ring-color rounded-md ring-offset-background ring-offset-1 text-custom-ring-color font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none",
                                                day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-[#92351f] hover:text-white focus-visible:outline-none !rounded-md")
                                            }} />
                                        )} />
                                    </div>
                                    {addSessionFormErrors.date && <p className="text-xs text-destructive mt-1">{addSessionFormErrors.date.message}</p>}
                                </div>

                                 <div className="space-y-1.5">
                                    <Label htmlFor="time-dashboard-hours">Booking Time</Label>
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
                                                    {hourOptions.map(opt => <SelectItem key={`add-hr-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>)}
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
                                                    {minuteOptions.map(opt => <SelectItem key={`add-min-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                </div>
                                            )}
                                        />
                                    </div>
                                    {addSessionFormErrors.time && <p className="text-xs text-destructive mt-1">{addSessionFormErrors.time.message}</p>}
                                </div>


                                <div className="space-y-1.5">
                                    <Label htmlFor="sessionType-dashboard">Session Type</Label>
                                    <Controller name="sessionType" control={addSessionFormControl}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmittingSheet}>
                                        <SelectTrigger id="sessionType-dashboard" className={cn("w-full focus:ring-0 focus:ring-offset-0",addSessionFormErrors.sessionType && "border-destructive")}>
                                            <SelectValue placeholder="Select session type" />
                                        </SelectTrigger>
                                        <SelectContent><SelectGroup><SelectLabel>Session Types</SelectLabel>
                                            {sessionTypeOptions.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                                        </SelectGroup></SelectContent>
                                        </Select>
                                    )}
                                    />
                                    {addSessionFormErrors.sessionType && <p className="text-xs text-destructive mt-1">{addSessionFormErrors.sessionType.message}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="amount-dashboard">Quote</Label>
                                    <Controller name="amount" control={addSessionFormControl}
                                    render={({ field }) => (
                                        <Input id="amount-dashboard" type="number" placeholder="e.g. 75.50" step="0.01" {...field} value={field.value === undefined ? '' : String(field.value)} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", addSessionFormErrors.amount && "border-destructive")} disabled={isSubmittingSheet} />
                                    )} />
                                    {addSessionFormErrors.amount && <p className="text-xs text-destructive mt-1">{addSessionFormErrors.amount.message}</p>}
                                </div>
                            </form>
                            </div>
                        </ScrollArea>
                        <SheetFooter className="border-t pt-4">
                            <Button type="submit" form="addSessionFormInSheetDashboard" className="w-full" disabled={isSubmittingSheet}>
                                {isSubmittingSheet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />} Save Session
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

        <div className="flex-1"> {/* Removed CardContent p-0 */}
          {isLoadingData ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-3">Loading calendar...</p></div>
          ) : (
            <DayPicker
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              showOutsideDays
              fixedWeeks
              formatters={{ formatCaption }}
              className="w-full !p-0 !m-0"
              classNames={{
                caption: "hidden",
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 justify-center",
                month: "space-y-4 w-full",
                table: "w-full border-collapse",
                head_row: "flex border-b",
                head_cell: "text-muted-foreground font-normal text-xs w-[14.28%] text-center p-2",
                row: "flex w-full mt-0 border-b last:border-b-0",
                cell: cn(
                  "w-[14.28%] text-center text-sm p-0 relative border-r last:border-r-0 focus-within:relative focus-within:z-20",
                  "[&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
                ),
                day: "h-full w-full p-0",
                day_selected: "bg-primary text-primary-foreground focus:bg-primary focus:text-primary-foreground !rounded-md",
                day_today: "ring-2 ring-custom-ring-color rounded-md ring-offset-background ring-offset-1 text-custom-ring-color font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none",
                day_outside: "text-muted-foreground opacity-50",
              }}
              components={{ DayContent: CustomDayContent }}
            />
          )}
        </div>

      <Sheet open={isSessionSheetOpen} onOpenChange={(isOpen) => { setIsSessionSheetOpen(isOpen); if (!isOpen) {setSelectedSessionForSheet(null); setClientForSelectedSession(null); setSessionSheetViewMode('sessionInfo'); }}}>
        <SheetContent className="flex flex-col h-full sm:max-w-lg bg-card">
           <SheetHeader className="flex-row justify-between items-center">
                <SheetTitle>Session Details</SheetTitle>
            </SheetHeader>
            <Separator className="mb-4"/>
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
                    <DetailRow label="Date:" value={isValid(parseISO(selectedSessionForSheet.date)) ? format(parseISO(selectedSessionForSheet.date), 'PPP') : 'Invalid Date'} />
                    <DetailRow label="Time:" value={selectedSessionForSheet.time} />
                    <DetailRow label="Session Type:" value={selectedSessionForSheet.sessionType} />
                    {selectedSessionForSheet.amount !== undefined && <DetailRow label="Quote:" value={`£${selectedSessionForSheet.amount.toFixed(2)}`} />}

                    {isLoadingClientForSession && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin"/> <span className="ml-2">Loading client info...</span></div>}

                    {clientForSelectedSession && (
                        <div className="mt-6 space-y-2">
                        {clientForSelectedSession.behaviouralBriefId && (
                            <Button onClick={handleViewBriefForSession} className="w-full" variant="outline" disabled={isLoadingBriefForSessionSheet}>
                            {isLoadingBriefForSessionSheet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileQuestion className="mr-2 h-4 w-4" />} View Behavioural Brief
                            </Button>
                        )}
                        {clientForSelectedSession.behaviourQuestionnaireId && (
                            <Button onClick={handleViewQuestionnaireForSession} className="w-full" variant="outline" disabled={isLoadingQuestionnaireForSessionSheet}>
                            {isLoadingQuestionnaireForSessionSheet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SquareCheck className="mr-2 h-4 w-4" />} View Behaviour Questionnaire
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
                            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Session Info
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
                            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Session Info
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
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                            if (selectedSessionForSheet) {
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
            <Separator/>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="py-4 space-y-4">
                <form onSubmit={handleEditSessionSubmitHook(handleUpdateSession)} id="editSessionFormInSheetDashboard" className="space-y-4">
                  <div className="space-y-1.5">
                      <Label htmlFor="edit-clientId-dashboard">Client</Label>
                      <Controller name="clientId" control={editSessionFormControl}
                      render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmittingSheet || isLoadingData}>
                          <SelectTrigger id="edit-clientId-dashboard" className={cn("w-full focus:ring-0 focus:ring-offset-0", editSessionFormErrors.clientId && "border-destructive")}>
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
                      <Label htmlFor="edit-date-dashboard">Booking Date</Label>
                       <div className={cn("flex justify-center w-full", editSessionFormErrors.date && "border-destructive border rounded-md")}>
                      <Controller name="date" control={editSessionFormControl}
                          render={({ field }) => (
                          <ShadCalendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={isSubmittingSheet} id="edit-date-dashboard"
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
                    <Label htmlFor="edit-time-dashboard-hours">Booking Time</Label>
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
                                    {hourOptions.map(opt => <SelectItem key={`edit-hr-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>)}
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
                                    {minuteOptions.map(opt => <SelectItem key={`edit-min-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                </div>
                            )}
                        />
                    </div>
                    {editSessionFormErrors.time && <p className="text-xs text-destructive mt-1">{editSessionFormErrors.time.message}</p>}
                </div>
                  <div className="space-y-1.5">
                      <Label htmlFor="edit-sessionType-dashboard">Session Type</Label>
                      <Controller name="sessionType" control={editSessionFormControl}
                      render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmittingSheet}>
                          <SelectTrigger id="edit-sessionType-dashboard" className={cn("w-full focus:ring-0 focus:ring-offset-0",editSessionFormErrors.sessionType && "border-destructive")}>
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
                      <Label htmlFor="edit-amount-dashboard">Quote</Label>
                      <Controller name="amount" control={editSessionFormControl}
                      render={({ field }) => (
                          <Input id="edit-amount-dashboard" type="number" placeholder="e.g. 75.50" step="0.01" {...field} value={field.value === undefined ? '' : String(field.value)} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} className={cn("w-full focus-visible:ring-0 focus-visible:ring-offset-0", editSessionFormErrors.amount && "border-destructive")} disabled={isSubmittingSheet} />
                      )} />
                      {editSessionFormErrors.amount && <p className="text-xs text-destructive mt-1">{editSessionFormErrors.amount.message}</p>}
                  </div>
                </form>
            </div>
          </ScrollArea>
          <SheetFooter className="border-t pt-4">
            <Button type="submit" form="editSessionFormInSheetDashboard" className="w-full" disabled={isSubmittingSheet}>
              {isSubmittingSheet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isDeleteSessionDialogOpen} onOpenChange={setIsDeleteSessionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
            This will permanently delete the session with {sessionToDelete ? formatFullNameAndDogName(sessionToDelete.clientName, sessionToDelete.dogName) : ''} on {sessionToDelete && isValid(parseISO(sessionToDelete.date)) ? format(parseISO(sessionToDelete.date), 'PPP') : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteSessionDialogOpen(false)} disabled={isSubmittingSheet && sessionToDelete !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteSession} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmittingSheet && sessionToDelete !== null}>
              {isSubmittingSheet && sessionToDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

