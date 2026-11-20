import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'COLLE_TON_PROJECT_URL_ICI';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'COLLE_TA_CLE_ANON_PUBLIC_ICI';

export const isSupabaseConfigured =
  typeof supabaseUrl === 'string' &&
  typeof supabaseAnonKey === 'string' &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('COLLE_TON_PROJECT_URL_ICI') &&
  !supabaseAnonKey.includes('COLLE_TA_CLE_ANON_PUBLIC_ICI');

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
