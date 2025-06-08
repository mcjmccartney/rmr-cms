'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppAction, Session, Client } from '@/types';
import { mockSessions, mockClients, mockFinances } from '@/data/mockData';

const initialState: AppState = {
  sessions: mockSessions,
  clients: mockClients,
  finances: mockFinances,
  selectedSession: null,
  selectedClient: null,
  isModalOpen: false,
  modalType: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    
    case 'ADD_SESSION':
      return { ...state, sessions: [...state.sessions, action.payload] };
    
    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map(session =>
          session.id === action.payload.id ? action.payload : session
        ),
      };
    
    case 'DELETE_SESSION':
      return {
        ...state,
        sessions: state.sessions.filter(session => session.id !== action.payload),
        selectedSession: state.selectedSession?.id === action.payload ? null : state.selectedSession,
      };
    
    case 'SET_CLIENTS':
      return { ...state, clients: action.payload };
    
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, action.payload] };
    
    case 'UPDATE_CLIENT':
      return {
        ...state,
        clients: state.clients.map(client =>
          client.id === action.payload.id ? action.payload : client
        ),
      };
    
    case 'DELETE_CLIENT':
      return {
        ...state,
        clients: state.clients.filter(client => client.id !== action.payload),
        selectedClient: state.selectedClient?.id === action.payload ? null : state.selectedClient,
      };
    
    case 'SET_SELECTED_SESSION':
      return { ...state, selectedSession: action.payload };
    
    case 'SET_SELECTED_CLIENT':
      return { ...state, selectedClient: action.payload };
    
    case 'SET_MODAL_OPEN':
      return { ...state, isModalOpen: action.payload };
    
    case 'SET_MODAL_TYPE':
      return { ...state, modalType: action.payload };
    
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
