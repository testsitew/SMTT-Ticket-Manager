import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://rhsbelnoeqomyukfhsrj.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_hp3imdFpQ3Z4ww03jv0qtA_8ZS5AQXW';

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
