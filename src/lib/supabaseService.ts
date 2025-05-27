import { createSupabaseBrowserClient, isSupabaseConfigured, type Database } from './supabase';
import { Client, Session, BehaviouralBrief, BehaviourQuestionnaire, Address } from '@/types';
import { formatPhoneNumber } from './utils';
import { format } from 'date-fns';

// Get Supabase client
const getSupabaseClient = () => {
  const client = createSupabaseBrowserClient();
  if (!client) {
    throw new Error('Supabase is not configured');
  }
  return client;
};

// Helper function to convert database row to Client type
const dbRowToClient = (row: Database['public']['Tables']['clients']['Row']): Client => ({
  id: row.id,
  ownerFirstName: row.owner_first_name,
  ownerLastName: row.owner_last_name,
  contactEmail: row.contact_email,
  contactNumber: row.contact_number,
  postcode: row.postcode,
  fullAddress: row.full_address || undefined,
  dogName: row.dog_name || undefined,
  isMember: row.is_member,
  isActive: row.is_active,
  submissionDate: row.submission_date,
  createdAt: row.created_at,
  lastSession: row.last_session,
  nextSession: row.next_session,
  behaviouralBriefId: row.behavioural_brief_id || undefined,
  behaviourQuestionnaireId: row.behaviour_questionnaire_id || undefined,
  address: row.address as Address || undefined,
  howHeardAboutServices: row.how_heard_about_services || undefined,
});

// Helper function to convert Client to database insert format
const clientToDbInsert = (client: Omit<Client, 'id' | 'createdAt'>): Database['public']['Tables']['clients']['Insert'] => ({
  owner_first_name: client.ownerFirstName,
  owner_last_name: client.ownerLastName,
  contact_email: client.contactEmail,
  contact_number: formatPhoneNumber(client.contactNumber),
  postcode: client.postcode,
  full_address: client.fullAddress,
  dog_name: client.dogName,
  is_member: client.isMember || false,
  is_active: client.isActive !== undefined ? client.isActive : true,
  submission_date: client.submissionDate || format(new Date(), "yyyy-MM-dd HH:mm:ss"),
  last_session: client.lastSession || 'N/A',
  next_session: client.nextSession || 'Not Scheduled',
  behavioural_brief_id: client.behaviouralBriefId,
  behaviour_questionnaire_id: client.behaviourQuestionnaireId,
  address: client.address as any,
  how_heard_about_services: client.howHeardAboutServices,
});

// Helper function to convert database row to Session type
const dbRowToSession = (row: Database['public']['Tables']['sessions']['Row']): Session => ({
  id: row.id,
  clientId: row.client_id,
  clientName: row.client_name,
  dogName: row.dog_name || undefined,
  date: row.date,
  time: row.time,
  sessionType: row.session_type,
  amount: row.amount || undefined,
  createdAt: row.created_at,
});

// Client operations
export const getClients = async (): Promise<Client[]> => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Returning empty array.');
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }

    return data?.map(dbRowToClient) || [];
  } catch (error) {
    console.error('Error in getClients:', error);
    return [];
  }
};

export const getClientById = async (clientId: string): Promise<Client | null> => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Returning null.');
    return null;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      console.error('Error fetching client:', error);
      return null;
    }

    return data ? dbRowToClient(data) : null;
  } catch (error) {
    console.error('Error in getClientById:', error);
    return null;
  }
};

export const addClientToFirestore = async (
  clientData: Omit<Client, 'id' | 'behaviouralBriefId' | 'behaviourQuestionnaireId' | 'createdAt' | 'address' | 'howHeardAboutServices' | 'lastSession' | 'nextSession'> & {
    dogName?: string;
    isMember?: boolean;
    isActive?: boolean;
    submissionDate?: string;
    fullAddress?: string;
  }
): Promise<Client> => {
  if (!isSupabaseConfigured) {
    // Fallback to mock implementation
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const newClient: Client = {
      ...clientData,
      id: 'mock-client-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      contactNumber: formatPhoneNumber(clientData.contactNumber),
      isMember: clientData.isMember || false,
      isActive: clientData.isActive === undefined ? true : clientData.isActive,
      submissionDate: clientData.submissionDate || format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      createdAt: new Date().toISOString(),
      lastSession: 'N/A',
      nextSession: 'Not Scheduled',
    };
    
    return newClient;
  }

  try {
    const supabase = getSupabaseClient();
    const insertData = clientToDbInsert(clientData as any);
    
    const { data, error } = await supabase
      .from('clients')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error adding client:', error);
      throw error;
    }

    return dbRowToClient(data);
  } catch (error) {
    console.error('Error in addClientToFirestore:', error);
    throw error;
  }
};

export const updateClientInFirestore = async (
  clientId: string,
  clientData: Partial<Omit<Client, 'id' | 'createdAt'>>
): Promise<void> => {
  if (!isSupabaseConfigured) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("Mock: Updated client", clientId, "with data:", clientData);
    return;
  }

  try {
    const supabase = getSupabaseClient();
    
    // Convert client data to database format
    const updateData: Database['public']['Tables']['clients']['Update'] = {};
    
    if (clientData.ownerFirstName !== undefined) updateData.owner_first_name = clientData.ownerFirstName;
    if (clientData.ownerLastName !== undefined) updateData.owner_last_name = clientData.ownerLastName;
    if (clientData.contactEmail !== undefined) updateData.contact_email = clientData.contactEmail;
    if (clientData.contactNumber !== undefined) updateData.contact_number = formatPhoneNumber(clientData.contactNumber);
    if (clientData.postcode !== undefined) updateData.postcode = clientData.postcode;
    if (clientData.fullAddress !== undefined) updateData.full_address = clientData.fullAddress;
    if (clientData.dogName !== undefined) updateData.dog_name = clientData.dogName;
    if (clientData.isMember !== undefined) updateData.is_member = clientData.isMember;
    if (clientData.isActive !== undefined) updateData.is_active = clientData.isActive;
    if (clientData.address !== undefined) updateData.address = clientData.address as any;
    if (clientData.howHeardAboutServices !== undefined) updateData.how_heard_about_services = clientData.howHeardAboutServices;

    const { error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId);

    if (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateClientInFirestore:', error);
    throw error;
  }
};

export const deleteClientFromFirestore = async (clientId: string): Promise<void> => {
  if (!isSupabaseConfigured) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("Mock: Deleted client", clientId);
    return;
  }

  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteClientFromFirestore:', error);
    throw error;
  }
};

// Session operations
export const getSessionsFromFirestore = async (): Promise<Session[]> => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Returning empty array.');
    return [];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }

    return data?.map(dbRowToSession) || [];
  } catch (error) {
    console.error('Error in getSessionsFromFirestore:', error);
    return [];
  }
};

export const addSessionToFirestore = async (
  sessionData: Omit<Session, 'id' | 'createdAt'>
): Promise<Session> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot add session.');
  }

  try {
    const supabase = getSupabaseClient();
    
    const insertData: Database['public']['Tables']['sessions']['Insert'] = {
      client_id: sessionData.clientId,
      client_name: sessionData.clientName,
      dog_name: sessionData.dogName,
      date: sessionData.date,
      time: sessionData.time,
      session_type: sessionData.sessionType,
      amount: sessionData.amount,
    };

    const { data, error } = await supabase
      .from('sessions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error adding session:', error);
      throw error;
    }

    return dbRowToSession(data);
  } catch (error) {
    console.error('Error in addSessionToFirestore:', error);
    throw error;
  }
};

export const updateSessionInFirestore = async (
  sessionId: string,
  sessionData: Partial<Omit<Session, 'id' | 'createdAt' | 'clientName' | 'dogName'>>
): Promise<void> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot update session.');
  }

  try {
    const supabase = getSupabaseClient();
    
    const updateData: Database['public']['Tables']['sessions']['Update'] = {};
    
    if (sessionData.clientId !== undefined) updateData.client_id = sessionData.clientId;
    if (sessionData.date !== undefined) updateData.date = sessionData.date;
    if (sessionData.time !== undefined) updateData.time = sessionData.time;
    if (sessionData.sessionType !== undefined) updateData.session_type = sessionData.sessionType;
    if (sessionData.amount !== undefined) updateData.amount = sessionData.amount;

    const { error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateSessionInFirestore:', error);
    throw error;
  }
};

export const deleteSessionFromFirestore = async (sessionId: string): Promise<void> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Cannot delete session.');
  }

  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteSessionFromFirestore:', error);
    throw error;
  }
};

// Placeholder functions for behavioural briefs and questionnaires
export const getBehaviouralBriefByBriefId = async (briefId: string): Promise<BehaviouralBrief | null> => {
  console.warn('getBehaviouralBriefByBriefId not yet implemented for Supabase');
  return null;
};

export const getBehaviourQuestionnaireById = async (questionnaireId: string): Promise<BehaviourQuestionnaire | null> => {
  console.warn('getBehaviourQuestionnaireById not yet implemented for Supabase');
  return null;
};

// Export type for compatibility
export type EditableClientData = Partial<Omit<Client, 'id' | 'createdAt'>>;
