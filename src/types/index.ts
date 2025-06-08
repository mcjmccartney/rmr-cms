export interface Session {
  id: string;
  ownerName: string;
  dogName: string;
  bookingDate: Date;
  sessionType: 'In-Person' | 'Online' | 'Training' | 'Group';
  quote: number;
  paid: boolean;
  behaviourPlanSent: boolean;
}

export interface Client {
  id: string;
  ownerName: string;
  dogName: string;
  active: boolean;
  avatar?: string;
}

export interface MonthlyFinance {
  month: string;
  year: number;
  expected: number;
  actual: number;
  variance: number;
}

export interface AppState {
  sessions: Session[];
  clients: Client[];
  finances: MonthlyFinance[];
  selectedSession: Session | null;
  selectedClient: Client | null;
  isModalOpen: boolean;
  modalType: 'session' | 'client' | null;
}

export type AppAction =
  | { type: 'SET_SESSIONS'; payload: Session[] }
  | { type: 'ADD_SESSION'; payload: Session }
  | { type: 'UPDATE_SESSION'; payload: Session }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'SET_CLIENTS'; payload: Client[] }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'DELETE_CLIENT'; payload: string }
  | { type: 'SET_SELECTED_SESSION'; payload: Session | null }
  | { type: 'SET_SELECTED_CLIENT'; payload: Client | null }
  | { type: 'SET_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_MODAL_TYPE'; payload: 'session' | 'client' | null };
