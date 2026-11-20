import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://rhsbelnoeqomyukfhsrj.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoc2JlbG5vZXFvbXl1a2Zoc3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MjQyODEsImV4cCI6MjExMDQwMDI4MX0.0fbIwzse0ab9uleBIh7zhMPVcsWhvFbp8F2C9pQYK4U';

export const isSupabaseConfigured =
  typeof supabaseUrl === 'string' &&
  typeof supabaseAnonKey === 'string' &&
  supabaseUrl.startsWith('http');

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const createSecondarySupabaseClient = () => {
  if (!isSupabaseConfigured) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

export { supabaseUrl, supabaseAnonKey };
