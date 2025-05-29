// Direct HTTP client for Supabase REST API
// This bypasses the package installation issues and connects directly to your database

interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

class SupabaseHttpClient {
  private config: SupabaseConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    };
    this.baseUrl = `${this.config.url}/rest/v1`;

    // Debug logging
    console.log('🔧 Supabase HTTP Client initialized');
    console.log('📍 URL:', this.config.url ? 'configured' : 'missing');
    console.log('🔑 Anon Key:', this.config.anonKey ? 'configured' : 'missing');
    console.log('🔐 Service Key:', this.config.serviceRoleKey ? 'configured' : 'missing');
    console.log('🌐 Base URL:', this.baseUrl);
    console.log('🔍 Service Key Value:', this.config.serviceRoleKey ? this.config.serviceRoleKey.substring(0, 20) + '...' : 'undefined');
  }

  private getHeaders(useServiceRole = false) {
    const key = useServiceRole ? this.config.serviceRoleKey : this.config.anonKey;
    return {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    };
  }

  private async request(endpoint: string, options: RequestInit = {}, useServiceRole = true) {
    if (!this.config.url || !this.config.anonKey) {
      console.warn('Supabase not configured, using mock data');
      return { data: [], error: null };
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(useServiceRole),
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Supabase request error:', error);
      return { data: null, error };
    }
  }

  // Client operations
  async getClients() {
    console.log('🔍 Fetching clients from Supabase...');
    return this.request('/clients?select=*');
  }

  async addClient(client: any) {
    console.log('➕ Adding client to Supabase...');
    return this.request('/clients?select=*', {
      method: 'POST',
      body: JSON.stringify(client),
      headers: {
        'Prefer': 'return=representation'
      }
    });
  }

  async updateClient(id: string, updates: any) {
    console.log('✏️ Updating client in Supabase...');
    return this.request(`/clients?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteClient(id: string) {
    console.log('🗑️ Deleting client from Supabase...');
    return this.request(`/clients?id=eq.${id}`, {
      method: 'DELETE',
    });
  }

  // Session operations
  async getSessions() {
    console.log('🔍 Fetching sessions from Supabase...');
    return this.request('/sessions?select=*');
  }

  async addSession(session: any) {
    console.log('➕ Adding session to Supabase...');
    return this.request('/sessions?select=*', {
      method: 'POST',
      body: JSON.stringify(session),
      headers: {
        'Prefer': 'return=representation'
      }
    });
  }

  async updateSession(id: string, updates: any) {
    console.log('✏️ Updating session in Supabase...');
    return this.request(`/sessions?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteSession(id: string) {
    console.log('🗑️ Deleting session from Supabase...');
    return this.request(`/sessions?id=eq.${id}`, {
      method: 'DELETE',
    });
  }

  // Behavioural brief operations
  async getBehaviouralBrief(id: string) {
    console.log('🔍 Fetching behavioural brief from Supabase...');
    return this.request(`/behavioural_briefs?id=eq.${id}`);
  }

  // Behaviour questionnaire operations
  async getBehaviourQuestionnaire(id: string) {
    console.log('🔍 Fetching behaviour questionnaire from Supabase...');
    return this.request(`/behaviour_questionnaires?id=eq.${id}`);
  }

  // Auth operations (simplified)
  async signInWithPassword(email: string, password: string) {
    if (!this.config.url || !this.config.anonKey) {
      // Mock authentication
      if (password === 'password123') {
        const mockUser = {
          id: 'mock-user-' + Date.now(),
          email: email,
          user_metadata: { email: email },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        };
        return { data: { user: mockUser }, error: null };
      }
      return { data: { user: null }, error: { message: 'Invalid credentials' } };
    }

    try {
      const response = await fetch(`${this.config.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.anonKey,
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { data: { user: null }, error: data };
      }

      return { data: { user: data.user }, error: null };
    } catch (error) {
      return { data: { user: null }, error };
    }
  }

  async signOut() {
    console.log('👋 Signing out...');
    // For now, just resolve successfully
    return { error: null };
  }

  // Check if Supabase is configured
  isConfigured() {
    return !!(this.config.url && this.config.anonKey);
  }
}

// Export singleton instance
export const supabaseHttpClient = new SupabaseHttpClient();

// Export for convenience
export default supabaseHttpClient;
