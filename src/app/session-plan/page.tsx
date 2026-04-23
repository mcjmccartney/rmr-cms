'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { predefinedActionPoints, personalizeActionPoint } from '@/data/actionPoints';
import { sessionPlanService } from '@/services/sessionPlanService';
import { clientService } from '@/services/clientService';
import { sessionService } from '@/services/sessionService';
import { useRobustAutoSave } from '@/hooks/useRobustAutoSave';
import type { SessionPlan, Client, Session } from '@/types';
import SafeHtmlRenderer from '@/components/SafeHtmlRenderer';
import RichTextEditor from '@/components/RichTextEditor';
import ActionPointLibraryModal from '@/components/modals/ActionPointLibraryModal';
import DogClubGuidesModal from '@/components/modals/DogClubGuidesModal';
import { DOG_CLUB_GUIDES } from '@/data/dogClubGuides';
import { getSessionDogName as getSessionDogNameUtil } from '@/utils/dogNameUtils';

function SessionPlanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state } = useApp();

  const sessionId = searchParams.get('sessionId');
  const session = sessionId ? state.sessions.find(s => s.id === sessionId) : null;
  const client = session ? state.clients.find(c => c.id === session.clientId) : null;



  // Use action points from state (loaded from Supabase) or fallback to predefined ones
  const actionPoints = state.actionPoints.length > 0 ? state.actionPoints : predefinedActionPoints;

  // Collect action point IDs used in previous session plans for this client
  const previouslyUsedActionPointIds = useMemo(() => {
    if (!session?.clientId) return new Set<string>();
    const clientSessionIds = new Set(
      state.sessions
        .filter(s => s.clientId === session.clientId && s.id !== session.id)
        .map(s => s.id)
    );
    const used = new Set<string>();
    state.sessionPlans
      .filter(sp => clientSessionIds.has(sp.sessionId))
      .forEach(sp => sp.actionPoints?.forEach(id => used.add(id)));
    return used;
  }, [state.sessions, state.sessionPlans, session]);



  const [formData, setFormData] = useState({
    mainGoal1: '',
    mainGoal2: '',
    mainGoal3: '',
    mainGoal4: '',
    explanationOfBehaviour: '',
  });

  // Legacy state (will be replaced by robust auto-save)
  const [legacyLastSaved, setLegacyLastSaved] = useState<Date | null>(null);
  const [legacyIsSaving, setLegacyIsSaving] = useState(false);
  const [legacyHasUnsavedChanges, setLegacyHasUnsavedChanges] = useState(false);

  const [selectedActionPoints, setSelectedActionPoints] = useState<string[]>([]);
  const [showActionPointsModal, setShowActionPointsModal] = useState(false);
  const [selectedDogClubGuides, setSelectedDogClubGuides] = useState<string[]>([]);
  const [showDogClubGuidesModal, setShowDogClubGuidesModal] = useState(false);
  const [showMainGoals, setShowMainGoals] = useState(false);
  const [hasMainGoals, setHasMainGoals] = useState(false); // Default to false (removed state)
  const [editableActionPoints, setEditableActionPoints] = useState<{[key: string]: {header: string, details: string}}>({});
  const [expandedActionPoints, setExpandedActionPoints] = useState<Set<string>>(new Set());
  const [existingSessionPlan, setExistingSessionPlan] = useState<SessionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [fallbackClient, setFallbackClient] = useState<Client | null>(null);
  const [fallbackSession, setFallbackSession] = useState<Session | null>(null);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [generatedDocUrl, setGeneratedDocUrl] = useState<string | null>(null);
  const [isPollingForUrl, setIsPollingForUrl] = useState(false);

  // Use fallback data if state data is not available (moved up for scope)
  const currentSession = session || fallbackSession;
  const currentClient = client || fallbackClient;



  // Create the save function for robust auto-save
  const saveFunction = useCallback(async (isAutoSave = false) => {
    if (!currentSession || !currentClient) {
      throw new Error('Session or client not available');
    }

    const sessionPlanData = {
      sessionId: currentSession.id,
      mainGoal1: formData.mainGoal1,
      mainGoal2: formData.mainGoal2,
      mainGoal3: formData.mainGoal3,
      mainGoal4: formData.mainGoal4,
      explanationOfBehaviour: formData.explanationOfBehaviour,
      actionPoints: selectedActionPoints,
      editedActionPoints: editableActionPoints,
      dogClubGuides: selectedDogClubGuides,
      sessionNumber: sessionNumber,
      noFirstPage: !hasMainGoals // Set to true when Remove button is clicked
    };

    let savedPlan;
    if (existingSessionPlan) {
      savedPlan = await sessionPlanService.update(existingSessionPlan.id, sessionPlanData);
    } else {
      savedPlan = await sessionPlanService.create(sessionPlanData);
      setExistingSessionPlan(savedPlan);
    }

    return savedPlan;
  }, [currentSession, currentClient, formData, selectedActionPoints, editableActionPoints, selectedDogClubGuides, sessionNumber, existingSessionPlan, hasMainGoals]);

  // Initialize robust auto-save
  const { autoSaveState, changeState, trackChange, forceSave, clearUnsavedChanges } = useRobustAutoSave({
    saveFunction,
    onSaveSuccess: () => {
      setLegacyLastSaved(new Date());
      setLegacyHasUnsavedChanges(false);
    },
    onSaveError: () => {
      // Silent error handling
    },
    enablePeriodicSave: true,
    enableCriticalSave: true,
  });

  // Sync legacy state with robust auto-save state
  const isSaving = autoSaveState.isSaving || legacyIsSaving;
  const hasUnsavedChanges = autoSaveState.hasUnsavedChanges || legacyHasUnsavedChanges;
  const lastSaved = autoSaveState.lastSaved || legacyLastSaved;

  // Load existing session plan and calculate session number
  useEffect(() => {
    const loadExistingSessionPlan = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        if (!session || !client) {
          if (!session) {
            const dbSession = await sessionService.getById(sessionId);
            if (dbSession) {
              setFallbackSession(dbSession);

              if (dbSession.clientId) {
                const dbClient = await clientService.getById(dbSession.clientId);
                if (dbClient) {
                  setFallbackClient(dbClient);
                }
              }
            }
          }
        }

        // Calculate session number for this session
        const calculatedSessionNumber = await sessionPlanService.calculateSessionNumber(sessionId);
        setSessionNumber(calculatedSessionNumber);

        const existingPlan = await sessionPlanService.getBySessionId(sessionId);

        if (existingPlan) {

          setExistingSessionPlan(existingPlan);
          setFormData({
            mainGoal1: existingPlan.mainGoal1 || '',
            mainGoal2: existingPlan.mainGoal2 || '',
            mainGoal3: existingPlan.mainGoal3 || '',
            mainGoal4: existingPlan.mainGoal4 || '',
            explanationOfBehaviour: existingPlan.explanationOfBehaviour || '',
          });
          setSelectedActionPoints(existingPlan.actionPoints || []);
          setSelectedDogClubGuides(existingPlan.dogClubGuides || []);

          if (existingPlan.editedActionPoints) {
            // Replace old dog name with current dog name in action points
            const currentDogName = getSessionDogName();
            const oldDogName = currentSession?.dogName;

            if (oldDogName && currentDogName && oldDogName.toLowerCase() !== currentDogName.toLowerCase()) {
              const regex = new RegExp(`\\b${oldDogName}\\b`, 'gi');
              const updatedActionPoints: { [key: string]: { header: string; details: string } } = {};

              Object.entries(existingPlan.editedActionPoints).forEach(([key, value]) => {
                updatedActionPoints[key] = {
                  header: value.header.replace(regex, currentDogName),
                  details: value.details.replace(regex, currentDogName),
                };
              });

              setEditableActionPoints(updatedActionPoints);
            } else {
              setEditableActionPoints(existingPlan.editedActionPoints);
            }
          }

          // Set hasMainGoals based on noFirstPage field, but keep collapsed
          if (existingPlan.noFirstPage !== undefined) {
            const shouldShowMainGoals = !existingPlan.noFirstPage;
            setHasMainGoals(shouldShowMainGoals);
            setShowMainGoals(false); // Always start collapsed
          }

          // Check if document URL exists
          if (existingPlan.documentEditUrl) {
            setGeneratedDocUrl(existingPlan.documentEditUrl);
          }

          // Set last saved time and mark as no unsaved changes
          setLegacyLastSaved(existingPlan.updatedAt);
          setLegacyHasUnsavedChanges(false);
        }
      } catch (error) {
        // Silent error handling
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingSessionPlan();
  }, [sessionId]); // Only depend on sessionId to prevent unnecessary re-runs

  // Initialize robust auto-save when data is loaded
  useEffect(() => {
    if (existingSessionPlan && !autoSaveState.hasUnsavedChanges) {
      // Clear unsaved changes when session plan is loaded
      clearUnsavedChanges();
    }
  }, [existingSessionPlan, clearUnsavedChanges, autoSaveState.hasUnsavedChanges]);

  const handleBack = async () => {
    if (hasUnsavedChanges || autoSaveState.hasUnsavedChanges ||
        formData.mainGoal1 || formData.mainGoal2 || formData.mainGoal3 ||
        formData.mainGoal4 || formData.explanationOfBehaviour ||
        selectedActionPoints.length > 0 || Object.keys(editableActionPoints).length > 0) {
      try {
        await forceSave();
      } catch (error) {
        // Continue with navigation even if save fails
      }
    }

    const from = searchParams.get('from');
    const clientId = searchParams.get('clientId');

    // Navigate based on where user came from
    const returnSessionId = searchParams.get('returnSessionId');

    if (from === 'clients' && clientId) {
      router.push(`/clients?openClient=${clientId}`);
    } else if (from === 'calendar') {
      // Include returnSessionId to restore the session sidepane
      if (returnSessionId) {
        router.push(`/calendar?returnSessionId=${returnSessionId}`);
      } else {
        router.push('/calendar');
      }
    } else if (from === 'sessions') {
      // Include returnSessionId to restore the session sidepane
      if (returnSessionId) {
        router.push(`/sessions?returnSessionId=${returnSessionId}`);
      } else {
        router.push('/sessions');
      }
    } else {
      // Fallback: if no 'from' parameter, try to determine best navigation
      // If we have a client, go to clients page with that client open
      if (currentClient) {
        router.push(`/clients?openClient=${currentClient.id}`);
      } else {
        // Default fallback to calendar
        router.push('/calendar');
      }
    }
  };

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setLegacyHasUnsavedChanges(true);

    // Track change with robust auto-save
    const isCritical = field === 'explanationOfBehaviour'; // Mark explanation as critical
    trackChange('hasTextChanges', isCritical);
  }, [trackChange]);

  // Poll for document URL from the API endpoint
  const pollForDocumentUrl = async (sessionId: string, maxAttempts = 30) => {
    setIsPollingForUrl(true);
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/session-plan/document-url?sessionId=${sessionId}&t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          if (data.documentUrl) {
            if (data.documentUrl !== generatedDocUrl) {
              setGeneratedDocUrl(data.documentUrl);
              setIsPollingForUrl(false);
              window.open(data.documentUrl, '_blank');
              return;
            }
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setIsPollingForUrl(false);
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setIsPollingForUrl(false);
        }
      }
    };

    setTimeout(poll, 3000);
  };

  // (currentSession and currentClient moved up for scope)

  const getSessionDogName = (): string => {
    return getSessionDogNameUtil(currentSession?.dogName, currentClient);
  };

  // Save function that navigates away (for the main Save button)
  const handleSave = async () => {
    if (!currentSession || !currentClient) {
      return;
    }

    try {
      await saveFunction(false);
    } catch (error) {
      // Continue with navigation even if save fails
    }

    // Navigate directly without additional save attempts
    const from = searchParams.get('from');
    const clientId = searchParams.get('clientId');

    // Navigate based on where user came from
    const returnSessionId = searchParams.get('returnSessionId');

    // Force navigation using window.location as fallback since router.push() is being blocked
    let targetUrl = '';

    if (from === 'clients' && clientId) {
      targetUrl = `/clients?openClient=${clientId}`;
    } else if (from === 'calendar') {
      // Include returnSessionId to restore the session sidepane
      if (returnSessionId) {
        targetUrl = `/calendar?returnSessionId=${returnSessionId}`;
      } else {
        targetUrl = '/calendar';
      }
    } else if (from === 'sessions') {
      // Include returnSessionId to restore the session sidepane
      if (returnSessionId) {
        targetUrl = `/sessions?returnSessionId=${returnSessionId}`;
      } else {
        targetUrl = '/sessions';
      }
    } else {
      // Fallback: if no 'from' parameter, try to determine best navigation
      // If we have a client, go to clients page with that client open
      if (currentClient) {
        targetUrl = `/clients?openClient=${currentClient.id}`;
      } else {
        // Default fallback to calendar
        targetUrl = '/calendar';
      }
    }

    // Try router.push() first, then force with window.location if it fails to actually navigate
    try {
      await router.push(targetUrl);

      // Check if navigation actually happened after a brief delay
      setTimeout(() => {
        if (window.location.pathname === '/session-plan') {
          window.location.href = targetUrl;
        }
      }, 100);

    } catch (error) {
      window.location.href = targetUrl;
    }
  };

  // Legacy save function for manual saves and backward compatibility
  const saveSessionPlan = async (isAutoSave = false) => {
    if (isAutoSave) {
      // For auto-save, use the robust auto-save system
      return await forceSave();
    } else {
      // For manual saves, use the robust save function directly
      return await saveFunction(false);
    }
  };

  // Replace dog names in text content (for stored session plan content)
  const replaceDogNames = (text: string): string => {
    if (!text) return '';

    const currentDogName = getSessionDogName();
    let result = text;

    // Replace the client's primary dog name with the session dog name
    if (currentClient?.dogName && currentClient.dogName !== currentDogName) {
      const regex = new RegExp(`\\b${currentClient.dogName}\\b`, 'gi');
      result = result.replace(regex, currentDogName);
    }

    // Also replace any other dogs from the client's other_dogs array
    if (currentClient?.otherDogs && Array.isArray(currentClient.otherDogs)) {
      currentClient.otherDogs.forEach(otherDog => {
        if (otherDog !== currentDogName) {
          const regex = new RegExp(`\\b${otherDog}\\b`, 'gi');
          result = result.replace(regex, currentDogName);
        }
      });
    }

    return result;
  };

  // Get dog's gender from questionnaire for proper pronoun replacement
  const getDogGender = (): 'Male' | 'Female' => {
    const sessionDogName = getSessionDogName();
    if (!currentClient || !sessionDogName) return 'Male';

    // Comprehensive questionnaire matching function
    const findQuestionnaireForClient = (client: any, dogName: string, questionnaires: any[]) => {
      if (!client || !dogName) return null;

      // Method 1: Match by client_id and dog name (case-insensitive)
      let questionnaire = questionnaires.find(q =>
        (q.client_id === client.id || q.clientId === client.id) &&
        q.dogName?.toLowerCase() === dogName.toLowerCase()
      );
      if (questionnaire) return questionnaire;

      // Method 2: Match by email and dog name (case-insensitive)
      if (client.email) {
        questionnaire = questionnaires.find(q =>
          q.email?.toLowerCase() === client.email?.toLowerCase() &&
          q.dogName?.toLowerCase() === dogName.toLowerCase()
        );
        if (questionnaire) return questionnaire;
      }

      // Method 3: Match by client_id and dog name (exact case)
      questionnaire = questionnaires.find(q =>
        (q.client_id === client.id || q.clientId === client.id) &&
        q.dogName === dogName
      );
      if (questionnaire) return questionnaire;

      // Method 4: Match by email and dog name (exact case)
      if (client.email) {
        questionnaire = questionnaires.find(q =>
          q.email === client.email &&
          q.dogName === dogName
        );
        if (questionnaire) return questionnaire;
      }

      // Method 5: Match by partial dog name (case-insensitive)
      questionnaire = questionnaires.find(q =>
        (q.client_id === client.id || q.clientId === client.id) &&
        (q.dogName?.toLowerCase().includes(dogName.toLowerCase()) ||
         dogName.toLowerCase().includes(q.dogName?.toLowerCase() || ''))
      );
      if (questionnaire) return questionnaire;

      // Method 6: Match by email and partial dog name (case-insensitive)
      if (client.email) {
        questionnaire = questionnaires.find(q =>
          q.email?.toLowerCase() === client.email?.toLowerCase() &&
          (q.dogName?.toLowerCase().includes(dogName.toLowerCase()) ||
           dogName.toLowerCase().includes(q.dogName?.toLowerCase() || ''))
        );
      }

      return questionnaire || null;
    };

    const questionnaire = findQuestionnaireForClient(currentClient, sessionDogName, state.behaviourQuestionnaires);
    return questionnaire?.sex || 'Male';
  };

  const handleActionPointToggle = useCallback((actionPointId: string) => {
    setSelectedActionPoints(prev => {
      const newSelected = prev.includes(actionPointId)
        ? prev.filter(id => id !== actionPointId)
        : [...prev, actionPointId];

      // If removing an action point, also remove its editable version
      if (prev.includes(actionPointId)) {
        setEditableActionPoints(prevEditable => {
          const newEditable = { ...prevEditable };
          delete newEditable[actionPointId];
          return newEditable;
        });
      }

      return newSelected;
    });
    setLegacyHasUnsavedChanges(true);

    // Track action point selection change
    trackChange('hasActionPointChanges', false);
  }, [trackChange]);

  const handleDogClubGuideToggle = useCallback((guideId: string) => {
    setSelectedDogClubGuides(prev => {
      const newSelected = prev.includes(guideId)
        ? prev.filter(id => id !== guideId)
        : [...prev, guideId];
      return newSelected;
    });

    setLegacyHasUnsavedChanges(true);
    trackChange('hasDogClubGuidesChanges', false);
  }, [trackChange]);

  // Initialize editable action point with personalized content
  const initializeEditableActionPoint = (actionPointId: string) => {
    const actionPoint = actionPoints.find(ap => ap.id === actionPointId);
    if (!actionPoint) return;

    const personalizedActionPoint = personalizeActionPoint(
      actionPoint,
      getSessionDogName(),
      getDogGender()
    );

    setEditableActionPoints(prev => ({
      ...prev,
      [actionPointId]: {
        header: personalizedActionPoint.header,
        details: personalizedActionPoint.details
      }
    }));
  };

  // Update editable action point
  const updateEditableActionPoint = useCallback((actionPointId: string, field: 'header' | 'details', value: string) => {
    setEditableActionPoints(prev => ({
      ...prev,
      [actionPointId]: {
        ...prev[actionPointId],
        [field]: value
      }
    }));
    setLegacyHasUnsavedChanges(true);

    // Track action point change with robust auto-save
    trackChange('hasActionPointChanges', false);
  }, [trackChange]);

  // Move action point up or down
  const moveActionPoint = useCallback((actionPointId: string, direction: 'up' | 'down') => {
    const currentIndex = selectedActionPoints.indexOf(actionPointId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= selectedActionPoints.length) return;

    const newSelectedActionPoints = [...selectedActionPoints];
    [newSelectedActionPoints[currentIndex], newSelectedActionPoints[newIndex]] =
    [newSelectedActionPoints[newIndex], newSelectedActionPoints[currentIndex]];

    setSelectedActionPoints(newSelectedActionPoints);
    setLegacyHasUnsavedChanges(true);

    // Track action point reordering
    trackChange('hasActionPointChanges', false);
  }, [selectedActionPoints, trackChange]);

  // Add a blank action point to the session plan
  const addBlankActionPoint = useCallback(() => {
    const blankActionPointId = `blank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add to selected action points
    setSelectedActionPoints(prev => [...prev, blankActionPointId]);

    // Add to editable action points with blank content
    setEditableActionPoints(prev => ({
      ...prev,
      [blankActionPointId]: {
        header: '',
        details: ''
      }
    }));

    // Auto-expand the new blank action point for editing
    setExpandedActionPoints(prev => new Set([...prev, blankActionPointId]));

    setLegacyHasUnsavedChanges(true);
    trackChange('hasActionPointChanges', false);
  }, [trackChange]);

  // Toggle action point expansion
  const toggleActionPointExpansion = useCallback((actionPointId: string) => {
    setExpandedActionPoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actionPointId)) {
        newSet.delete(actionPointId);
      } else {
        newSet.add(actionPointId);
      }
      return newSet;
    });
  }, []);

  // Remove main goals section
  const removeMainGoals = useCallback(() => {
    setHasMainGoals(false);
    setShowMainGoals(false);
    // Clear main goals content
    setFormData(prev => ({
      ...prev,
      mainGoal1: '',
      mainGoal2: '',
      mainGoal3: '',
      mainGoal4: '',
      explanationOfBehaviour: ''
    }));
    setLegacyHasUnsavedChanges(true);
    trackChange('hasTextChanges', false);
  }, [trackChange]);

  // Add main goals section back
  const addMainGoals = useCallback(() => {
    setHasMainGoals(true);
    setShowMainGoals(false); // Keep collapsed when added
    setLegacyHasUnsavedChanges(true);
    trackChange('hasTextChanges', false);
  }, [trackChange]);

  const handlePreviewAndEdit = async () => {
    if (!currentSession || !currentClient) return;

    try {
      await saveSessionPlan();
      // Add a small delay to ensure database is updated before preview loads
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      // Continue with PDF preview even if save fails
      console.error('Failed to save session plan:', error);
    }

    // Open the dedicated preview page in a new window
    // Add cache-busting parameter to force fresh data
    const previewUrl = `/session-plan-preview/${currentSession.id}?t=${Date.now()}`;
    window.open(previewUrl, '_blank');
  };



  const handleReGenerate = async () => {
    if (!currentSession || !currentClient) return;

    setIsGeneratingDoc(true);

    try {
      await saveSessionPlan();
      setGeneratedDocUrl(null);

      try {
        await fetch('/api/session-plan/document-url', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: currentSession.id })
        });
      } catch (error) {
        // Silent error handling
      }
    } catch (error) {
      // Continue with document generation even if save fails
    }

    await generateDocument();
  };

  // Helper function to strip HTML tags from text
  const stripHtmlTags = (html: string): string => {
    if (!html) return '';
    // Create a temporary div element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    // Get text content (strips all HTML tags)
    return temp.textContent || temp.innerText || '';
  };

  const generateDocument = async () => {
    if (!currentSession || !currentClient) return;

    // Gather all emails: primary + any aliases
    const aliasEmails = (state.clientEmailAliases[currentClient.id] || [])
      .map(a => a.email)
      .filter(e => e.toLowerCase() !== currentClient.email?.toLowerCase());
    const allEmails = [currentClient.email, ...aliasEmails].filter(Boolean);
    const emailList = allEmails.join(', ');

    // Build client name including partner:
    // 1. Use explicit partnerName field if set
    // 2. Otherwise look up alias emails against other clients to find a linked partner
    let partnerFirstName = currentClient.partnerName?.trim().split(' ')[0];
    if (!partnerFirstName) {
      for (const aliasEmail of aliasEmails) {
        const linkedClient = state.clients.find(
          c => c.id !== currentClient.id && c.email?.toLowerCase() === aliasEmail.toLowerCase()
        );
        if (linkedClient) {
          partnerFirstName = linkedClient.firstName;
          break;
        }
      }
    }
    const displayClientName = partnerFirstName
      ? `${currentClient.firstName} & ${partnerFirstName}`
      : `${currentClient.firstName} ${currentClient.lastName}`.trim();

    // Prepare the data for the webhook with current form state
    const sessionData = {
      // Session identification for callback
      sessionId: currentSession.id,

      // Document title
      title: `Session ${sessionNumber} - ${getSessionDogName()}`,

      // Basic session info
      sessionNumber: sessionNumber.toString(),
      dogName: getSessionDogName(),
      clientName: displayClientName,
      clientEmail: currentClient.email,
      toEmails: allEmails,
      all_names: displayClientName,
      email_list: emailList,
      sessionType: currentSession.sessionType,
      sessionDate: new Date(currentSession.bookingDate).toLocaleDateString('en-GB'),
      sessionTime: currentSession.bookingTime.substring(0, 5), // Ensure HH:mm format (remove seconds)

      // Main goals (current form state) - Only include if hasMainGoals is true
      mainGoal1: hasMainGoals && formData.mainGoal1 ? `• ${formData.mainGoal1}` : '',
      mainGoal2: hasMainGoals && formData.mainGoal2 ? `• ${formData.mainGoal2}` : '',
      mainGoal3: hasMainGoals && formData.mainGoal3 ? `• ${formData.mainGoal3}` : '',
      mainGoal4: hasMainGoals && formData.mainGoal4 ? `• ${formData.mainGoal4}` : '',

      // Explanation (current form state) - Only include if hasMainGoals is true
      explanationOfBehaviour: hasMainGoals ? (formData.explanationOfBehaviour || '') : '',

      // Action points (current selection - use edited versions if available, otherwise personalized)
      // Strip HTML tags from action points for Google Doc generation
      actionPoints: selectedActionPoints.map((actionPointId) => {
        // Check if we have an edited version (for both blank and library action points)
        if (editableActionPoints[actionPointId]) {
          return {
            header: stripHtmlTags(editableActionPoints[actionPointId].header),
            details: stripHtmlTags(editableActionPoints[actionPointId].details)
          };
        }

        // For blank action points without content, skip them
        if (actionPointId.startsWith('blank-')) {
          return null;
        }

        // Otherwise use personalized version with correct gender for library action points
        const actionPoint = actionPoints.find(ap => ap.id === actionPointId);
        if (!actionPoint) return null;

        const personalizedActionPoint = personalizeActionPoint(
          actionPoint,
          getSessionDogName(),
          getDogGender()
        );

        return {
          header: stripHtmlTags(personalizedActionPoint.header),
          details: stripHtmlTags(personalizedActionPoint.details)
        };
      }).filter(Boolean),

      // Dog Club Guides (formatted as HTML links for Make.com)
      dogClubGuides: selectedDogClubGuides.length > 0
        ? selectedDogClubGuides
            .map(id => {
              const guide = DOG_CLUB_GUIDES.find(g => g.id === id);
              return guide ? `<a href="${guide.url}">${guide.title}</a>` : null;
            })
            .filter(Boolean)
            .join('<br/>')
        : '',

      // Callback URL for Make.com to send the document URL back
      callbackUrl: `${window.location.origin}/api/session-plan/document-url`,

      // Add timestamp and unique request ID to ensure fresh generation
      timestamp: new Date().toISOString(),
      requestId: `${currentSession.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    try {

      // Validate essential data before sending webhook
      const hasEssentialData = sessionData.sessionId &&
                               sessionData.clientName &&
                               sessionData.dogName &&
                               sessionData.sessionNumber;

      // Additional validation to prevent empty/invalid payloads
      const hasValidData = sessionData.sessionId?.trim() &&
                          sessionData.clientName?.trim() &&
                          sessionData.dogName?.trim() &&
                          sessionData.sessionNumber && sessionData.sessionNumber !== '0' &&
                          sessionData.actionPoints &&
                          sessionData.actionPoints.length > 0;

      if (!hasEssentialData || !hasValidData) {
        const missingFields = [];
        if (!sessionData.sessionId?.trim()) missingFields.push('Session ID');
        if (!sessionData.clientName?.trim()) missingFields.push('Client Name');
        if (!sessionData.dogName?.trim()) missingFields.push('Dog Name');
        if (!sessionData.sessionNumber || sessionData.sessionNumber === '0') missingFields.push('Session Number');
        if (!sessionData.actionPoints || sessionData.actionPoints.length === 0) missingFields.push('Action Points');

        alert(`Cannot generate document. Missing or invalid data for: ${missingFields.join(', ')}`);
        setIsGeneratingDoc(false);
        return;
      }



      // Send data to Make.com webhook to generate the document
      const response = await fetch('https://hook.eu1.make.com/lbfmnhl3xpf7c0y2sfos3vdln6y1fmqm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData)
      });

      const responseText = await response.text();

      if (response.ok) {
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (jsonError) {
          result = { success: true, rawResponse: responseText };
        }

        if (result.documentUrl) {
          setGeneratedDocUrl(result.documentUrl);
          window.open(result.documentUrl, '_blank');
        } else {
          pollForDocumentUrl(currentSession?.id || '');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${responseText}`);
      }
    } catch (error) {
      pollForDocumentUrl(currentSession?.id || '');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleEditGoogleDoc = () => {
    if (generatedDocUrl && generatedDocUrl !== 'pending') {
      // Open the specific document URL for editing
      window.open(generatedDocUrl, '_blank');
    } else {
      // If we don't have a specific URL, open Google Drive to find the document
      // The document should be named with the client and session info
      const searchQuery = `${currentClient?.firstName} ${currentClient?.lastName} Session ${sessionNumber}`;
      const driveSearchUrl = `https://drive.google.com/drive/search?q=${encodeURIComponent(searchQuery)}`;
      window.open(driveSearchUrl, '_blank');
    }
  };



  // Removed unused function handleSaveEditedContent

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Loading session...</h1>
        </div>
      </div>
    );
  }

  // Show error state if session not found after loading
  if (!sessionId || (!currentSession && !session) || (!currentClient && !client)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Session not found</h1>
          <button
            onClick={handleBack}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Calendar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">
              {existingSessionPlan ? 'Edit Session Plan' : 'Create Session Plan'}
            </h1>
            {/* Silent auto-save - no visible status */}
            <div className="text-xs text-gray-500 mt-1">
              {existingSessionPlan ? 'Edit Session Plan' : 'Create Session Plan'}
            </div>
          </div>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="max-w-5xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading session plan...</div>
            </div>
          ) : (
            <div>
              <div className="border-b border-gray-200 pb-4 mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      {getSessionDogName()} - Session Plan
                    </h2>
                    <p className="text-gray-600">
                      {currentClient?.firstName} {currentClient?.lastName} • {currentSession?.sessionType}
                    </p>
                  </div>

                  {/* Last Saved indicator - top right, hidden on mobile */}
                  <div className="hidden sm:block text-sm text-gray-500">
                    {autoSaveState.isSaving ? (
                      <span>Saving...</span>
                    ) : autoSaveState.lastSaved ? (
                      <span>
                        Last saved: {new Date(autoSaveState.lastSaved).toLocaleString()}
                      </span>
                    ) : autoSaveState.hasUnsavedChanges ? (
                      <span>Unsaved changes</span>
                    ) : (
                      <span>Ready to save</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Main Goals and Explanation - Hidden behind reveal button */}
                {hasMainGoals ? (
                  <div>
                    <button
                      onClick={() => setShowMainGoals(!showMainGoals)}
                      className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-between"
                    >
                      <span>Main Goals & Exp. of Behaviour</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMainGoals();
                          }}
                          className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
                          title="Remove main goals section"
                        >
                          Remove
                        </button>
                        <ChevronDown
                          size={16}
                          className={`transform transition-transform ${showMainGoals ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>

                  {showMainGoals && (
                    <div className="mt-4 space-y-6 border border-gray-200 p-4 rounded-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Main Goal 1
                        </label>
                        <textarea
                          value={formData.mainGoal1}
                          onChange={(e) => handleInputChange('mainGoal1', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-800 focus:border-amber-800 resize-none"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Main Goal 2
                        </label>
                        <textarea
                          value={formData.mainGoal2}
                          onChange={(e) => handleInputChange('mainGoal2', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-800 focus:border-amber-800 resize-none"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Main Goal 3
                        </label>
                        <textarea
                          value={formData.mainGoal3}
                          onChange={(e) => handleInputChange('mainGoal3', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-800 focus:border-amber-800 resize-none"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Main Goal 4
                        </label>
                        <textarea
                          value={formData.mainGoal4}
                          onChange={(e) => handleInputChange('mainGoal4', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-800 focus:border-amber-800 resize-none"
                          rows={2}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Explanation of Behaviour
                          </label>
                        </div>
                        <RichTextEditor
                          value={formData.explanationOfBehaviour}
                          onChange={(value) => {
                            handleInputChange('explanationOfBehaviour', value);
                          }}
                          placeholder="Describe the behaviour patterns, triggers, and context..."
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                  </div>
                ) : (
                  <div className="mb-6">
                    <button
                      onClick={addMainGoals}
                      className="w-full bg-amber-800 text-white px-4 py-3 rounded-md hover:bg-amber-700 transition-colors text-sm sm:text-base font-medium"
                    >
                      Add Main Goals & Exp. of Behaviour
                    </button>
                  </div>
                )}

                {/* Action Points Section */}
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Action Points ({selectedActionPoints.length})
                    </label>
                  </div>

                  {/* Selected Action Points - Collapsible List */}
                  <div className="space-y-2">
                    {selectedActionPoints.length > 0 ? (
                      selectedActionPoints.map((actionPointId, index) => {
                        // Check if we have an editable version, otherwise create one for library action points
                        if (!editableActionPoints[actionPointId] && !actionPointId.startsWith('blank-')) {
                          initializeEditableActionPoint(actionPointId);
                        }

                        const editableContent = editableActionPoints[actionPointId];
                        if (!editableContent) return null;

                        const isExpanded = expandedActionPoints.has(actionPointId);

                        // Get display title for the collapsed state
                        const getActionPointTitle = () => {
                          if (editableContent.header.trim()) {
                            // Strip HTML tags for display
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = editableContent.header;
                            return tempDiv.textContent || tempDiv.innerText || 'Action Point';
                          }

                          // For library action points, try to get original title
                          if (!actionPointId.startsWith('blank-')) {
                            const originalActionPoint = actionPoints.find(ap => ap.id === actionPointId);
                            if (originalActionPoint) {
                              const tempDiv = document.createElement('div');
                              tempDiv.innerHTML = originalActionPoint.header;
                              return tempDiv.textContent || tempDiv.innerText || 'Action Point';
                            }
                          }

                          return 'New Action Point';
                        };

                        return (
                          <div key={actionPointId} className="border border-gray-200 rounded-md">
                            {/* Collapsible Header */}
                            <button
                              onClick={() => toggleActionPointExpansion(actionPointId)}
                              className="w-full bg-gray-50 text-gray-700 px-4 py-3 rounded-t-md hover:bg-gray-100 transition-colors text-sm font-medium flex items-center justify-between"
                            >
                              <div className="flex items-center min-w-0 flex-1 mr-2 text-left">
                                <span className="text-xs text-gray-500 mr-2 flex-shrink-0">#{index + 1}</span>
                                <div className="relative flex-1 min-w-0">
                                  <span className="block text-left pr-8">{getActionPointTitle()}</span>
                                  {/* Fade effect overlay */}
                                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none"></div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                {/* Move Up Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveActionPoint(actionPointId, 'up');
                                  }}
                                  disabled={index === 0}
                                  className={`p-1 rounded ${
                                    index === 0
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                  }`}
                                  title="Move up"
                                >
                                  <ChevronUp size={14} />
                                </button>

                                {/* Move Down Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveActionPoint(actionPointId, 'down');
                                  }}
                                  disabled={index === selectedActionPoints.length - 1}
                                  className={`p-1 rounded ${
                                    index === selectedActionPoints.length - 1
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                  }`}
                                  title="Move down"
                                >
                                  <ChevronDown size={14} />
                                </button>

                                {/* Remove Button - Red X */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleActionPointToggle(actionPointId);
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                                  title="Remove action point"
                                >
                                  <X size={14} />
                                </button>

                                {/* Expand/Collapse Icon */}
                                <ChevronDown
                                  size={16}
                                  className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </div>
                            </button>

                            {/* Expandable Content */}
                            {isExpanded && (
                              <div className="border-t border-gray-200 p-4 bg-white rounded-b-md">
                                {/* Editable Header */}
                                <div className="mb-4">
                                  <label className="block text-xs font-medium text-gray-600 mb-2">
                                    Header
                                  </label>
                                  <RichTextEditor
                                    value={editableContent.header}
                                    onChange={(value) => updateEditableActionPoint(actionPointId, 'header', value)}
                                    placeholder="Action point header"
                                    className="w-full text-sm"
                                  />
                                </div>

                                {/* Editable Details */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-2">
                                    Details
                                  </label>
                                  <RichTextEditor
                                    value={editableContent.details}
                                    onChange={(value) => updateEditableActionPoint(actionPointId, 'details', value)}
                                    placeholder="Action point details"
                                    className="w-full text-sm"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : null}
                  </div>

                  {/* Dog Club Guides Section */}
                  {selectedDogClubGuides.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        Selected Dog Club Guides ({selectedDogClubGuides.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedDogClubGuides.map((guideId) => {
                          const guide = DOG_CLUB_GUIDES.find(g => g.id === guideId);
                          if (!guide) return null;

                          return (
                            <div
                              key={guideId}
                              className="border border-gray-200 rounded-md p-3 bg-gray-50"
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-900">
                                  {guide.title}
                                </h4>
                                <button
                                  onClick={() => handleDogClubGuideToggle(guideId)}
                                  className="ml-3 text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 flex-shrink-0"
                                  title="Remove guide"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Point Buttons - Below the list */}
                  <div className="mt-4 space-y-3">
                    <button
                      onClick={() => setShowActionPointsModal(true)}
                      className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                    >
                      Show Action Point Library
                    </button>
                    <button
                      onClick={() => setShowDogClubGuidesModal(true)}
                      className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                    >
                      Add Dog Club Guides
                    </button>
                    <button
                      onClick={addBlankActionPoint}
                      className="w-full bg-amber-800 text-white py-3 px-4 rounded-lg font-medium hover:bg-amber-700 transition-colors"
                    >
                      Add Blank Action Point
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 space-y-3">

                  <button
                    onClick={handleSave}
                    disabled={isLoading || (!currentSession && !currentClient)}
                    className="w-full bg-amber-800 text-white py-3 px-4 rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Loading...' : 'Save & Go Back'}
                  </button>

                  <button
                    onClick={handlePreviewAndEdit}
                    className="w-full bg-white text-amber-800 py-3 px-4 rounded-lg font-medium border border-amber-800 hover:bg-amber-800/10 transition-colors"
                  >
                    Preview & Generate PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Point Library Modal */}
      <ActionPointLibraryModal
        isOpen={showActionPointsModal}
        onClose={() => setShowActionPointsModal(false)}
        actionPoints={actionPoints}
        selectedActionPoints={selectedActionPoints}
        onActionPointToggle={handleActionPointToggle}
        personalizeActionPoint={personalizeActionPoint}
        getSessionDogName={getSessionDogName}
        getDogGender={getDogGender}
        previouslyUsedIds={previouslyUsedActionPointIds}
      />

      {/* Dog Club Guides Modal */}
      <DogClubGuidesModal
        isOpen={showDogClubGuidesModal}
        onClose={() => setShowDogClubGuidesModal(false)}
        selectedGuides={selectedDogClubGuides}
        onGuideToggle={handleDogClubGuideToggle}
      />
    </div>
  );
}

export default function SessionPlanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <SessionPlanContent />
    </Suspense>
  );
}