'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabaseHttpClient } from '@/lib/supabaseHttpClient';

// Types for auth
interface User {
  id: string;
  email: string;
  user_metadata?: any;
  app_metadata?: any;
  aud?: string;
  created_at?: string;
}

interface Session {
  user: User;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    console.log('🔐 Auth context initializing...');

    // Check if there's a stored session in localStorage
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        console.log('🔐 Found stored user:', user);
        setUser(user);
        setSession({ user });
      } catch (error) {
        console.error('🔐 Error parsing stored user:', error);
        localStorage.removeItem('auth_user');
      }
    } else {
      console.log('🔐 No stored user found');
    }

    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting sign in with:', email);
      const { data, error } = await supabaseHttpClient.signInWithPassword(email, password);

      if (error) {
        console.log('🔐 Sign in error:', error);
        return { user: null, error };
      }

      if (data.user) {
        console.log('🔐 Sign in successful, storing user:', data.user);
        setUser(data.user);
        setSession({ user: data.user });
        // Store user in localStorage for persistence
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.log('🔐 Sign in exception:', error);
      return { user: null, error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🔐 Signing out...');
      await supabaseHttpClient.signOut();
      setUser(null);
      setSession(null);
      // Clear stored user from localStorage
      localStorage.removeItem('auth_user');
      console.log('🔐 Sign out complete');
    } catch (error) {
      console.error('🔐 Error signing out:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
