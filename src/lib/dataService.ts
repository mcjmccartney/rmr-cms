// Data service that uses Supabase HTTP client
import { supabaseHttpClient } from './supabaseHttpClient';

// Types (these should match your database schema)
export interface Client {
  id: string;
  ownerFirstName: string;
  ownerLastName: string;
  contactEmail: string;
  contactNumber: string;
  postcode: string;
  fullAddress?: string;
  dogName?: string;
  isMember?: boolean;
  isActive?: boolean;
  submissionDate?: string;
  behaviouralBriefId?: string;
  behaviourQuestionnaireId?: string;
  created_at?: string;
  updated_at?: string;
}

// Database types (snake_case)
interface DbClient {
  id: string;
  owner_first_name: string;
  owner_last_name: string;
  contact_email: string;
  contact_number: string;
  postcode: string;
  full_address?: string;
  dog_name?: string;
  is_member?: boolean;
  is_active?: boolean;
  submission_date?: string;
  behavioural_brief_id?: string;
  behaviour_questionnaire_id?: string;
  created_at?: string;
}

export interface Session {
  id: string;
  clientId: string;
  clientName?: string;
  dogName?: string;
  date: string;
  time?: string;
  sessionType: string;
  amount?: number;
  created_at?: string;
}

// Database types (snake_case)
interface DbSession {
  id: string;
  client_id: string;
  client_name?: string;
  dog_name?: string;
  date: string;
  time?: string;
  session_type: string;
  amount?: number;
  created_at?: string;
}

export interface BehaviouralBrief {
  id: string;
  clientId: string;
  content: any;
  created_at?: string;
  updated_at?: string;
}

export interface BehaviourQuestionnaire {
  id: string;
  clientId: string;
  content: any;
  created_at?: string;
  updated_at?: string;
}

// Conversion functions
function dbClientToClient(dbClient: DbClient): Client {
  return {
    id: dbClient.id,
    ownerFirstName: dbClient.owner_first_name,
    ownerLastName: dbClient.owner_last_name,
    contactEmail: dbClient.contact_email,
    contactNumber: dbClient.contact_number,
    postcode: dbClient.postcode,
    fullAddress: dbClient.full_address,
    dogName: dbClient.dog_name,
    isMember: dbClient.is_member,
    isActive: dbClient.is_active,
    submissionDate: dbClient.submission_date,
    behaviouralBriefId: dbClient.behavioural_brief_id,
    behaviourQuestionnaireId: dbClient.behaviour_questionnaire_id,
    created_at: dbClient.created_at,
  };
}

function clientToDbClient(client: Omit<Client, 'id' | 'created_at'>): Omit<DbClient, 'id' | 'created_at'> {
  return {
    owner_first_name: client.ownerFirstName,
    owner_last_name: client.ownerLastName,
    contact_email: client.contactEmail,
    contact_number: client.contactNumber,
    postcode: client.postcode,
    full_address: client.fullAddress,
    dog_name: client.dogName,
    is_member: client.isMember,
    is_active: client.isActive,
    submission_date: client.submissionDate,
    behavioural_brief_id: client.behaviouralBriefId,
    behaviour_questionnaire_id: client.behaviourQuestionnaireId,
  };
}

function dbSessionToSession(dbSession: DbSession): Session {
  return {
    id: dbSession.id,
    clientId: dbSession.client_id,
    clientName: dbSession.client_name,
    dogName: dbSession.dog_name,
    date: dbSession.date,
    time: dbSession.time,
    sessionType: dbSession.session_type,
    amount: dbSession.amount,
    created_at: dbSession.created_at,
  };
}

function sessionToDbSession(session: Omit<Session, 'id' | 'created_at'>): Omit<DbSession, 'id' | 'created_at'> {
  return {
    client_id: session.clientId,
    client_name: session.clientName,
    dog_name: session.dogName,
    date: session.date,
    time: session.time,
    session_type: session.sessionType,
    amount: session.amount,
  };
}

// Client operations
export async function getClients(): Promise<Client[]> {
  console.log('📞 getClients() called - using API route');
  try {
    const response = await fetch('/api/clients');
    console.log('📡 API response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📊 Raw data from API:', result);

    if (result.error) {
      console.error('API Error:', result.error);
      return [];
    }

    const data = result.data;
    if (!data || !Array.isArray(data)) {
      console.log('⚠️ No data or not an array:', data);
      return [];
    }

    console.log(`✅ Found ${data.length} clients, converting...`);
    const convertedClients = data.map((dbClient: DbClient) => dbClientToClient(dbClient));
    console.log('🔄 Converted clients:', convertedClients);
    return convertedClients;
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
}

export async function addClient(client: Omit<Client, 'id' | 'created_at'>): Promise<Client | null> {
  try {
    const dbClient = clientToDbClient(client);
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dbClient),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.error) {
      console.error('API Error:', result.error);
      return null;
    }

    const data = result.data;
    if (!data || !Array.isArray(data) || data.length === 0) {
      return null;
    }
    return dbClientToClient(data[0]);
  } catch (error) {
    console.error('Error adding client:', error);
    return null;
  }
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<boolean> {
  try {
    // Convert camelCase updates to snake_case
    const dbUpdates: Partial<DbClient> = {};
    if (updates.ownerFirstName !== undefined) dbUpdates.owner_first_name = updates.ownerFirstName;
    if (updates.ownerLastName !== undefined) dbUpdates.owner_last_name = updates.ownerLastName;
    if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
    if (updates.contactNumber !== undefined) dbUpdates.contact_number = updates.contactNumber;
    if (updates.postcode !== undefined) dbUpdates.postcode = updates.postcode;
    if (updates.fullAddress !== undefined) dbUpdates.full_address = updates.fullAddress;
    if (updates.dogName !== undefined) dbUpdates.dog_name = updates.dogName;
    if (updates.isMember !== undefined) dbUpdates.is_member = updates.isMember;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.submissionDate !== undefined) dbUpdates.submission_date = updates.submissionDate;
    if (updates.behaviouralBriefId !== undefined) dbUpdates.behavioural_brief_id = updates.behaviouralBriefId;
    if (updates.behaviourQuestionnaireId !== undefined) dbUpdates.behaviour_questionnaire_id = updates.behaviourQuestionnaireId;

    const { error } = await supabaseHttpClient.updateClient(id, dbUpdates);
    if (error) {
      console.error('Error updating client:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error updating client:', error);
    return false;
  }
}

export async function deleteClient(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseHttpClient.deleteClient(id);
    if (error) {
      console.error('Error deleting client:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error deleting client:', error);
    return false;
  }
}

// Session operations
export async function getSessions(): Promise<Session[]> {
  console.log('📞 getSessions() called - using API route');
  try {
    const response = await fetch('/api/sessions');
    console.log('📡 Sessions API response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📊 Raw sessions data from API:', result);

    if (result.error) {
      console.error('Sessions API Error:', result.error);
      return [];
    }

    const data = result.data;
    if (!data || !Array.isArray(data)) {
      console.log('⚠️ No sessions data or not an array:', data);
      return [];
    }

    console.log(`✅ Found ${data.length} sessions, converting...`);
    const convertedSessions = data.map((dbSession: DbSession) => dbSessionToSession(dbSession));
    console.log('🔄 Converted sessions:', convertedSessions);
    return convertedSessions;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

export async function addSession(session: Omit<Session, 'id' | 'created_at'>): Promise<Session | null> {
  console.log('📞 addSession() called - using API route');
  console.log('📊 Session data to add:', session);
  try {
    const dbSession = sessionToDbSession(session);
    console.log('🔄 Converted to DB format:', dbSession);

    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dbSession),
    });

    console.log('📡 Sessions API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Sessions API Error:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📊 Raw session data from API:', result);

    if (result.error) {
      console.error('Sessions API Error:', result.error);
      return null;
    }

    const data = result.data;
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('⚠️ No session data returned:', data);
      return null;
    }

    const convertedSession = dbSessionToSession(data[0]);
    console.log('✅ Session added successfully:', convertedSession);
    return convertedSession;
  } catch (error) {
    console.error('Error adding session:', error);
    return null;
  }
}

export async function updateSession(id: string, updates: Partial<Session>): Promise<boolean> {
  try {
    // Convert camelCase updates to snake_case
    const dbUpdates: Partial<DbSession> = {};
    if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
    if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
    if (updates.dogName !== undefined) dbUpdates.dog_name = updates.dogName;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.sessionType !== undefined) dbUpdates.session_type = updates.sessionType;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;

    const { error } = await supabaseHttpClient.updateSession(id, dbUpdates);
    if (error) {
      console.error('Error updating session:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error updating session:', error);
    return false;
  }
}

export async function deleteSession(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseHttpClient.deleteSession(id);
    if (error) {
      console.error('Error deleting session:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

// Behavioural brief operations
export async function getBehaviouralBrief(id: string): Promise<BehaviouralBrief | null> {
  try {
    const { data, error } = await supabaseHttpClient.getBehaviouralBrief(id);
    if (error) {
      console.error('Error fetching behavioural brief:', error);
      return null;
    }
    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching behavioural brief:', error);
    return null;
  }
}

// Behaviour questionnaire operations
export async function getBehaviourQuestionnaire(id: string): Promise<BehaviourQuestionnaire | null> {
  try {
    const { data, error } = await supabaseHttpClient.getBehaviourQuestionnaire(id);
    if (error) {
      console.error('Error fetching behaviour questionnaire:', error);
      return null;
    }
    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching behaviour questionnaire:', error);
    return null;
  }
}

// Helper function to get client by ID
export async function getClientById(id: string): Promise<Client | null> {
  try {
    const clients = await getClients();
    return clients.find(client => client.id === id) || null;
  } catch (error) {
    console.error('Error fetching client by ID:', error);
    return null;
  }
}

// Types for form values
export interface BehaviouralBriefFormValues {
  ownerFirstName: string;
  ownerLastName: string;
  contactEmail: string;
  contactNumber: string;
  postcode: string;
  fullAddress?: string;
  dogName?: string;
  [key: string]: any; // For additional form fields
}

export interface BehaviourQuestionnaireFormValues {
  ownerFirstName: string;
  ownerLastName: string;
  contactEmail: string;
  contactNumber: string;
  postcode: string;
  fullAddress?: string;
  dogName?: string;
  [key: string]: any; // For additional form fields
}

// Functions for form submissions
export async function addClientAndBriefToFirestore(formData: BehaviouralBriefFormValues): Promise<{ clientId: string; briefId: string }> {
  try {
    // Create client from form data
    const clientData: Omit<Client, 'id' | 'created_at'> = {
      ownerFirstName: formData.ownerFirstName,
      ownerLastName: formData.ownerLastName,
      contactEmail: formData.contactEmail,
      contactNumber: formData.contactNumber,
      postcode: formData.postcode,
      fullAddress: formData.fullAddress,
      dogName: formData.dogName,
      isMember: false,
      isActive: true,
      submissionDate: new Date().toISOString(),
    };

    // Add client
    const newClient = await addClient(clientData);
    if (!newClient) {
      throw new Error('Failed to create client');
    }

    // Create behavioural brief
    const briefData: Omit<BehaviouralBrief, 'id' | 'created_at'> = {
      clientId: newClient.id,
      content: formData,
    };

    const { data: briefResult, error } = await supabaseHttpClient.addBehaviouralBrief(briefData);
    if (error || !briefResult?.[0]) {
      throw new Error('Failed to create behavioural brief');
    }

    // Update client with brief ID
    await updateClient(newClient.id, { behaviouralBriefId: briefResult[0].id });

    return {
      clientId: newClient.id,
      briefId: briefResult[0].id,
    };
  } catch (error) {
    console.error('Error adding client and brief:', error);
    throw error;
  }
}

export async function addClientAndBehaviourQuestionnaireToFirestore(formData: BehaviourQuestionnaireFormValues): Promise<{ clientId: string; questionnaireId: string }> {
  try {
    // Create client from form data
    const clientData: Omit<Client, 'id' | 'created_at'> = {
      ownerFirstName: formData.ownerFirstName,
      ownerLastName: formData.ownerLastName,
      contactEmail: formData.contactEmail,
      contactNumber: formData.contactNumber,
      postcode: formData.postcode,
      fullAddress: formData.fullAddress,
      dogName: formData.dogName,
      isMember: false,
      isActive: true,
      submissionDate: new Date().toISOString(),
    };

    // Add client
    const newClient = await addClient(clientData);
    if (!newClient) {
      throw new Error('Failed to create client');
    }

    // Create behaviour questionnaire
    const questionnaireData: Omit<BehaviourQuestionnaire, 'id' | 'created_at'> = {
      clientId: newClient.id,
      content: formData,
    };

    const { data: questionnaireResult, error } = await supabaseHttpClient.addBehaviourQuestionnaire(questionnaireData);
    if (error || !questionnaireResult?.[0]) {
      throw new Error('Failed to create behaviour questionnaire');
    }

    // Update client with questionnaire ID
    await updateClient(newClient.id, { behaviourQuestionnaireId: questionnaireResult[0].id });

    return {
      clientId: newClient.id,
      questionnaireId: questionnaireResult[0].id,
    };
  } catch (error) {
    console.error('Error adding client and questionnaire:', error);
    throw error;
  }
}

// Authentication functions (mock for now)
export async function signInUser(email: string, password: string): Promise<{ user: any; error: any }> {
  // Mock authentication - accept any email with password123
  if (password === 'password123') {
    return {
      user: { email, uid: 'mock-user-id' },
      error: null,
    };
  }
  return {
    user: null,
    error: { message: 'Invalid credentials' },
  };
}

export async function signOutUser(): Promise<void> {
  // Mock sign out
  console.log('User signed out');
}

export function onAuthStateChanged(callback: (user: any) => void): () => void {
  // Mock auth state change
  // For now, just call with null user
  setTimeout(() => callback(null), 100);
  return () => {}; // Unsubscribe function
}

// Export for backward compatibility
export const getSessionsFromFirestore = getSessions;
export const addSessionToFirestore = addSession;
export const updateSessionInFirestore = updateSession;
export const deleteSessionFromFirestore = deleteSession;
export const addClientToFirestore = addClient;
export const updateClientInFirestore = updateClient;
export const deleteClientFromFirestore = deleteClient;
export const getBehaviouralBriefByBriefId = getBehaviouralBrief;
export const getBehaviourQuestionnaireById = getBehaviourQuestionnaire;
